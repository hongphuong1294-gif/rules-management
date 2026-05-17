import { motion } from "framer-motion";
import { MoreHorizontal, Play, Edit2, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Rule, RuleStatus } from "@/hooks/useRules";

interface RuleCardProps {
  rule: Rule;
  index?: number;
  onTest?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const statusConfig: Record<RuleStatus | "testing", { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
  testing: { label: "Testing", className: "bg-warning/10 text-warning border-warning/20" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

const typeLabels: Record<string, string> = {
  threshold: "Threshold",
  calculation: "Calculation",
  cross_table: "Cross-table",
  data_presence: "Data Presence",
  pattern_match: "Pattern Match",
  custom: "Custom",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function RuleCard({ rule, index = 0, onTest, onEdit, onDelete, onDuplicate }: RuleCardProps) {
  const status = statusConfig[rule.status] || statusConfig.draft;
  const ruleCode = rule.rule_code || rule.id.slice(0, 8).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:border-primary/30 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-primary">{ruleCode}</span>
            <Badge variant="outline" className={cn("text-xs", status.className)}>
              {status.label}
            </Badge>
          </div>
          <h4 className="font-semibold text-foreground truncate">{rule.name}</h4>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {rule.description || "No description provided"}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onTest} className="gap-2">
              <Play className="h-4 w-4" />
              Run Test
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Rule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {rule.category && (
            <span className="rounded-md bg-muted px-2 py-1">{rule.category}</span>
          )}
          <span className="rounded-md bg-muted px-2 py-1">
            {typeLabels[rule.type] || rule.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">v{rule.version}</span>
          <span className="text-muted-foreground">{formatTimeAgo(rule.updated_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}
