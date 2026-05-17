import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Layers, Shield, Check, Bot, MessageSquare, 
  ChevronRight, Loader2
} from "lucide-react";
import { FileUploadStep } from "@/components/builder/FileUploadStep";
import { SectionVerifyStep } from "@/components/builder/SectionVerifyStep";
import { RulesVerifyStep } from "@/components/builder/RulesVerifyStep";
import { ChatInterface, type GeneratedRule } from "@/components/builder/ChatInterface";
import { useRules, type CreateRuleInput } from "@/hooks/useRules";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import type { 
  UploadedFile, DocumentSection, ExtractedRule, OnboardingStep 
} from "@/components/builder/types";

interface RuleBuilderProps {
  onNavigate: (path: string) => void;
  editingRule?: any;
  onClearEdit?: () => void;
}

const steps: Array<{ key: OnboardingStep; label: string; icon: typeof Upload }> = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "sections", label: "Sections", icon: Layers },
  { key: "rules", label: "Rules", icon: Shield },
  { key: "complete", label: "Done", icon: Check },
];

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-documents`;

export function RuleBuilder({ onNavigate, editingRule, onClearEdit }: RuleBuilderProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);
  const [layoutSummary, setLayoutSummary] = useState("");
  const [ruleWarnings, setRuleWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const { createRule } = useRules();
  const { user } = useAuth();

  // Convert file to base64
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Parse Excel/CSV content to text for AI
  const parseSpreadsheet = async (file: File): Promise<string> => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      let content = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        content += `\n--- Sheet: ${sheetName} ---\n`;
        content += JSON.stringify(json, null, 2).slice(0, 50000); // Limit size
      }
      return content;
    } catch {
      return "[Unable to parse spreadsheet content]";
    }
  };

  // Step 1 → Step 2: Analyze documents
  const handleAnalyzeDocuments = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to use the Rule Builder");
      return;
    }

    setIsProcessing(true);
    const documentFiles = files.filter(f => f.category === "document");
    const rulesFiles = files.filter(f => f.category === "rules");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Update file statuses
      setFiles(prev => prev.map(f => ({ ...f, status: "processing" as const })));

      // Step A: Layout analysis from document files
      if (documentFiles.length > 0) {
        const docs = await Promise.all(documentFiles.map(async f => ({
          name: f.name,
          type: f.type,
          base64: await fileToBase64(f.file),
        })));

        const layoutResp = await fetch(ANALYZE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ analysisType: "layout", documents: docs }),
        });

        if (!layoutResp.ok) {
          const err = await layoutResp.json().catch(() => ({}));
          throw new Error(err.error || "Layout analysis failed");
        }

        const layoutResult = await layoutResp.json();
        setSections(layoutResult.sections || []);
        setLayoutSummary(layoutResult.summary || "");
      }

      // Step B: Extract rules from rules files
      if (rulesFiles.length > 0) {
        const ruleDocs = await Promise.all(rulesFiles.map(async f => ({
          name: f.name,
          type: f.type,
          base64: await fileToBase64(f.file),
          parsedContent: await parseSpreadsheet(f.file),
        })));

        const rulesResp = await fetch(ANALYZE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            analysisType: "rules",
            documents: ruleDocs,
            sections: sections.length > 0 ? sections : undefined,
          }),
        });

        if (!rulesResp.ok) {
          const err = await rulesResp.json().catch(() => ({}));
          throw new Error(err.error || "Rule extraction failed");
        }

        const rulesResult = await rulesResp.json();
        setExtractedRules(rulesResult.rules || []);
        setRuleWarnings(rulesResult.warnings || []);
      }

      // Update file statuses
      setFiles(prev => prev.map(f => ({ ...f, status: "analyzed" as const })));

      // Go to appropriate step
      if (documentFiles.length > 0) {
        setCurrentStep("sections");
      } else if (rulesFiles.length > 0) {
        setCurrentStep("rules");
      }

      toast.success("Documents analyzed successfully!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze documents");
      setFiles(prev => prev.map(f => ({ ...f, status: "error" as const })));
    } finally {
      setIsProcessing(false);
    }
  }, [files, user, sections]);

  // Step 2 → Step 3: Proceed to rules with mapping
  const handleProceedToRules = useCallback(async () => {
    if (extractedRules.length === 0 && files.some(f => f.category === "rules")) {
      // Need to extract rules first
      setIsProcessing(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const rulesFiles = files.filter(f => f.category === "rules");
        const ruleDocs = await Promise.all(rulesFiles.map(async f => ({
          name: f.name,
          type: f.type,
          base64: await fileToBase64(f.file),
          parsedContent: await parseSpreadsheet(f.file),
        })));

        const rulesResp = await fetch(ANALYZE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            analysisType: "rules",
            documents: ruleDocs,
            sections,
          }),
        });

        if (!rulesResp.ok) throw new Error("Rule extraction failed");
        const rulesResult = await rulesResp.json();
        setExtractedRules(rulesResult.rules || []);
        setRuleWarnings(rulesResult.warnings || []);
      } catch (error: any) {
        toast.error(error.message || "Failed to extract rules");
      } finally {
        setIsProcessing(false);
      }
    }
    setCurrentStep("rules");
  }, [extractedRules, files, sections]);

  // Step 3: Save all rules
  const handleSaveAllRules = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to save rules");
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const rule of extractedRules) {
      try {
        const input: CreateRuleInput = {
          name: rule.name,
          description: rule.description,
          type: rule.type,
          rule_code: rule.rule_code,
          category: rule.category,
          trigger_condition: rule.trigger_condition,
          action: rule.action,
          scope: rule.scope,
          status: rule.status === "ambiguous" ? "draft" : "draft",
          elements: {
            mapped_sections: rule.mapped_sections || [],
            mapped_elements: rule.mapped_elements || [],
          },
          parameters: rule.parameters || {},
        };
        await createRule.mutateAsync(input);
        successCount++;
      } catch (error) {
        console.error(`Failed to save rule ${rule.rule_code}:`, error);
        errorCount++;
      }
    }

    setIsSaving(false);

    if (successCount > 0) toast.success(`Saved ${successCount} rules successfully!`);
    if (errorCount > 0) toast.error(`Failed to save ${errorCount} rules`);

    if (successCount > 0) {
      setCurrentStep("complete");
    }
  }, [extractedRules, user, createRule]);

  const stepIndex = steps.findIndex(s => s.key === currentStep);
  const documentFiles = files.filter(f => f.category === "document");

  return (
    <div className="flex h-full gap-4">
      {/* Main content area */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-1 flex-col rounded-2xl border border-border bg-card shadow-card overflow-hidden"
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-muted/30">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === stepIndex;
            const isDone = idx < stepIndex;
            return (
              <div key={step.key} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isActive ? "bg-primary text-primary-foreground" :
                  isDone ? "bg-success/10 text-success" : "text-muted-foreground"
                )}>
                  {isDone ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                  {step.label}
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <FileUploadStep
                  files={files}
                  onFilesChange={setFiles}
                  onProceed={handleAnalyzeDocuments}
                  isProcessing={isProcessing}
                />
              </motion.div>
            )}

            {currentStep === "sections" && (
              <motion.div key="sections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <SectionVerifyStep
                  sections={sections}
                  onSectionsChange={setSections}
                  documentFiles={documentFiles}
                  onProceed={handleProceedToRules}
                  onBack={() => setCurrentStep("upload")}
                  summary={layoutSummary}
                />
              </motion.div>
            )}

            {currentStep === "rules" && (
              <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <RulesVerifyStep
                  rules={extractedRules}
                  sections={sections}
                  onRulesChange={setExtractedRules}
                  documentFiles={documentFiles}
                  onSave={handleSaveAllRules}
                  onBack={() => sections.length > 0 ? setCurrentStep("sections") : setCurrentStep("upload")}
                  isSaving={isSaving}
                  warnings={ruleWarnings}
                />
              </motion.div>
            )}

            {currentStep === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="rounded-full bg-success/10 p-6">
                  <Check className="h-12 w-12 text-success" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Onboarding Complete!</h2>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Your rules have been imported and are ready for review in the Rule Library.
                  You can further refine them individually or group them into Templates.
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => onNavigate("/rules")}
                    className="px-4 py-2 bg-gradient-primary text-primary-foreground rounded-lg font-medium text-sm hover:shadow-glow transition-all"
                  >
                    Go to Rule Library
                  </button>
                  <button
                    onClick={() => onNavigate("/templates")}
                    className="px-4 py-2 border border-border rounded-lg font-medium text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Create Template
                  </button>
                  <button
                    onClick={() => {
                      setCurrentStep("upload");
                      setFiles([]);
                      setSections([]);
                      setExtractedRules([]);
                    }}
                    className="px-4 py-2 border border-border rounded-lg font-medium text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Import More
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* AI Chat sidebar (collapsible) */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 380 }}
            exit={{ opacity: 0, width: 0 }}
            className="shrink-0 rounded-2xl border border-border bg-card shadow-card overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">AI Assistant</span>
              </div>
              <button onClick={() => setShowChat(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>
            <ChatInterface
              onRuleGenerated={() => {}}
              currentRule={null}
              isEditing={false}
              onboardingContext={{ sections, rules: extractedRules, step: currentStep }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat toggle button */}
      {!showChat && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowChat(true)}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground shadow-glow flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <MessageSquare className="h-5 w-5" />
        </motion.button>
      )}
    </div>
  );
}
