import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Search, Plus, Grid, List, Loader2, AlertCircle, 
  FileText, Copy, Archive, ChevronRight, Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTemplates, type Template, type TemplateStatus } from "@/hooks/useTemplates";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface TemplatesLibraryProps {
  onNavigate: (path: string) => void;
  onOpenTemplate: (templateId: string) => void;
}

const statusColors: Record<TemplateStatus, string> = {
  draft: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  pending_approval: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  archived: "bg-muted text-muted-foreground border-muted",
  rolled_back: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const statusLabels: Record<TemplateStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  archived: "Archived",
  rolled_back: "Rolled Back",
};

export function TemplatesLibrary({ onNavigate, onOpenTemplate }: TemplatesLibraryProps) {
  const { user } = useAuth();
  const { 
    templates, 
    isLoading, 
    error, 
    createTemplate, 
    duplicateTemplate, 
    archiveTemplate 
  } = useTemplates();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    use_case: "",
    client: "",
  });

  const statuses = ["all", "draft", "pending_approval", "approved", "archived"];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (template.use_case?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesStatus = 
      selectedStatus === "all" || template.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) return;
    
    await createTemplate.mutateAsync(newTemplate);
    setCreateDialogOpen(false);
    setNewTemplate({ name: "", description: "", use_case: "", client: "" });
  };

  const handleDuplicate = (template: Template) => {
    duplicateTemplate.mutate(template.id);
  };

  const handleArchive = (template: Template) => {
    if (confirm(`Are you sure you want to archive "${template.name}"?`)) {
      archiveTemplate.mutate(template.id);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Sign in required</h3>
        <p className="mt-1 text-muted-foreground text-center">
          Please sign in to view and manage templates
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Error loading templates</h3>
        <p className="mt-1 text-muted-foreground text-center">{error.message}</p>
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
            <h1 className="text-2xl font-bold text-foreground">Templates</h1>
            <p className="mt-1 text-muted-foreground">
              Manage rule collections for business use cases
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate("/builder")}>
              <Upload className="mr-2 h-4 w-4" />
              Import Template
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>
                    Create a new template to group related rules together
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Exception Checking - Trade Documents"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="use_case">Use Case</Label>
                    <Input
                      id="use_case"
                      placeholder="e.g., Exception Checking, Change Validation"
                      value={newTemplate.use_case}
                      onChange={(e) => setNewTemplate({ ...newTemplate, use_case: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Input
                      id="client"
                      placeholder="Client organization"
                      value={newTemplate.client}
                      onChange={(e) => setNewTemplate({ ...newTemplate, client: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this template validates..."
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={!newTemplate.name.trim() || createTemplate.isPending}
                  >
                    {createTemplate.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-transparent focus:border-primary"
          />
        </div>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px] bg-muted/50 border-transparent">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all" ? "All Statuses" : statusLabels[status as TemplateStatus]}
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
            Loading templates...
          </span>
        ) : (
          `Showing ${filteredTemplates.length} of ${templates.length} templates`
        )}
      </div>

      {/* Templates Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => onOpenTemplate(template.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        {template.name}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Actions</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onOpenTemplate(template.id)}>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        {template.status !== "archived" && (
                          <DropdownMenuItem 
                            onClick={() => handleArchive(template)}
                            className="text-destructive"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.description || "No description"}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className={statusColors[template.status]}>
                      {statusLabels[template.status]}
                    </Badge>
                    {template.use_case && (
                      <Badge variant="secondary">{template.use_case}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{template.active_version} • {template.rules_count || 0} rules</span>
                    <span>
                      {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card 
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => onOpenTemplate(template.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.use_case || "No use case"} • {template.rules_count || 0} rules
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={statusColors[template.status]}>
                      {statusLabels[template.status]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      v{template.active_version}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && filteredTemplates.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {templates.length === 0 ? "No templates yet" : "No templates found"}
          </h3>
          <p className="mt-1 text-muted-foreground">
            {templates.length === 0 
              ? "Create your first template to organize rules" 
              : "Try adjusting your search or filter criteria"
            }
          </p>
          {templates.length === 0 && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="mt-4 bg-gradient-primary hover:shadow-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Template
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
