import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileJson, CheckCircle, AlertTriangle, Info, Clock, Save, RotateCcw, Loader2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { GeneratedRule } from "./ChatInterface";
import { DocumentTester } from "./DocumentTester";

interface RulePreviewProps {
  rule: GeneratedRule | null;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isEditing?: boolean;
}

const typeColors: Record<string, string> = {
  threshold: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  calculation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cross_table: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  data_presence: "bg-green-500/10 text-green-600 border-green-500/20",
  pattern_match: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  custom: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function PreviewField({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function JsonPreview({ label, data }: { label: string; data: Record<string, unknown> | undefined }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <pre className="rounded-lg bg-muted/50 p-3 text-xs text-foreground overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function RulePreview({ rule, onSave, onReset, isSaving, isEditing }: RulePreviewProps) {
  const [showDocumentTester, setShowDocumentTester] = useState(false);

  return (
    <>
      {/* Document Tester Modal */}
      <AnimatePresence>
        {showDocumentTester && rule && (
          <DocumentTester
            rule={rule}
            onClose={() => setShowDocumentTester(false)}
          />
        )}
      </AnimatePresence>
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileJson className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Rule Preview</h3>
            <p className="text-xs text-muted-foreground">
              {rule ? "Review generated rule" : "Live draft view"}
            </p>
          </div>
        </div>
        {rule && (
          <Badge variant="outline" className={typeColors[rule.type] || typeColors.custom}>
            {rule.type.replace("_", " ")}
          </Badge>
        )}
        {!rule && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            <Clock className="mr-1 h-3 w-3" />
            Waiting
          </Badge>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {rule ? (
            <motion.div
              key="rule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              {/* Rule Info */}
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-green-600">Rule Generated</span>
              </div>

              <PreviewField label="Rule Code" value={rule.rule_code} />
              
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </span>
                <p className="mt-1 text-lg font-semibold text-foreground">{rule.name}</p>
              </div>

              <PreviewField label="Description" value={rule.description} />

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <PreviewField label="Category" value={rule.category} />
                {rule.subcategory && (
                  <PreviewField label="Subcategory" value={rule.subcategory} />
                )}
              </div>

              <PreviewField label="Scope" value={rule.scope} />
              <PreviewField label="Trigger Condition" value={rule.trigger_condition} />
              <PreviewField label="Action" value={rule.action} />

              <JsonPreview label="Elements" data={rule.elements} />
              <JsonPreview label="Parameters" data={rule.parameters} />
              <JsonPreview label="Configuration" data={rule.config} />

              {/* Validation Status */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Validation Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Schema valid</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Required fields complete</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Ready to save</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-6"
            >
              <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                <div className="rounded-full bg-muted p-4">
                  <FileJson className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">No rule generated yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start chatting to create a rule
                  </p>
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Describe your validation rule in natural language, and the AI will generate a structured definition you can save to your library.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Actions */}
      {rule && (
        <div className="border-t border-border p-4 space-y-2">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowDocumentTester(true)}
            disabled={isSaving}
          >
            <FlaskConical className="mr-2 h-4 w-4" />
            Test with Document
          </Button>
          <Button 
            className="w-full bg-gradient-primary hover:shadow-glow"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update Rule" : "Save Rule"}
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onReset}
            disabled={isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {isEditing ? "Cancel Edit" : "Start Over"}
          </Button>
        </div>
      )}
    </motion.div>
    </>
  );
}