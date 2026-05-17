import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Check, ChevronDown, ChevronRight, ChevronLeft,
  Eye, MapPin, X, AlertTriangle, Save, Loader2, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { PDFViewer } from "./PDFViewer";
import { ImageViewer } from "./ImageViewer";
import type { DocumentSection, ExtractedRule, UploadedFile, BoundingBox } from "./types";

interface RulesVerifyStepProps {
  rules: ExtractedRule[];
  sections: DocumentSection[];
  onRulesChange: (rules: ExtractedRule[]) => void;
  documentFiles: UploadedFile[];
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
  warnings?: string[];
}

const typeColors: Record<string, string> = {
  threshold: "bg-warning/10 text-warning border-warning/20",
  calculation: "bg-primary/10 text-primary border-primary/20",
  cross_table: "bg-accent/10 text-accent border-accent/20",
  data_presence: "bg-success/10 text-success border-success/20",
  pattern_match: "bg-destructive/10 text-destructive border-destructive/20",
  custom: "bg-muted text-muted-foreground border-border",
};

const statusIcons: Record<string, string> = {
  complete: "text-success",
  draft: "text-warning",
  ambiguous: "text-destructive",
};

export function RulesVerifyStep({
  rules, sections, onRulesChange, documentFiles, onSave, onBack, isSaving, warnings
}: RulesVerifyStepProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [selectedRuleCode, setSelectedRuleCode] = useState<string | null>(null);

  const previewFile = useMemo(() =>
    documentFiles.find(f => f.type === "application/pdf" || f.type.startsWith("image/")),
    [documentFiles]
  );

  const toggleExpanded = (code: string) => {
    const next = new Set(expandedRules);
    next.has(code) ? next.delete(code) : next.add(code);
    setExpandedRules(next);
  };

  const toggleVerified = (code: string) => {
    onRulesChange(rules.map(r =>
      r.rule_code === code ? { ...r, verified: !r.verified } : r
    ));
  };

  const removeRule = (code: string) => {
    onRulesChange(rules.filter(r => r.rule_code !== code));
  };

  // Build overlay boxes from sections mapped by selected rule
  const overlayExceptions = useMemo(() => {
    if (!selectedRuleCode) return [];
    const rule = rules.find(r => r.rule_code === selectedRuleCode);
    if (!rule) return [];

    const items: Array<{ id: string; page: number; boundingBox?: BoundingBox; severity: "high" | "medium" | "low"; description: string; location: string }> = [];
    
    const mappedSections = rule.mapped_sections || [];
    const mappedElements = rule.mapped_elements || [];

    for (const section of sections) {
      if (mappedSections.includes(section.section_id) && section.bounding_box) {
        items.push({
          id: section.section_id,
          page: section.page || 1,
          boundingBox: section.bounding_box,
          severity: "high",
          description: `${section.section_name} (${rule.name})`,
          location: section.section_type,
        });
      }
      for (const el of section.elements) {
        if (mappedElements.includes(el.element_id) && el.bounding_box) {
          items.push({
            id: el.element_id,
            page: section.page || 1,
            boundingBox: el.bounding_box,
            severity: "medium",
            description: `${el.element_name} → ${rule.name}`,
            location: el.element_type,
          });
        }
      }
    }
    return items;
  }, [selectedRuleCode, rules, sections]);

  const verifiedCount = rules.filter(r => r.verified).length;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left: Rules list */}
      <ResizablePanel defaultSize={45} minSize={30}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Extracted Rules</h3>
              <Badge variant="secondary" className="text-xs">{rules.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="px-4 py-2 bg-warning/5 border-b border-border space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rules list */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {rules.map(rule => {
                const isSelected = selectedRuleCode === rule.rule_code;
                const isExpanded = expandedRules.has(rule.rule_code);
                const mappedCount = (rule.mapped_sections?.length || 0) + (rule.mapped_elements?.length || 0);

                return (
                  <motion.div
                    key={rule.rule_code}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "border rounded-lg overflow-hidden transition-all",
                      isSelected ? "border-primary shadow-md" : "border-border",
                      rule.verified ? "bg-success/5" : "bg-card"
                    )}
                  >
                    {/* Rule header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedRuleCode(isSelected ? null : rule.rule_code);
                        if (!isExpanded) toggleExpanded(rule.rule_code);
                      }}
                    >
                      <button onClick={(e) => { e.stopPropagation(); toggleExpanded(rule.rule_code); }}>
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <Checkbox
                        checked={rule.verified}
                        onCheckedChange={() => toggleVerified(rule.rule_code)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{rule.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1">{rule.rule_code}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1", typeColors[rule.type])}>
                            {rule.type.replace("_", " ")}
                          </Badge>
                          {rule.status && rule.status !== "complete" && (
                            <Badge variant="outline" className={cn("text-[10px] px-1", 
                              rule.status === "ambiguous" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"
                            )}>
                              {rule.status}
                            </Badge>
                          )}
                          {mappedCount > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {mappedCount} mapped
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeRule(rule.rule_code); }}
                        className="p-0.5 hover:bg-destructive/10 rounded"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="px-3 py-2 space-y-1.5 text-xs">
                            <div>
                              <span className="text-muted-foreground">Description: </span>
                              <span className="text-foreground">{rule.description}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Trigger: </span>
                              <span className="text-foreground">{rule.trigger_condition}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Action: </span>
                              <span className="text-foreground">{rule.action}</span>
                            </div>
                            {rule.scope && (
                              <div>
                                <span className="text-muted-foreground">Scope: </span>
                                <span className="text-foreground">{rule.scope}</span>
                              </div>
                            )}
                            {rule.category && (
                              <div>
                                <span className="text-muted-foreground">Category: </span>
                                <span className="text-foreground">{rule.category}</span>
                              </div>
                            )}
                            {rule.mapped_sections && rule.mapped_sections.length > 0 && (
                              <div>
                                <span className="text-muted-foreground">Mapped sections: </span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {rule.mapped_sections.map(sid => {
                                    const sec = sections.find(s => s.section_id === sid);
                                    return (
                                      <Badge key={sid} variant="outline" className="text-[10px]">
                                        {sec?.section_name || sid}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{verifiedCount} / {rules.length} verified</span>
              {rules.some(r => r.status === "ambiguous") && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Has ambiguous rules
                </span>
              )}
            </div>
            <Button
              className="w-full bg-gradient-primary hover:shadow-glow"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving rules...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Rules ({rules.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right: Document preview with traceability */}
      <ResizablePanel defaultSize={55} minSize={30}>
        <div className="h-full flex flex-col bg-muted/10">
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Traceability View</span>
            {selectedRuleCode && (
              <Badge variant="outline" className="text-xs">
                Showing: {rules.find(r => r.rule_code === selectedRuleCode)?.name}
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {previewFile?.file && previewFile.type === "application/pdf" ? (
              <PDFViewer
                file={previewFile.file}
                currentPage={1}
                onLoadSuccess={() => {}}
                exceptions={overlayExceptions as any}
                selectedExceptionId={null}
                onExceptionClick={() => {}}
              />
            ) : previewFile?.file && previewFile.type.startsWith("image/") ? (
              <ImageViewer
                file={previewFile.file}
                exceptions={overlayExceptions as any}
                selectedExceptionId={null}
                onExceptionClick={() => {}}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Eye className="h-8 w-8" />
                <p className="text-sm">Select a rule to see traceability on the document</p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
