import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, AlertTriangle, CheckCircle, Loader2, 
  ChevronLeft, ChevronRight, X, Eye, FileWarning
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GeneratedRule } from "./ChatInterface";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDFViewer } from "./PDFViewer";
import { ImageViewer } from "./ImageViewer";
import type { DocumentException, BoundingBox } from "./types";

export type { DocumentException, BoundingBox };

interface DocumentTesterProps {
  rule: GeneratedRule;
  onClose: () => void;
}

export function DocumentTester({ rule, onClose }: DocumentTesterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [exceptions, setExceptions] = useState<DocumentException[]>([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Accept PDF, images, and common document types
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Please upload a PDF, image, or Excel file");
        return;
      }
      
      setFile(selectedFile);
      setExceptions([]);
      setScanComplete(false);
      // Estimate pages based on file size for non-PDFs
      setTotalPages(selectedFile.type === "application/pdf" ? 0 : 1);
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setScanComplete(false);
    setExceptions([]);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to test documents");
        setIsScanning(false);
        return;
      }

      const response = await supabase.functions.invoke("test-document-rule", {
        body: {
          rule,
          document: {
            name: file.name,
            type: file.type,
            base64,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to scan document");
      }

      const result = response.data;
      setExceptions(result.exceptions || []);
      setTotalPages(result.totalPages || 1);
      setSelectedPage(1);
      setScanComplete(true);

      if (result.exceptions?.length === 0) {
        toast.success("No exceptions found - document passes validation!");
      } else {
        toast.info(`Found ${result.exceptions.length} exception(s)`);
      }
    } catch (error) {
      console.error("Document scan error:", error);
      toast.error("Failed to scan document. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const severityColors: Record<string, string> = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-muted text-muted-foreground border-border",
  };

  const selectedExceptionData = exceptions.find((e) => e.id === selectedExceptionId);
  const isPDF = file?.type === "application/pdf";
  const isImage = file?.type.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-6xl h-[85vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileWarning className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Document Test</h2>
              <p className="text-xs text-muted-foreground">
                Testing: {rule.name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Document Upload & Viewer */}
          <div className="flex-1 flex flex-col border-r border-border">
            {!file ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div
                  className="w-full max-w-md border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium text-foreground mb-2">
                    Upload a document to test
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, Images, or Excel files
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Document Info Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setExceptions([]);
                        setScanComplete(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <Button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Scan Document
                      </>
                    )}
                  </Button>
                </div>

                {/* Document Preview Area */}
                <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
                  {totalPages > 0 && (
                    <>
                      {/* Page Navigation */}
                      <div className="flex items-center justify-center gap-4 py-2 border-b border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                          disabled={selectedPage === 1}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-sm font-medium">
                          Page {selectedPage} of {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPage((p) => Math.min(totalPages, p + 1))}
                          disabled={selectedPage === totalPages}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Document View with Exception Overlays */}
                      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                        {isPDF && file && (
                          <PDFViewer
                            file={file}
                            currentPage={selectedPage}
                            onLoadSuccess={(numPages) => {
                              if (totalPages === 0) setTotalPages(numPages);
                            }}
                            exceptions={exceptions}
                            selectedExceptionId={selectedExceptionId}
                            onExceptionClick={setSelectedExceptionId}
                          />
                        )}
                        {isImage && file && (
                          <ImageViewer
                            file={file}
                            exceptions={exceptions}
                            selectedExceptionId={selectedExceptionId}
                            onExceptionClick={setSelectedExceptionId}
                          />
                        )}
                        {!isPDF && !isImage && (
                          <div className="bg-card rounded-lg shadow-lg border border-border w-full max-w-2xl aspect-[8.5/11] flex items-center justify-center">
                            <p className="text-muted-foreground text-sm">
                              Preview not available for this file type
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {!totalPages && !isScanning && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-muted-foreground">
                        Click "Scan Document" to analyze
                      </p>
                    </div>
                  )}

                  {isScanning && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">
                        AI is scanning document against rule...
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel - Exception List */}
          <div className="w-80 flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Exceptions</h3>
                {scanComplete && (
                  <Badge variant="outline">
                    {exceptions.length} found
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <AnimatePresence mode="popLayout">
                {exceptions.length === 0 && scanComplete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-48 gap-3 p-4"
                  >
                    <CheckCircle className="h-12 w-12 text-success" />
                    <p className="text-sm text-muted-foreground text-center">
                      No exceptions found!
                      <br />
                      Document passes validation.
                    </p>
                  </motion.div>
                )}

                {exceptions.length === 0 && !scanComplete && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 p-4">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Upload and scan a document to see exceptions
                    </p>
                  </div>
                )}

                {exceptions.map((exc, idx) => (
                  <motion.div
                    key={exc.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "p-4 border-b border-border cursor-pointer transition-colors",
                      selectedExceptionId === exc.id
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      setSelectedExceptionId(exc.id);
                      setSelectedPage(exc.page);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          exc.severity === "high"
                            ? "bg-destructive text-destructive-foreground"
                            : exc.severity === "medium"
                            ? "bg-warning text-warning-foreground"
                            : "bg-muted-foreground text-background"
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={severityColors[exc.severity]}
                          >
                            {exc.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Page {exc.page}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {exc.description}
                        </p>
                        {exc.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {exc.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>

            {/* Exception Detail */}
            {selectedExceptionData && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="border-t border-border p-4 bg-muted/30"
              >
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Exception Detail
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedExceptionData.field && (
                    <div>
                      <span className="text-muted-foreground">Field: </span>
                      <span className="font-medium">{selectedExceptionData.field}</span>
                    </div>
                  )}
                  {selectedExceptionData.value && (
                    <div>
                      <span className="text-muted-foreground">Found: </span>
                      <span className="font-medium text-destructive">
                        {selectedExceptionData.value}
                      </span>
                    </div>
                  )}
                  {selectedExceptionData.expectedValue && (
                    <div>
                      <span className="text-muted-foreground">Expected: </span>
                      <span className="font-medium text-success">
                        {selectedExceptionData.expectedValue}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}