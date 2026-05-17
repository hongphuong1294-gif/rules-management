import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, Lightbulb, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { RuleType } from "@/hooks/useRules";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface GeneratedRule {
  name: string;
  description: string;
  type: RuleType;
  rule_code: string;
  category: string;
  subcategory?: string;
  trigger_condition: string;
  action: string;
  scope: string;
  elements?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface OnboardingContext {
  sections?: import("./types").DocumentSection[];
  rules?: import("./types").ExtractedRule[];
  step?: import("./types").OnboardingStep;
}

interface ChatInterfaceProps {
  onRuleGenerated: (rule: GeneratedRule) => void;
  currentRule: GeneratedRule | null;
  isEditing?: boolean;
  editingRuleName?: string;
  onboardingContext?: OnboardingContext;
}

const suggestedPrompts = [
  "Add a rule: Flag if ending balance changes more than 10% from previous month",
  "Create a calculation check for Total Subtractions in Activity Summary",
  "Add cross-table validation between Portfolio Summary and Account Holdings",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rule-builder-chat`;

async function streamChat({
  messages,
  currentRule,
  onDelta,
  onToolCall,
  onDone,
  onError,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  currentRule: GeneratedRule | null;
  onDelta: (deltaText: string) => void;
  onToolCall: (args: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    onError("Please sign in to use the AI Rule Builder");
    return;
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, currentRule }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Connection failed" }));
    onError(errorData.error || `Error: ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response stream available");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;
  let toolCallArgs = "";

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        if (toolCallArgs) {
          onToolCall(toolCallArgs);
        }
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta;
        
        // Handle regular content
        if (delta?.content) {
          onDelta(delta.content);
        }
        
        // Handle tool calls
        if (delta?.tool_calls?.[0]?.function?.arguments) {
          toolCallArgs += delta.tool_calls[0].function.arguments;
        }
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) onDelta(delta.content);
        if (delta?.tool_calls?.[0]?.function?.arguments) {
          toolCallArgs += delta.tool_calls[0].function.arguments;
        }
      } catch { /* ignore */ }
    }
  }

  if (toolCallArgs) {
    onToolCall(toolCallArgs);
  }

  onDone();
}

export function ChatInterface({ onRuleGenerated, currentRule, isEditing, editingRuleName, onboardingContext }: ChatInterfaceProps) {
  const getInitialMessage = () => {
    if (onboardingContext) {
      const step = onboardingContext.step || "upload";
      if (step === "sections") {
        return {
          id: "welcome", role: "assistant" as const,
          content: `I've analyzed your documents and found ${onboardingContext.sections?.length || 0} sections. You can review and verify them in the panel. Ask me if you'd like to:\n• Merge or split sections\n• Rename elements\n• Explain what a section contains`,
          timestamp: new Date(),
        };
      }
      if (step === "rules") {
        return {
          id: "welcome", role: "assistant" as const,
          content: `I've extracted ${onboardingContext.rules?.length || 0} rules and mapped them to your document sections. Review the traceability links by clicking each rule.\n\nAsk me to:\n• Clarify ambiguous rules\n• Add missing rules\n• Adjust rule-to-section mapping`,
          timestamp: new Date(),
        };
      }
      return {
        id: "welcome", role: "assistant" as const,
        content: "Hello! I'm your AI onboarding assistant. Upload your sample documents and existing rules to get started. I'll help you analyze the document structure and map your rules to the right sections.",
        timestamp: new Date(),
      };
    }
    if (isEditing && editingRuleName) {
      return {
        id: "welcome", role: "assistant" as const,
        content: `I'm ready to help you modify the rule "${editingRuleName}". Tell me what changes you'd like to make.`,
        timestamp: new Date(),
      };
    }
    return {
      id: "welcome", role: "assistant" as const,
      content: "Hello! I'm your AI Rule Builder assistant. Upload your documents and rules to get started with onboarding, or describe a rule you'd like to create.",
      timestamp: new Date(),
    };
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const upsertAssistant = (nextChunk: string) => {
      assistantContent += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id !== "welcome") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    try {
      await streamChat({
        messages: newMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content })),
        currentRule,
        onDelta: (chunk) => upsertAssistant(chunk),
        onToolCall: (toolArgs) => {
          try {
            const rule = JSON.parse(toolArgs) as GeneratedRule;
            onRuleGenerated(rule);
            // Add a message about the generated rule if no content was streamed
            if (!assistantContent) {
              upsertAssistant(`I've generated a rule definition for "${rule.name}". You can see the preview on the right panel. Review the details and click "Save Rule" when you're ready, or tell me what changes you'd like to make.`);
            }
          } catch (e) {
            console.error("Failed to parse tool call:", e, toolArgs);
          }
        },
        onDone: () => setIsLoading(false),
        onError: (error) => {
          setIsLoading(false);
          toast.error(error, {
            icon: <AlertCircle className="h-4 w-4" />,
          });
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      toast.error("Failed to connect to AI. Please try again.");
    }
  }, [input, isLoading, messages, currentRule, onRuleGenerated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  message.role === "assistant"
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === "assistant"
                    ? "bg-card border border-border shadow-card"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={cn(
                  "mt-1 text-xs",
                  message.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/70"
                )}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-card border border-border px-4 py-3 shadow-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 2 && !currentRule && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            <span>Suggested prompts</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {prompt.slice(0, 50)}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentRule ? "Describe changes to the rule..." : "Describe the rule you want to create..."}
              className="min-h-[52px] max-h-[200px] resize-none pr-12 bg-muted/50 border-transparent focus:border-primary"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute bottom-2 right-2 h-8 w-8 rounded-lg bg-gradient-primary hover:shadow-glow"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>AI-powered rule creation • Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
