import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert document validation AI. Your task is to analyze a document against a specific validation rule and find exceptions (violations).

You will receive:
1. A validation rule definition with trigger conditions, parameters, and scope
2. A document to analyze (as base64 encoded image or PDF)

Your job is to:
1. Carefully examine the document
2. Apply the validation rule to identify any exceptions
3. For each exception found, provide:
   - A clear description of the violation
   - The page number where it occurs
   - The location/section in the document
   - The field name if applicable
   - The actual value found
   - The expected value based on the rule
   - Severity level (high, medium, low)
   - IMPORTANT: A bounding box (x, y, width, height as percentages 0-100) marking where the exception is located on the page

Be thorough but accurate. Only report genuine violations of the rule.

For bounding boxes:
- x: Percentage from left edge (0-100)
- y: Percentage from top edge (0-100)  
- width: Width as percentage of page width (typically 10-30)
- height: Height as percentage of page height (typically 3-10)
- Estimate the position as accurately as possible based on where the violation appears

IMPORTANT: You MUST call the "report_exceptions" function with your findings after analyzing the document.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode and validate JWT
    const token = authHeader.replace("Bearer ", "");
    let userId: string;
    
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }
      
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const expectedIssuer = `${supabaseUrl}/auth/v1`;
      if (payload.iss !== expectedIssuer) {
        throw new Error("Invalid issuer");
      }
      
      userId = payload.sub;
      if (!userId) {
        throw new Error("Missing user ID");
      }
      
      console.log("Authenticated user:", userId);
    } catch (error) {
      console.error("JWT validation error:", error);
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { rule, document } = body;

    if (!rule || !document) {
      return new Response(JSON.stringify({ error: "Rule and document are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the message content with the document
    const ruleDescription = `
VALIDATION RULE TO APPLY:
- Name: ${rule.name}
- Description: ${rule.description}
- Type: ${rule.type}
- Rule Code: ${rule.rule_code || "N/A"}
- Category: ${rule.category || "N/A"}
- Trigger Condition: ${rule.trigger_condition || "N/A"}
- Action: ${rule.action || "N/A"}
- Scope: ${rule.scope || "N/A"}
${rule.parameters ? `- Parameters: ${JSON.stringify(rule.parameters)}` : ""}
${rule.elements ? `- Elements: ${JSON.stringify(rule.elements)}` : ""}

Analyze the attached document and find any exceptions that violate this rule.
`;

    // Determine media type for the document
    let mediaType = "image/png";
    if (document.type === "application/pdf") {
      mediaType = "application/pdf";
    } else if (document.type.startsWith("image/")) {
      mediaType = document.type;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: ruleDescription },
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${document.base64}`,
            },
          },
        ],
      },
    ];

    console.log("Sending document for analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "report_exceptions",
              description: "Report the exceptions found in the document based on the validation rule",
              parameters: {
                type: "object",
                properties: {
                  totalPages: {
                    type: "number",
                    description: "Total number of pages in the document (estimate if needed)",
                  },
                  exceptions: {
                    type: "array",
                    description: "List of exceptions/violations found",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          description: "Unique identifier for this exception (e.g., EXC_001)",
                        },
                        page: {
                          type: "number",
                          description: "Page number where the exception was found",
                        },
                        location: {
                          type: "string",
                          description: "Location or section in the document (e.g., 'Table 2, Row 5')",
                        },
                        description: {
                          type: "string",
                          description: "Clear description of the violation",
                        },
                        severity: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "Severity of the exception",
                        },
                        field: {
                          type: "string",
                          description: "The field name that violated the rule",
                        },
                        value: {
                          type: "string",
                          description: "The actual value found in the document",
                        },
                        expectedValue: {
                          type: "string",
                          description: "The expected value based on the rule",
                        },
                        boundingBox: {
                          type: "object",
                          description: "Bounding box marking the exception location on the page (all values as percentages 0-100)",
                          properties: {
                            x: {
                              type: "number",
                              description: "X position from left edge as percentage (0-100)",
                            },
                            y: {
                              type: "number",
                              description: "Y position from top edge as percentage (0-100)",
                            },
                            width: {
                              type: "number",
                              description: "Width as percentage of page width (typically 10-30)",
                            },
                            height: {
                              type: "number",
                              description: "Height as percentage of page height (typically 3-10)",
                            },
                          },
                          required: ["x", "y", "width", "height"],
                        },
                      },
                      required: ["id", "page", "location", "description", "severity", "boundingBox"],
                    },
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary of the validation results",
                  },
                },
                required: ["totalPages", "exceptions", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_exceptions" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.name === "report_exceptions") {
      const exceptionsData = JSON.parse(toolCall.function.arguments);
      console.log(`Found ${exceptionsData.exceptions?.length || 0} exceptions`);
      
      return new Response(JSON.stringify(exceptionsData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if no tool call
    return new Response(JSON.stringify({
      totalPages: 1,
      exceptions: [],
      summary: "Document analyzed but no structured response was generated.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Document test error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});