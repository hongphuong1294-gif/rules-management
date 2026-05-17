import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a document layout analysis and rule extraction AI. You have two capabilities:

1. **Layout Analysis** (for PDF/image documents): Analyze the document and return a structured list of sections and elements. Each section should have:
   - section_id: unique identifier
   - section_name: human-readable name
   - section_type: one of "header", "table", "text_block", "footer", "signature_block", "form_field", "chart", "summary"
   - elements: array of elements within the section, each with:
     - element_id: unique identifier
     - element_name: name of the element
     - element_type: one of "field", "column", "row", "label", "value", "total", "subtotal", "date", "amount", "text"
     - description: what this element represents
     - bounding_box: approximate location as {x, y, width, height} in percentages (0-100)

2. **Rule Extraction** (for Excel/CSV/Word rule files): Parse sample rules and map them to document sections/elements. Return:
   - rules: array of extracted rules, each with:
     - rule_code: identifier
     - name: rule name
     - description: what the rule validates
     - type: one of "threshold", "calculation", "cross_table", "data_presence", "pattern_match", "custom"
     - category: rule category
     - trigger_condition: when the rule fires
     - action: what happens on violation
     - scope: what document areas it applies to
     - mapped_sections: array of section_ids this rule applies to
     - mapped_elements: array of element_ids this rule checks
     - parameters: any configurable values

3. **Combined Analysis**: When both document layout and rules are provided, map the rules to the specific sections and elements found in the document. Ensure every rule references actual section_ids and element_ids from the layout analysis.

Always respond by calling the appropriate tool function.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid token");
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(payloadBase64));
      if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error("Token expired");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      if (payload.iss !== `${supabaseUrl}/auth/v1`) throw new Error("Invalid issuer");
      if (!payload.sub) throw new Error("Missing user ID");
    } catch (error) {
      console.error("JWT error:", error);
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysisType, documents, sections, messages } = body as {
      analysisType: string;
      documents?: Array<{ name: string; type: string; base64?: string; parsedContent?: string }>;
      sections?: unknown;
      messages?: Array<{ role: string; content: string }>;
    };

    console.log("Analysis request:", { analysisType, docCount: documents?.length, hasMessages: !!messages });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the messages array for the AI
    const aiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt },
    ];

    // For layout analysis, include document content
    if (analysisType === "layout" && documents?.length) {
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: `Analyze the following document(s) and extract all sections and elements with their approximate bounding boxes. Document names: ${documents.map((d) => d.name).join(", ")}` },
      ];

      for (const doc of documents) {
        if (!doc.base64) {
          contentParts.push({ type: "text", text: `File: ${doc.name} (${doc.type}) - no content available` });
          continue;
        }

        // Check base64 size - limit to ~4MB to avoid gateway issues
        const base64SizeBytes = (doc.base64.length * 3) / 4;
        const maxSizeMB = 4;
        
        if (base64SizeBytes > maxSizeMB * 1024 * 1024) {
          console.log(`File ${doc.name} is ${(base64SizeBytes / 1024 / 1024).toFixed(1)}MB - truncating`);
          // For large files, truncate the base64 or skip
          contentParts.push({ type: "text", text: `File: ${doc.name} (${doc.type}) - file too large for direct analysis. Please analyze based on the file name and type.` });
          continue;
        }

        if (doc.type.startsWith("image/")) {
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${doc.type};base64,${doc.base64}` }
          });
        } else if (doc.type === "application/pdf") {
          // For PDFs, send as image_url with pdf mime type - supported by Gemini via gateway
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${doc.base64}` }
          });
        } else if (doc.parsedContent) {
          contentParts.push({
            type: "text",
            text: `File: ${doc.name}\nParsed content:\n${doc.parsedContent}`
          });
        } else {
          contentParts.push({
            type: "text",
            text: `File: ${doc.name} (${doc.type}) - binary content, unable to display directly`
          });
        }
      }
      aiMessages.push({ role: "user", content: contentParts });
    }

    // For rules extraction from Excel/CSV content
    if (analysisType === "rules" && documents?.length) {
      let rulesContent = "Extract and structure all validation rules from the following files:\n\n";
      for (const doc of documents) {
        rulesContent += `File: ${doc.name} (${doc.type})\n`;
        if (doc.parsedContent) {
          rulesContent += `Content:\n${doc.parsedContent}\n\n`;
        }
      }
      if (sections) {
        rulesContent += `\nDocument sections/elements already identified:\n${JSON.stringify(sections, null, 2)}\n\nMap each rule to the relevant sections and elements.`;
      }
      aiMessages.push({ role: "user", content: rulesContent });
    }

    // For mapping rules to sections
    if (analysisType === "mapping") {
      aiMessages.push({
        role: "user",
        content: `Map the following rules to the document sections and elements:\n\nSections:\n${JSON.stringify(sections, null, 2)}\n\nRules:\n${JSON.stringify((body as Record<string, unknown>).rules, null, 2)}\n\nFor each rule, identify which sections and elements it should validate. Return the updated rules with mapped_sections and mapped_elements filled in.`
      });
    }

    // For chat-based interaction
    if (analysisType === "chat" && messages?.length) {
      let contextMsg = "";
      if (sections) contextMsg += `\nCurrent document sections:\n${JSON.stringify(sections, null, 2)}`;
      if ((body as Record<string, unknown>).rules) contextMsg += `\nCurrent rules:\n${JSON.stringify((body as Record<string, unknown>).rules, null, 2)}`;
      if (contextMsg) {
        aiMessages.push({ role: "system", content: `Current analysis context:${contextMsg}` });
      }
      for (const msg of messages) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Define tools based on analysis type
    const tools = [];

    if (analysisType === "layout") {
      tools.push({
        type: "function",
        function: {
          name: "return_layout_analysis",
          description: "Return the structured layout analysis of the document",
          parameters: {
            type: "object",
            properties: {
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    section_id: { type: "string" },
                    section_name: { type: "string" },
                    section_type: { type: "string", enum: ["header", "table", "text_block", "footer", "signature_block", "form_field", "chart", "summary"] },
                    page: { type: "number" },
                    bounding_box: {
                      type: "object",
                      properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }
                    },
                    elements: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          element_id: { type: "string" },
                          element_name: { type: "string" },
                          element_type: { type: "string", enum: ["field", "column", "row", "label", "value", "total", "subtotal", "date", "amount", "text"] },
                          description: { type: "string" },
                          bounding_box: {
                            type: "object",
                            properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }
                          }
                        },
                        required: ["element_id", "element_name", "element_type"]
                      }
                    }
                  },
                  required: ["section_id", "section_name", "section_type", "elements"]
                }
              },
              summary: { type: "string", description: "Brief summary of the document structure" }
            },
            required: ["sections", "summary"]
          }
        }
      });
    }

    if (analysisType === "rules" || analysisType === "mapping") {
      tools.push({
        type: "function",
        function: {
          name: "return_extracted_rules",
          description: "Return the extracted and mapped rules",
          parameters: {
            type: "object",
            properties: {
              rules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    rule_code: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["threshold", "calculation", "cross_table", "data_presence", "pattern_match", "custom"] },
                    category: { type: "string" },
                    trigger_condition: { type: "string" },
                    action: { type: "string" },
                    scope: { type: "string" },
                    mapped_sections: { type: "array", items: { type: "string" } },
                    mapped_elements: { type: "array", items: { type: "string" } },
                    parameters: { type: "object" },
                    status: { type: "string", enum: ["complete", "draft", "ambiguous"] }
                  },
                  required: ["rule_code", "name", "description", "type", "category", "trigger_condition", "action"]
                }
              },
              summary: { type: "string" },
              warnings: { type: "array", items: { type: "string" } }
            },
            required: ["rules", "summary"]
          }
        }
      });
    }

    const requestBody: Record<string, unknown> = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      stream: analysisType === "chat",
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = { type: "function", function: { name: tools[0].function.name } };
    }

    if (analysisType === "chat") {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "update_sections",
            description: "Update the document sections based on user feedback",
            parameters: {
              type: "object",
              properties: {
                sections: { type: "array", items: { type: "object" } },
                change_description: { type: "string" }
              },
              required: ["sections", "change_description"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_rules",
            description: "Update the rules based on user feedback",
            parameters: {
              type: "object",
              properties: {
                rules: { type: "array", items: { type: "object" } },
                change_description: { type: "string" }
              },
              required: ["rules", "change_description"]
            }
          }
        }
      ];
    }

    // Log the request size (without base64 content)
    const requestBodyStr = JSON.stringify(requestBody);
    console.log(`AI request size: ${(requestBodyStr.length / 1024 / 1024).toFixed(2)}MB, model: ${requestBody.model}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: requestBodyStr,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 413 || errText.includes("too large")) {
        return new Response(JSON.stringify({ error: "Document is too large for analysis. Please try with a smaller file or fewer pages." }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI service error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (analysisType === "chat") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming: parse tool call result
    const result = await response.json();
    console.log("AI response received, choices:", result.choices?.length);
    
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e, "Raw:", toolCall.function.arguments.substring(0, 500));
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: return content
    const content = result.choices?.[0]?.message?.content;
    console.log("No tool call found, returning content. Message keys:", Object.keys(result.choices?.[0]?.message || {}));
    return new Response(JSON.stringify({ message: content || "No response from AI" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analyze documents error:", error?.message || error, error?.stack);
    return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error?.message || "unknown"}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
