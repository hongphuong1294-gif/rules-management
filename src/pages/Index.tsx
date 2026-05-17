import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/components/pages/Dashboard";
import { RulesLibrary } from "@/components/pages/RulesLibrary";
import { RuleBuilder } from "@/components/pages/RuleBuilder";
import { RuleTester } from "@/components/pages/RuleTester";
import { TemplatesLibrary } from "@/components/pages/TemplatesLibrary";
import { TemplateDetail } from "@/components/pages/TemplateDetail";
import type { Rule } from "@/hooks/useRules";

const pageConfig: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your rule management system" },
  "/rules": { title: "Rule Library", subtitle: "Manage and organize validation rules" },
  "/builder": { title: "Rule Builder", subtitle: "Import documents and rules for onboarding" },
  "/test": { title: "Rule Tester", subtitle: "Validate rules against documents" },
  "/templates": { title: "Templates", subtitle: "Manage rule collections for business use cases" },
  "/audit": { title: "Audit Log", subtitle: "View all system activities" },
  "/team": { title: "Team", subtitle: "Manage team members and permissions" },
  "/settings": { title: "Settings", subtitle: "Configure your workspace" },
};

const Index = () => {
  const [currentPath, setCurrentPath] = useState("/");
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    // Clear editing state when navigating away from builder
    if (path !== "/builder") {
      setEditingRule(null);
    }
    // Clear template selection when navigating away from templates
    if (path !== "/templates") {
      setSelectedTemplateId(null);
    }
    setCurrentPath(path);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setCurrentPath("/builder");
  };

  const handleOpenTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleBackFromTemplate = () => {
    setSelectedTemplateId(null);
  };

  const config = selectedTemplateId 
    ? { title: "Template Details", subtitle: "View and manage template configuration" }
    : pageConfig[currentPath] || pageConfig["/"];

  const renderPage = () => {
    switch (currentPath) {
      case "/":
        return <Dashboard onNavigate={handleNavigate} />;
      case "/rules":
        return <RulesLibrary onNavigate={handleNavigate} onEditRule={handleEditRule} />;
      case "/builder":
        return <RuleBuilder onNavigate={handleNavigate} editingRule={editingRule} onClearEdit={() => setEditingRule(null)} />;
      case "/test":
        return <RuleTester onNavigate={handleNavigate} />;
      case "/templates":
        if (selectedTemplateId) {
          return (
            <TemplateDetail 
              templateId={selectedTemplateId} 
              onBack={handleBackFromTemplate}
              onNavigate={handleNavigate}
            />
          );
        }
        return <TemplatesLibrary onNavigate={handleNavigate} onOpenTemplate={handleOpenTemplate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={config.title} subtitle={config.subtitle} />
        <main className="flex-1 overflow-hidden p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default Index;