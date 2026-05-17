import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, Check, X, ChevronDown, ChevronRight, ChevronLeft,
  Eye, EyeOff, MapPin, Send, Bot, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { PDFViewer } from "./PDFViewer";
import { ImageViewer } from "./ImageViewer";
import type { DocumentSection, DocumentElement, UploadedFile, BoundingBox } from "./types";

interface SectionVerifyStepProps {
  sections: DocumentSection[];
  onSectionsChange: (sections: DocumentSection[]) => void;
  documentFiles: UploadedFile[];
  onProceed: () => void;
  onBack: () => void;
  summary: string;
}

export function SectionVerifyStep({ 
  sections, onSectionsChange, documentFiles, onProceed, onBack, summary 
}: SectionVerifyStepProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(sections.map(s => s.section_id)));
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Get the first PDF/image file for preview
  const previewFile = useMemo(() => 
    documentFiles.find(f => f.type === "application/pdf" || f.type.startsWith("image/")),
    [documentFiles]
  );

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedSections(next);
  };

  const toggleVerified = (sectionId: string) => {
    onSectionsChange(sections.map(s => 
      s.section_id === sectionId ? { ...s, verified: !s.verified } : s
    ));
  };

  const removeSection = (sectionId: string) => {
    onSectionsChange(sections.filter(s => s.section_id !== sectionId));
  };

  const removeElement = (sectionId: string, elementId: string) => {
    onSectionsChange(sections.map(s => 
      s.section_id === sectionId 
        ? { ...s, elements: s.elements.filter(e => e.element_id !== elementId) }
        : s
    ));
  };

  const allVerified = sections.every(s => s.verified);

  // Build overlay boxes for the document viewer
  const overlayExceptions = useMemo(() => {
    const items: Array<{ id: string; page: number; boundingBox?: BoundingBox; severity: "high" | "medium" | "low"; description: string; location: string }> = [];
    for (const section of sections) {
      if (section.bounding_box) {
        items.push({
          id: section.section_id,
          page: section.page || 1,
          boundingBox: section.bounding_box,
          severity: selectedSectionId === section.section_id || hoveredId === section.section_id ? "high" : "low",
          description: section.section_name,
          location: section.section_type,
        });
      }
      for (const el of section.elements) {
        if (el.bounding_box) {
          items.push({
            id: el.element_id,
            page: section.page || 1,
            boundingBox: el.bounding_box,
            severity: selectedElementId === el.element_id || hoveredId === el.element_id ? "high" : "medium",
            description: el.element_name,
            location: el.element_type,
          });
        }
      }
    }
    return items;
  }, [sections, selectedSectionId, selectedElementId, hoveredId]);

  const highlightedId = selectedSectionId || selectedElementId || hoveredId;

  const sectionTypeColors: Record<string, string> = {
    header: "bg-primary/10 text-primary border-primary/20",
    table: "bg-accent/10 text-accent border-accent/20",
    text_block: "bg-muted text-muted-foreground border-border",
    footer: "bg-muted text-muted-foreground border-border",
    summary: "bg-success/10 text-success border-success/20",
    form_field: "bg-warning/10 text-warning border-warning/20",
    chart: "bg-primary/10 text-primary border-primary/20",
    signature_block: "bg-muted text-muted-foreground border-border",
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left: Section list */}
      <ResizablePanel defaultSize={45} minSize={30}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Sections & Elements</h3>
              <Badge variant="secondary" className="text-xs">{sections.length}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="px-4 py-2 bg-primary/5 border-b border-border">
              <p className="text-xs text-muted-foreground">{summary}</p>
            </div>
          )}

          {/* Section list */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {sections.map(section => (
                <motion.div
                  key={section.section_id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all",
                    selectedSectionId === section.section_id ? "border-primary shadow-md" : "border-border",
                    section.verified ? "bg-success/5" : "bg-card"
                  )}
                  onMouseEnter={() => setHoveredId(section.section_id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Section header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      toggleSection(section.section_id);
                      setSelectedSectionId(section.section_id === selectedSectionId ? null : section.section_id);
                      setSelectedElementId(null);
                    }}
                  >
                    {expandedSections.has(section.section_id) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <Checkbox
                      checked={section.verified}
                      onCheckedChange={() => toggleVerified(section.section_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">
                      {section.section_name}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", sectionTypeColors[section.section_type])}>
                      {section.section_type.replace("_", " ")}
                    </Badge>
                    {section.bounding_box && (
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSection(section.section_id); }}
                      className="p-0.5 hover:bg-destructive/10 rounded"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>

                  {/* Elements */}
                  <AnimatePresence>
                    {expandedSections.has(section.section_id) && section.elements.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                      >
                        <div className="px-3 py-1 space-y-1">
                          {section.elements.map(el => (
                            <div
                              key={el.element_id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors",
                                selectedElementId === el.element_id ? "bg-primary/10" : "hover:bg-muted/50"
                              )}
                              onClick={() => {
                                setSelectedElementId(el.element_id === selectedElementId ? null : el.element_id);
                                setSelectedSectionId(null);
                              }}
                              onMouseEnter={() => setHoveredId(el.element_id)}
                              onMouseLeave={() => setHoveredId(null)}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                              <span className="font-medium text-foreground flex-1 truncate">{el.element_name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {el.element_type}
                              </Badge>
                              {el.bounding_box && <MapPin className="h-2.5 w-2.5 text-primary/50" />}
                              <button
                                onClick={(e) => { e.stopPropagation(); removeElement(section.section_id, el.element_id); }}
                                className="p-0.5 hover:bg-destructive/10 rounded"
                              >
                                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{sections.filter(s => s.verified).length} / {sections.length} verified</span>
            </div>
            <Button
              className="w-full bg-gradient-primary hover:shadow-glow"
              onClick={onProceed}
            >
              Proceed to Rules
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right: Document preview */}
      <ResizablePanel defaultSize={55} minSize={30}>
        <div className="h-full flex flex-col bg-muted/10">
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Document Preview</span>
            {previewFile && (
              <span className="text-xs text-muted-foreground truncate">— {previewFile.name}</span>
            )}
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {previewFile?.file && previewFile.type === "application/pdf" ? (
              <PDFViewer
                file={previewFile.file}
                currentPage={1}
                onLoadSuccess={() => {}}
                exceptions={overlayExceptions as any}
                selectedExceptionId={highlightedId}
                onExceptionClick={(id) => {
                  const section = sections.find(s => s.section_id === id);
                  if (section) { setSelectedSectionId(id); setSelectedElementId(null); return; }
                  const el = sections.flatMap(s => s.elements).find(e => e.element_id === id);
                  if (el) { setSelectedElementId(id); setSelectedSectionId(null); }
                }}
              />
            ) : previewFile?.file && previewFile.type.startsWith("image/") ? (
              <ImageViewer
                file={previewFile.file}
                exceptions={overlayExceptions as any}
                selectedExceptionId={highlightedId}
                onExceptionClick={(id) => {
                  const section = sections.find(s => s.section_id === id);
                  if (section) { setSelectedSectionId(id); setSelectedElementId(null); return; }
                  setSelectedElementId(id); setSelectedSectionId(null);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Eye className="h-8 w-8" />
                <p className="text-sm">No document preview available</p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
