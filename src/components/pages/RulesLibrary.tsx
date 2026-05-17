import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Plus, Grid, List, SlidersHorizontal, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RuleCard } from "@/components/rules/RuleCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRules, type RuleStatus } from "@/hooks/useRules";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import type { Rule } from "@/hooks/useRules";

interface RulesLibraryProps {
  onNavigate: (path: string) => void;
  onEditRule: (rule: Rule) => void;
}

const statuses = ["All Statuses", "Active", "Draft", "Inactive", "Archived"];

export function RulesLibrary({ onNavigate, onEditRule }: RulesLibraryProps) {
  const { user } = useAuth();
  const { rules, categories, isLoading, error, deleteRule, createRule } = useRules();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const allCategories = ["All Categories", ...categories];

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = 
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rule.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (rule.rule_code?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      selectedCategory === "All Categories" || rule.category === selectedCategory;
    const matchesStatus = 
      selectedStatus === "All Statuses" || 
      rule.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteRule.mutate(id);
    }
  };

  const handleDuplicate = async (rule: typeof rules[0]) => {
    createRule.mutate({
      name: `${rule.name} (Copy)`,
      description: rule.description || undefined,
      type: rule.type,
      config: rule.config as Record<string, unknown> || undefined,
      trigger_condition: rule.trigger_condition || undefined,
      scope: rule.scope || undefined,
      action: rule.action || undefined,
      status: "draft" as RuleStatus,
      category: rule.category || undefined,
      subcategory: rule.subcategory || undefined,
      elements: rule.elements as Record<string, unknown> || undefined,
      parameters: rule.parameters as Record<string, unknown> || undefined,
      image_mode_prompt: rule.image_mode_prompt || undefined,
      docling_mode_prompt: rule.docling_mode_prompt || undefined,
      docling_table_mode_prompt: rule.docling_table_mode_prompt || undefined,
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Sign in required</h3>
        <p className="mt-1 text-muted-foreground text-center">
          Please sign in to view and manage your rules
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Error loading rules</h3>
        <p className="mt-1 text-muted-foreground text-center">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rule Library</h1>
            <p className="mt-1 text-muted-foreground">
              Manage and organize your validation rules
            </p>
          </div>
          <Button
            onClick={() => onNavigate("/builder")}
            className="bg-gradient-primary hover:shadow-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search rules by name, ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-transparent focus:border-primary"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] bg-muted/50 border-transparent">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px] bg-muted/50 border-transparent">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border border-border p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rules...
          </span>
        ) : (
          `Showing ${filteredRules.length} of ${rules.length} rules`
        )}
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" 
          : "space-y-3"
        }>
          {filteredRules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              index={index}
              onTest={() => onNavigate("/test")}
              onEdit={() => onEditRule(rule)}
              onDelete={() => handleDelete(rule.id)}
              onDuplicate={() => handleDuplicate(rule)}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredRules.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {rules.length === 0 ? "No rules yet" : "No rules found"}
          </h3>
          <p className="mt-1 text-muted-foreground">
            {rules.length === 0 
              ? "Create your first rule using the AI Rule Builder" 
              : "Try adjusting your search or filter criteria"
            }
          </p>
          {rules.length === 0 && (
            <Button
              onClick={() => onNavigate("/builder")}
              className="mt-4 bg-gradient-primary hover:shadow-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Rule
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
