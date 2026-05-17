import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useRules, type CreateRuleInput, type RuleType } from "@/hooks/useRules";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ParsedRule {
  id: string;
  rule_id: string;
  name: string;
  description: string;
  type: RuleType;
  category: string;
  subcategory?: string;
  client?: string;
  document_type?: string;
  trigger_condition?: string;
  scope?: string;
  elements?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  image_mode_prompt?: string;
  docling_mode_prompt?: string;
  docling_table_mode_prompt?: string;
  checks?: ParsedCheck[];
}

interface ParsedCheck {
  check_id: string;
  mode: string;
  agent_fallback: boolean;
  target_elements: string;
  standardization_columns?: string;
  formulas?: string;
  tolerance?: number;
  ai_reasoning_one_shot?: string;
}

interface ExcelRuleImporterProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function ExcelRuleImporter({ onClose, onImportComplete }: ExcelRuleImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRules, setParsedRules] = useState<ParsedRule[]>([]);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const { createRule } = useRules();
  const { user } = useAuth();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setParseError(null);
    setParsedRules([]);
    setSelectedRules(new Set());

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      
      // Parse the Excel structure based on the template
      const rules = parseExcelWorkbook(workbook);
      setParsedRules(rules);
      
      // Select all rules by default
      setSelectedRules(new Set(rules.map(r => r.id)));
    } catch (error) {
      console.error("Failed to parse Excel file:", error);
      setParseError("Failed to parse Excel file. Please ensure it follows the expected template format.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const parseExcelWorkbook = (workbook: XLSX.WorkBook): ParsedRule[] => {
    const rules: ParsedRule[] = [];
    const ruleMap = new Map<string, ParsedRule>();

    // Try to find the main data sheet (usually Sheet3 or "document_validation_checks")
    let dataSheet: XLSX.WorkSheet | null = null;
    let summarySheet: XLSX.WorkSheet | null = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
      
      // Check if this sheet has the detailed rule data (with check_id column)
      if (jsonData.length > 1) {
        const headers = jsonData[0] as string[];
        if (headers.some(h => h?.toString().includes("check_id"))) {
          dataSheet = sheet;
        } else if (headers.some(h => h?.toString().includes("Rule_ID"))) {
          summarySheet = sheet;
        }
      }
    }

    // Parse the detailed data sheet
    if (dataSheet) {
      const jsonData = XLSX.utils.sheet_to_json(dataSheet) as Record<string, unknown>[];
      
      for (const row of jsonData) {
        const ruleId = String(row["rule_id"] || "");
        if (!ruleId) continue;

        // Get or create the rule
        if (!ruleMap.has(ruleId)) {
          const rule: ParsedRule = {
            id: `rule-${ruleId}-${Date.now()}`,
            rule_id: ruleId,
            name: String(row["verification_type"] || ruleId),
            description: String(row["principle"] || "").slice(0, 500),
            type: mapValidationCategoryToType(String(row["validation_category"] || "")),
            category: String(row["validation_category"] || ""),
            subcategory: String(row["verification_type"] || ""),
            client: String(row["client"] || ""),
            document_type: String(row["document_type"] || ""),
            trigger_condition: String(row["principle"] || ""),
            checks: [],
          };
          ruleMap.set(ruleId, rule);
        }

        // Add the check to the rule
        const rule = ruleMap.get(ruleId)!;
        const check: ParsedCheck = {
          check_id: String(row["check_id"] || ""),
          mode: String(row["mode"] || "agentic"),
          agent_fallback: row["agent_fallback"] === "TRUE" || row["agent_fallback"] === true,
          target_elements: String(row["target_elements"] || ""),
          standardization_columns: String(row["standardization_columns"] || ""),
          formulas: String(row["formulas"] || ""),
          tolerance: parseFloat(String(row["tolerance"] || "0")) || 0,
          ai_reasoning_one_shot: String(row["ai_reasoning_one_shot"] || ""),
        };
        rule.checks?.push(check);
      }

      rules.push(...ruleMap.values());
    } 
    // Fallback to summary sheet if no detailed data
    else if (summarySheet) {
      const jsonData = XLSX.utils.sheet_to_json(summarySheet) as Record<string, unknown>[];
      
      for (const row of jsonData) {
        const ruleId = String(row["Rule_ID"] || row["rule_id"] || "");
        if (!ruleId) continue;

        const rule: ParsedRule = {
          id: `rule-${ruleId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          rule_id: ruleId,
          name: String(row["Verification Type"] || row["verification_type"] || ruleId),
          description: `${row["Verification Category"] || row["validation_category"] || ""} - ${row["Verification Type"] || row["verification_type"] || ""}`,
          type: mapValidationCategoryToType(String(row["Verification Category"] || row["validation_category"] || "")),
          category: String(row["Verification Category"] || row["validation_category"] || ""),
          subcategory: String(row["Verification Type"] || row["verification_type"] || ""),
          client: String(row["Client"] || row["client"] || ""),
          document_type: String(row["Document"] || row["document_type"] || ""),
        };
        rules.push(rule);
      }
    }

    return rules;
  };

  const mapValidationCategoryToType = (category: string): RuleType => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("calculation")) return "calculation";
    if (lowerCategory.includes("cross") || lowerCategory.includes("table")) return "cross_table";
    if (lowerCategory.includes("pattern")) return "pattern_match";
    if (lowerCategory.includes("presence") || lowerCategory.includes("data")) return "data_presence";
    if (lowerCategory.includes("threshold")) return "threshold";
    return "custom";
  };

  const toggleRuleSelection = (ruleId: string) => {
    const newSelected = new Set(selectedRules);
    if (newSelected.has(ruleId)) {
      newSelected.delete(ruleId);
    } else {
      newSelected.add(ruleId);
    }
    setSelectedRules(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRules.size === parsedRules.length) {
      setSelectedRules(new Set());
    } else {
      setSelectedRules(new Set(parsedRules.map(r => r.id)));
    }
  };

  const toggleRuleExpansion = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const handleImport = async () => {
    if (!user) {
      toast.error("Please sign in to import rules");
      return;
    }

    if (selectedRules.size === 0) {
      toast.error("Please select at least one rule to import");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    const rulesToImport = parsedRules.filter(r => selectedRules.has(r.id));

    for (const rule of rulesToImport) {
      try {
        const ruleInput: CreateRuleInput = {
          name: rule.name,
          description: rule.description,
          type: rule.type,
          rule_code: rule.rule_id,
          category: rule.category,
          subcategory: rule.subcategory,
          trigger_condition: rule.trigger_condition,
          scope: rule.document_type,
          status: "draft",
          elements: {
            client: rule.client,
            document_type: rule.document_type,
            checks: rule.checks || [],
          },
          parameters: {
            imported_from: "excel",
            import_date: new Date().toISOString(),
          },
        };

        await createRule.mutateAsync(ruleInput);
        successCount++;
      } catch (error) {
        console.error(`Failed to import rule ${rule.rule_id}:`, error);
        errorCount++;
      }
    }

    setIsImporting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} rules`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} rules`);
    }

    if (successCount > 0) {
      onImportComplete();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-primary p-2">
            <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Import Rules from Excel</h2>
            <p className="text-xs text-muted-foreground">
              Upload an Excel template to bulk import rules
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {!file ? (
          // File Upload Zone
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <span className="text-sm font-medium text-foreground">
              Drop Excel file here or click to browse
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Supports .xlsx and .xls files
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : isLoading ? (
          // Loading State
          <div className="flex flex-col items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <span className="text-sm text-muted-foreground">Parsing Excel file...</span>
          </div>
        ) : parseError ? (
          // Error State
          <div className="flex flex-col items-center justify-center h-48">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <span className="text-sm text-destructive text-center">{parseError}</span>
            <Button variant="outline" className="mt-4" onClick={() => setFile(null)}>
              Try Another File
            </Button>
          </div>
        ) : (
          // Rules List
          <div className="flex flex-col h-full">
            {/* File Info & Select All */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">{parsedRules.length} rules found</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedRules.size === parsedRules.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
            </div>

            {/* Rules ScrollArea */}
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-2">
                <AnimatePresence>
                  {parsedRules.map((rule) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-border rounded-lg overflow-hidden bg-card"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                          selectedRules.has(rule.id) ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleRuleSelection(rule.id)}
                      >
                        <Checkbox
                          checked={selectedRules.has(rule.id)}
                          onCheckedChange={() => toggleRuleSelection(rule.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <button
                          className="p-1 hover:bg-muted rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRuleExpansion(rule.id);
                          }}
                        >
                          {expandedRules.has(rule.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{rule.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {rule.rule_id}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className="text-xs capitalize"
                            >
                              {rule.type.replace("_", " ")}
                            </Badge>
                            {rule.client && (
                              <span className="text-xs text-muted-foreground">
                                {rule.client}
                              </span>
                            )}
                            {rule.checks && rule.checks.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                • {rule.checks.length} checks
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedRules.has(rule.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border"
                          >
                            <div className="px-4 py-3 text-xs space-y-2 bg-muted/30">
                              <div>
                                <span className="font-medium text-muted-foreground">Category: </span>
                                <span>{rule.category}</span>
                              </div>
                              {rule.document_type && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Document: </span>
                                  <span>{rule.document_type}</span>
                                </div>
                              )}
                              {rule.description && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Description: </span>
                                  <span className="text-muted-foreground">{rule.description.slice(0, 200)}...</span>
                                </div>
                              )}
                              {rule.checks && rule.checks.length > 0 && (
                                <div className="mt-2">
                                  <span className="font-medium text-muted-foreground">Checks:</span>
                                  <div className="mt-1 space-y-1 pl-2">
                                    {rule.checks.slice(0, 3).map((check, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{check.check_id}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {check.mode}
                                        </Badge>
                                        <span className="truncate text-muted-foreground">
                                          {check.target_elements}
                                        </span>
                                      </div>
                                    ))}
                                    {rule.checks.length > 3 && (
                                      <span className="text-muted-foreground">
                                        +{rule.checks.length - 3} more checks
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedRules.size > 0 && (
            <span>{selectedRules.size} rules selected</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedRules.size === 0}
            className="bg-gradient-primary hover:shadow-glow"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Import {selectedRules.size > 0 ? `${selectedRules.size} Rules` : "Rules"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
