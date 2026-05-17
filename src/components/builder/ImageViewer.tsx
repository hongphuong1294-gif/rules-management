import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentException, BoundingBox } from "./types";

interface ImageViewerProps {
  file: File;
  exceptions: DocumentException[];
  selectedExceptionId: string | null;
  onExceptionClick: (id: string) => void;
}

export function ImageViewer({
  file,
  exceptions,
  selectedExceptionId,
  onExceptionClick,
}: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create object URL for the file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setIsLoading(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Calculate bounding box position
  const getBoundingBoxStyle = (bbox: BoundingBox | undefined, index: number) => {
    if (bbox) {
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

  if (!imageUrl) return null;

  return (
    <div className="relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className="relative shadow-lg rounded-lg overflow-hidden border border-border max-w-[600px]">
        <img
          src={imageUrl}
          alt="Document preview"
          className="max-w-full h-auto"
          onLoad={() => setIsLoading(false)}
        />

        {/* Exception Bounding Boxes Overlay */}
        {exceptions.map((exc, idx) => {
          const style = getBoundingBoxStyle(exc.boundingBox, idx);
          const isSelected = selectedExceptionId === exc.id;

          return (
            <motion.div
              key={exc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
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
                {idx + 1}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
