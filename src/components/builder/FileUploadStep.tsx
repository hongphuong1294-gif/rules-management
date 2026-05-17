import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, FileSpreadsheet, Bot, Loader2, Check, 
  ChevronRight, Trash2, FileImage, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UploadedFile } from "./types";

interface FileUploadStepProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onProceed: () => void;
  isProcessing: boolean;
}

const fileIcons: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "image/png": FileImage,
  "image/jpeg": FileImage,
  "image/webp": FileImage,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileSpreadsheet,
  "application/vnd.ms-excel": FileSpreadsheet,
  "text/csv": FileSpreadsheet,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileText,
};

function categorizeFile(type: string): "document" | "rules" {
  if (type === "application/pdf" || type.startsWith("image/")) return "document";
  return "rules";
}

export function FileUploadStep({ files, onFilesChange, onProceed, isProcessing }: FileUploadStepProps) {
  const documentInputRef = useRef<HTMLInputElement>(null);
  const rulesInputRef = useRef<HTMLInputElement>(null);

  const handleFileAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>, category: "document" | "rules") => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles: UploadedFile[] = selectedFiles.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      category: category,
      name: f.name,
      type: f.type,
      status: "pending" as const,
    }));

    onFilesChange([...files, ...newFiles]);
    e.target.value = "";
  }, [files, onFilesChange]);

  const removeFile = useCallback((id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  }, [files, onFilesChange]);

  const documentFiles = files.filter(f => f.category === "document");
  const rulesFiles = files.filter(f => f.category === "rules");
  const hasDocuments = documentFiles.length > 0;
  const hasRules = rulesFiles.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-gradient-primary p-2">
            <Upload className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Upload Documents</h2>
            <p className="text-xs text-muted-foreground">
              Upload sample documents and existing rules to get started
            </p>
          </div>
        </div>

        {/* Two-column upload zones */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sample Documents */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Sample Documents</span>
              <Badge variant="secondary" className="text-xs">{documentFiles.length}</Badge>
            </div>
            <label 
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => documentInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-foreground">PDF or Images</span>
              <span className="text-xs text-muted-foreground">Template / sample documents</span>
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                multiple
                onChange={(e) => handleFileAdd(e, "document")}
                className="hidden"
              />
            </label>
            {/* Document file list */}
            {documentFiles.map(f => (
              <FileItem key={f.id} file={f} onRemove={() => removeFile(f.id)} />
            ))}
          </div>

          {/* Initial Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Initial Rules</span>
              <Badge variant="secondary" className="text-xs">{rulesFiles.length}</Badge>
            </div>
            <label 
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => rulesInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-foreground">Excel, CSV, or Word</span>
              <span className="text-xs text-muted-foreground">Existing rules / checks</span>
              <input
                ref={rulesInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.docx"
                multiple
                onChange={(e) => handleFileAdd(e, "rules")}
                className="hidden"
              />
            </label>
            {/* Rules file list */}
            {rulesFiles.map(f => (
              <FileItem key={f.id} file={f} onRemove={() => removeFile(f.id)} />
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
          <Bot className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">How onboarding works:</strong></p>
            <ol className="list-decimal ml-4 space-y-0.5 text-xs">
              <li>Upload your sample documents (PDF/images) and existing rules (Excel/CSV)</li>
              <li>AI analyzes documents to identify sections and elements</li>
              <li>AI maps your rules to document sections with traceability</li>
              <li>Verify and refine using side-by-side document view</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Footer action */}
      <div className="border-t border-border p-4">
        <Button
          className="w-full bg-gradient-primary hover:shadow-glow"
          onClick={onProceed}
          disabled={(!hasDocuments && !hasRules) || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing documents...
            </>
          ) : (
            <>
              Analyze Documents
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function FileItem({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  const Icon = fileIcons[file.type] || FileText;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-foreground truncate flex-1">{file.name}</span>
      {file.status === "processing" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      {file.status === "analyzed" && <Check className="h-3 w-3 text-success" />}
      {file.status === "error" && <AlertCircle className="h-3 w-3 text-destructive" />}
      <button onClick={onRemove} className="p-0.5 hover:bg-muted rounded">
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
