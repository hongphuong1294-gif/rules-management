import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert AI assistant for building document validation rules. Your role is to help users create, modify, and test validation rules using natural language.

You specialize in:
1. **Threshold-based rules**: Flag when values exceed certain percentages or absolute thresholds
2. **Calculation validation**: Verify that totals and summaries are computed correctly
3. **Cross-table validation**: Ensure consistency between related tables in documents
4. **Data presence checks**: Verify required fields exist and are properly formatted
5. **Pattern matching**: Validate text formats, dates, and identifiers

When helping users, you should:
- Ask clarifying questions when the rule requirements are ambiguous
- Suggest improvements to make rules more robust
- Provide clear rule specifications

IMPORTANT: When you have enough information to create a rule definition, you MUST call the "generate_rule" function with the complete rule details. Always call this function when you can infer:
- A clear name for the rule
- What the rule validates (description)
- The type of validation

Be conversational and helpful. Guide users through creating their rule step by step.`;

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
    const { messages, currentRule } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages (max 50)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!msg.role || !["user", "assistant"].includes(msg.role)) {
        return new Response(JSON.stringify({ error: "Invalid message role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof msg.content !== "string" || msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: "Invalid message content" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add current rule context if editing
    let contextualSystemPrompt = systemPrompt;
    if (currentRule) {
      contextualSystemPrompt += `\n\nThe user is currently editing this rule:\n${JSON.stringify(currentRule, null, 2)}\n\nWhen they ask for changes, update the rule accordingly by calling generate_rule with the modified values.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: contextualSystemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_rule",
              description: "Generate a complete rule definition based on user requirements. Call this when you have enough information to create a rule.",
              parameters: {
                type: "object",
                properties: {
                  name: { 
                    type: "string", 
                    description: "Short, descriptive name for the rule (e.g., 'Balance Change Exception')" 
                  },
                  description: { 
                    type: "string", 
                    description: "Detailed description of what the rule validates" 
                  },
                  type: { 
                    type: "string", 
                    enum: ["threshold", "calculation", "cross_table", "data_presence", "pattern_match", "custom"],
                    description: "The type of validation rule" 
                  },
                  rule_code: { 
                    type: "string", 
                    description: "Unique code identifier for the rule (e.g., RULE_001, BAL_CHK_01)" 
                  },
                  category: { 
                    type: "string", 
                    description: "Category for organizing the rule (e.g., 'Financial Validation', 'Data Quality')" 
                  },
                  subcategory: { 
                    type: "string", 
                    description: "Optional subcategory for further organization" 
                  },
                  trigger_condition: { 
                    type: "string", 
                    description: "When the rule should be triggered (e.g., 'When ending balance changes more than 10% from previous month')" 
                  },
                  action: { 
                    type: "string", 
                    description: "What happens when the rule is violated (e.g., 'Flag as exception', 'Block submission', 'Warn user')" 
                  },
                  scope: { 
                    type: "string", 
                    description: "Scope of application (e.g., 'All accounts', 'Portfolio Summary table', 'Invoice line items')" 
                  },
                  elements: { 
                    type: "object", 
                    description: "UI elements or fields the rule applies to (e.g., { 'fields': ['ending_balance', 'previous_balance'] })" 
                  },
                  parameters: { 
                    type: "object", 
                    description: "Configurable parameters for the rule (e.g., { 'threshold': 10, 'unit': 'percent' })" 
                  },
                  config: { 
                    type: "object", 
                    description: "Additional configuration options" 
                  }
                },
                required: ["name", "description", "type", "rule_code", "category", "trigger_condition", "action", "scope"],
                additionalProperties: false
              }
            }
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Rule builder chat error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});