import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Edit2, Plus, Trash2, Play, CheckCircle2, 
  XCircle, AlertTriangle, Clock, History, FileText,
  Loader2, MoreVertical, Save, Send, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTemplates, type TemplateStatus, type TemplateRule } from "@/hooks/useTemplates";
import { useRules, type Rule } from "@/hooks/useRules";
import { formatDistanceToNow, format } from "date-fns";

interface TemplateDetailProps {
  templateId: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

const statusColors: Record<TemplateStatus, string> = {
  draft: "bg-warning/10 text-warning border-warning/20",
  pending_approval: "bg-primary/10 text-primary border-primary/20",
  approved: "bg-accent/10 text-accent-foreground border-accent/20",
  archived: "bg-muted text-muted-foreground border-muted",
  rolled_back: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<TemplateStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  archived: "Archived",
  rolled_back: "Rolled Back",
};

const testResultIcons = {
  passed: <CheckCircle2 className="h-4 w-4 text-accent-foreground" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  untested: <AlertTriangle className="h-4 w-4 text-warning" />,
};

export function TemplateDetail({ templateId, onBack, onNavigate }: TemplateDetailProps) {
  const { 
    useTemplate, 
    useTemplateVersions, 
    useTemplateAuditLogs,
    updateTemplate, 
    addRuleToTemplate, 
    removeRuleFromTemplate,
    submitForApproval,
    approveTemplate,
  } = useTemplates();
  const { rules } = useRules();
  
  const { data: templateData, isLoading } = useTemplate(templateId);
  const { data: versions } = useTemplateVersions(templateId);
  const { data: auditLogs } = useTemplateAuditLogs(templateId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    use_case: "",
    client: "",
    correspondent: "",
    scope: "",
  });
  const [addRuleDialogOpen, setAddRuleDialogOpen] = useState(false);
  const [selectedRuleToAdd, setSelectedRuleToAdd] = useState<string | null>(null);

  const template = templateData?.template;
  const templateRules = templateData?.rules || [];

  // Rules not already in template
  const availableRules = rules.filter(
    r => !templateRules.some(tr => tr.rule_id === r.id)
  );

  const handleStartEdit = () => {
    if (template) {
      setEditForm({
        name: template.name,
        description: template.description || "",
        use_case: template.use_case || "",
        client: template.client || "",
        correspondent: template.correspondent || "",
        scope: template.scope || "",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!template) return;
    await updateTemplate.mutateAsync({ id: template.id, ...editForm });
    setIsEditing(false);
  };

  const handleAddRule = async () => {
    if (!selectedRuleToAdd || !template) return;
    await addRuleToTemplate.mutateAsync({ 
      templateId: template.id, 
      ruleId: selectedRuleToAdd 
    });
    setAddRuleDialogOpen(false);
    setSelectedRuleToAdd(null);
  };

  const handleRemoveRule = async (ruleId: string) => {
    if (!template) return;
    if (confirm("Remove this rule from the template?")) {
      await removeRuleFromTemplate.mutateAsync({ 
        templateId: template.id, 
        ruleId 
      });
    }
  };

  const handleSubmitForApproval = () => {
    if (template) {
      submitForApproval.mutate(template.id);
    }
  };

  const handleApprove = () => {
    if (template) {
      approveTemplate.mutate(template.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Template not found</h3>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
      </div>
    );
  }

  const canEdit = template.status === "draft" || template.status === "rolled_back";
  const canSubmit = template.status === "draft" && templateRules.length > 0;
  const canApprove = template.status === "pending_approval";
  const hasUntestedRules = templateRules.some(r => r.test_result !== "passed");

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-bold h-auto py-1"
              />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[template.status]}>
              {statusLabels[template.status]}
            </Badge>
            <Badge variant="secondary">v{template.active_version}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {template.client && <span>Client: {template.client}</span>}
            {template.use_case && <span>• {template.use_case}</span>}
            <span>• {templateRules.length} rules</span>
            <span>• Updated {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateTemplate.isPending}>
                  {updateTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button variant="outline" onClick={handleStartEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
                {canSubmit && (
                  <Button 
                    variant="outline" 
                    onClick={handleSubmitForApproval}
                    disabled={submitForApproval.isPending || hasUntestedRules}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit for Approval
                  </Button>
                )}
                {canApprove && (
                  <Button 
                    onClick={handleApprove}
                    disabled={approveTemplate.isPending}
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {hasUntestedRules && canSubmit && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm text-warning">
              Some rules have not been tested. All rules must pass testing before approval.
            </span>
          </div>
        )}
      </motion.div>

      {/* Content Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Rules ({templateRules.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rules in Template</h2>
            {canEdit && (
              <Dialog open={addRuleDialogOpen} onOpenChange={setAddRuleDialogOpen}>
                <Button onClick={() => setAddRuleDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Rule to Template</DialogTitle>
                    <DialogDescription>
                      Select a rule from your library to add to this template
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 p-1">
                      {availableRules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No available rules to add</p>
                          <Button 
                            variant="link" 
                            onClick={() => {
                              setAddRuleDialogOpen(false);
                              onNavigate("/builder");
                            }}
                          >
                            Create a new rule
                          </Button>
                        </div>
                      ) : (
                        availableRules.map((rule) => (
                          <div
                            key={rule.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedRuleToAdd === rule.id 
                                ? "border-primary bg-primary/5" 
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedRuleToAdd(rule.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{rule.name}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {rule.description || "No description"}
                                </p>
                              </div>
                              <Badge variant="secondary">{rule.category || rule.type}</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddRule}
                      disabled={!selectedRuleToAdd || addRuleToTemplate.isPending}
                    >
                      {addRuleToTemplate.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Rule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {templateRules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No rules yet</h3>
                <p className="text-muted-foreground mt-1">
                  Add rules from your library to build this template
                </p>
                {canEdit && (
                  <Button onClick={() => setAddRuleDialogOpen(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Rule
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Test Result</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateRules.map((templateRule) => (
                    <TableRow key={templateRule.id}>
                      <TableCell className="font-mono text-xs">
                        {templateRule.rule?.rule_code || templateRule.rule_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{templateRule.rule?.name || "Unknown Rule"}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {templateRule.rule?.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{templateRule.rule?.category || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{templateRule.rule?.status || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {testResultIcons[templateRule.test_result || "untested"]}
                          <span className="text-sm capitalize">
                            {templateRule.test_result || "Untested"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onNavigate("/test")}>
                              <Play className="mr-2 h-4 w-4" />
                              Test Rule
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem 
                                onClick={() => handleRemoveRule(templateRule.rule_id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Use Case</Label>
                      <Input
                        value={editForm.use_case}
                        onChange={(e) => setEditForm({ ...editForm, use_case: e.target.value })}
                        placeholder="e.g., Exception Checking"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Input
                        value={editForm.client}
                        onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
                        placeholder="Client organization"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Correspondent</Label>
                      <Input
                        value={editForm.correspondent}
                        onChange={(e) => setEditForm({ ...editForm, correspondent: e.target.value })}
                        placeholder="Correspondent (optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scope (Document Types)</Label>
                      <Input
                        value={editForm.scope}
                        onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })}
                        placeholder="e.g., Trade Documents, Invoices"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="What this template validates..."
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-muted-foreground">Use Case</Label>
                    <p className="mt-1">{template.use_case || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Client</Label>
                    <p className="mt-1">{template.client || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Correspondent</Label>
                    <p className="mt-1">{template.correspondent || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Scope</Label>
                    <p className="mt-1">{template.scope || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{template.description || "No description provided"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Version History Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versions?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No version history</p>
              ) : (
                <div className="space-y-4">
                  {versions?.map((version) => (
                    <div 
                      key={version.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">v{version.version_number}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{version.change_summary || "No summary"}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(version.created_at), "PPpp")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No audit logs</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs?.map((log) => (
                    <div 
                      key={log.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.object_type} • {format(new Date(log.created_at), "PPpp")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
