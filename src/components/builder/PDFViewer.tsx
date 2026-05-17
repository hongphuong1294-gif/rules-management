import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentException, BoundingBox } from "./types";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  currentPage: number;
  onLoadSuccess: (numPages: number) => void;
  exceptions: DocumentException[];
  selectedExceptionId: string | null;
  onExceptionClick: (id: string) => void;
}

export function PDFViewer({
  file,
  currentPage,
  onLoadSuccess,
  exceptions,
  selectedExceptionId,
  onExceptionClick,
}: PDFViewerProps) {
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Create object URL for the file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    onLoadSuccess(numPages);
    setIsLoading(false);
  }, [onLoadSuccess]);

  const handlePageLoadSuccess = useCallback(({ width, height }: { width: number; height: number }) => {
    setPageWidth(width);
    setPageHeight(height);
  }, []);

  // Get exceptions for current page
  const pageExceptions = exceptions.filter((e) => e.page === currentPage);

  // Calculate bounding box position relative to page dimensions
  const getBoundingBoxStyle = (bbox: BoundingBox | undefined, index: number) => {
    if (bbox && pageWidth > 0 && pageHeight > 0) {
      // Bounding box coordinates are percentages (0-100)
      return {
        left: `${bbox.x}%`,
        top: `${bbox.y}%`,
        width: `${bbox.width}%`,
        height: `${bbox.height}%`,
      };
    }
    // Fallback positioning if no bounding box
    return {
      left: `${10 + (index % 3) * 25}%`,
      top: `${15 + Math.floor(index / 3) * 20}%`,
      width: "20%",
      height: "8%",
    };
  };

  if (!fileUrl) return null;

  return (
    <div className="relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <Document
        file={fileUrl}
        onLoadSuccess={handleDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-[600px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
        error={
          <div className="flex items-center justify-center h-[600px] text-destructive">
            Failed to load PDF
          </div>
        }
        className="flex justify-center"
      >
        <div className="relative shadow-lg rounded-lg overflow-hidden border border-border">
          <Page
            pageNumber={currentPage}
            onLoadSuccess={handlePageLoadSuccess}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={600}
            loading={
              <div className="w-[600px] h-[800px] flex items-center justify-center bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          />

          {/* Exception Bounding Boxes Overlay */}
          {pageExceptions.map((exc, idx) => {
            const style = getBoundingBoxStyle(exc.boundingBox, idx);
            const isSelected = selectedExceptionId === exc.id;
            const exceptionIndex = exceptions.findIndex(e => e.id === exc.id);

            return (
              <motion.div
                key={exc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  scale: isSelected ? 1 : 1,
                }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "absolute cursor-pointer transition-all duration-200",
                  isSelected ? "z-30" : "z-10 hover:z-20"
                )}
                style={style}
                onClick={() => onExceptionClick(exc.id)}
              >
                {/* Bounding box highlight - prominent red border when selected */}
                <div
                  className={cn(
                    "absolute inset-0 rounded transition-all duration-200",
                    isSelected
                      ? "border-[3px] border-destructive bg-destructive/5 shadow-lg"
                      : exc.severity === "high"
                      ? "border-2 border-destructive/60 bg-destructive/5 hover:border-destructive hover:bg-destructive/10"
                      : exc.severity === "medium"
                      ? "border-2 border-warning/60 bg-warning/5 hover:border-warning hover:bg-warning/10"
                      : "border-2 border-muted-foreground/60 bg-muted-foreground/5 hover:border-muted-foreground hover:bg-muted-foreground/10"
                  )}
                />

                {/* Exception number badge */}
                <div
                  className={cn(
                    "absolute -top-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-transform",
                    isSelected && "scale-110",
                    exc.severity === "high"
                      ? "bg-destructive text-destructive-foreground"
                      : exc.severity === "medium"
                      ? "bg-warning text-warning-foreground"
                      : "bg-muted-foreground text-background"
                  )}
                >
                  {exceptionIndex + 1}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Document>
    </div>
  );
}
