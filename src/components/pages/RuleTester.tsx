import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play,
  Eye,
  Download,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RuleTesterProps {
  onNavigate: (path: string) => void;
}

interface TestResult {
  id: string;
  ruleName: string;
  ruleId: string;
  status: "passed" | "failed" | "warning";
  message: string;
  page?: number;
  details?: string;
}

const mockResults: TestResult[] = [
  {
    id: "1",
    ruleName: "Table Column Totals",
    ruleId: "LPL-01-CAL01",
    status: "passed",
    message: "All column totals match calculated sums",
    page: 3,
  },
  {
    id: "2",
    ruleName: "Cross-table Summary Consistency",
    ruleId: "LPL-01-CAL03",
    status: "failed",
    message: "Total Subtractions mismatch: Expected $55,569.65, Found $55,615.65",
    page: 8,
    details: "Discrepancy of $46.00 between Activity Summary and Portfolio Summary tables",
  },
  {
    id: "3",
    ruleName: "Customer Information Completeness",
    ruleId: "LPL-01-FM03",
    status: "passed",
    message: "All required customer fields present",
    page: 1,
  },
  {
    id: "4",
    ruleName: "Element Overlap Detection",
    ruleId: "LPL-01-FM01",
    status: "warning",
    message: "Potential overlap detected in table footer region",
    page: 12,
    details: "Visual elements may overlap at 90% zoom level",
  },
  {
    id: "5",
    ruleName: "Table Row Consistency",
    ruleId: "LPL-01-CAL02",
    status: "passed",
    message: "All row calculations verified",
    page: 8,
  },
];

export function RuleTester({ onNavigate }: RuleTesterProps) {
  const [isUploaded, setIsUploaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);

  const handleUpload = () => {
    setIsUploaded(true);
  };

  const runTests = () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          setResults(mockResults);
          return 100;
        }
        return prev + 20;
      });
    }, 500);
  };

  const passedCount = results.filter((r) => r.status === "passed").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const warningCount = results.filter((r) => r.status === "warning").length;

  const statusIcons = {
    passed: <CheckCircle className="h-5 w-5 text-success" />,
    failed: <XCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  };

  return (
    <div className="flex h-full gap-6">
      {/* Test Configuration Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[400px] shrink-0 rounded-2xl border border-border bg-card p-6 shadow-card"
      >
        <h2 className="mb-6 text-xl font-semibold text-foreground">Test Configuration</h2>

        {/* Upload Zone */}
        <div
          onClick={handleUpload}
          className={cn(
            "mb-6 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
            isUploaded
              ? "border-success bg-success/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {isUploaded ? (
            <div className="flex flex-col items-center">
              <div className="mb-3 rounded-full bg-success/10 p-3">
                <FileText className="h-8 w-8 text-success" />
              </div>
              <p className="font-medium text-foreground">LPL_Statement_Oct2024.pdf</p>
              <p className="mt-1 text-sm text-muted-foreground">12 pages • 2.4 MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Upload Test Document</p>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF or Image files supported
              </p>
            </div>
          )}
        </div>

        {/* Rule Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Rules to Test
          </label>
          <div className="space-y-2">
            {["LPL-01-CAL01", "LPL-01-CAL02", "LPL-01-CAL03", "LPL-01-FM01", "LPL-01-FM03"].map(
              (ruleId) => (
                <label
                  key={ruleId}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="font-mono text-sm text-foreground">{ruleId}</span>
                </label>
              )
            )}
          </div>
        </div>

        {/* Run Button */}
        <Button
          onClick={runTests}
          disabled={!isUploaded || isRunning}
          className="w-full bg-gradient-primary hover:shadow-glow"
        >
          {isRunning ? (
            <>Running Tests...</>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Validation
            </>
          )}
        </Button>

        {/* Progress */}
        {isRunning && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Testing rule {Math.ceil(progress / 20)} of 5...
            </p>
          </div>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div className="mt-6 rounded-xl border border-border p-4">
            <h3 className="mb-3 font-semibold text-foreground">Test Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-success/10 p-2">
                <p className="text-2xl font-bold text-success">{passedCount}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2">
                <p className="text-2xl font-bold text-destructive">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-2">
                <p className="text-2xl font-bold text-warning">{warningCount}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Results Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 rounded-2xl border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Test Results</h2>
          {results.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View Document
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          )}
        </div>

        <div className="h-[calc(100%-65px)] overflow-y-auto p-4">
          {results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No Results Yet</h3>
              <p className="mt-1 text-muted-foreground">
                Upload a document and run validation to see results
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedResult(result)}
                  className={cn(
                    "flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all hover:shadow-md",
                    selectedResult?.id === result.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {statusIcons[result.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary">{result.ruleId}</span>
                      <span className="text-xs text-muted-foreground">• Page {result.page}</span>
                    </div>
                    <h4 className="font-medium text-foreground">{result.ruleName}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                        {result.details}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}