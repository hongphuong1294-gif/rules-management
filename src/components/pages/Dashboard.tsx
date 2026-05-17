import { motion } from "framer-motion";
import { Camera, ClipboardCheck, FileCheck, BookOpen, PlusCircle, Activity } from "lucide-react";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface DashboardProps {
  onNavigate: (path: string) => void;
}

const modules = [
  {
    icon: Camera,
    title: "Fulfill.AI",
    description: "Match photos to job documents using AI-powered OCR",
    features: ["Instant photo analysis", "94% average accuracy", "Automated email approval"],
    actionLabel: "Start Matching",
    href: "/fulfill",
  },
  {
    icon: ClipboardCheck,
    title: "Client Onboarding",
    description: "Verify changelog implementations with AI validation",
    features: ["Automated test cases setup", "Bounding box annotations", "85% compliance rate"],
    actionLabel: "Start Onboarding",
    href: "/onboarding",
  },
  {
    icon: FileCheck,
    title: "Pre-Production Proofing",
    description: "Verify changelog implementations with AI validation",
    features: ["Automated change detection", "Bounding box annotations", "Version comparison"],
    actionLabel: "Start Validation",
    href: "/proofing",
  },
];

const stats = [
  { icon: BookOpen, label: "Total Rules", value: 127, change: 12, changeLabel: "vs last month" },
  { icon: FileCheck, label: "Tests Run Today", value: 48, change: 23, changeLabel: "vs yesterday" },
  { icon: Activity, label: "Compliance Rate", value: "94.2%", change: 2.1, changeLabel: "improvement" },
  { icon: PlusCircle, label: "Rules Created", value: 8, change: -5, changeLabel: "this week" },
];

export function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="h-full overflow-y-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 rounded-2xl bg-gradient-hero p-8 text-primary-foreground"
      >
        <h1 className="text-3xl font-bold">Welcome back, Document Analyst</h1>
        <p className="mt-2 text-lg opacity-90">Your AI agents are ready to assist</p>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => onNavigate("/builder")}
            className="rounded-xl bg-primary-foreground px-6 py-2.5 font-semibold text-primary shadow-lg transition-transform hover:scale-105"
          >
            Create New Rule
          </button>
          <button
            onClick={() => onNavigate("/rules")}
            className="rounded-xl border-2 border-primary-foreground/30 bg-transparent px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:border-primary-foreground/60"
          >
            View Rule Library
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            changeLabel={stat.changeLabel}
            index={index}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Module Cards */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">AI Modules</h2>
            <button className="text-sm text-primary hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <ModuleCard
                key={module.title}
                icon={module.icon}
                title={module.title}
                description={module.description}
                features={module.features}
                actionLabel={module.actionLabel}
                onAction={() => onNavigate(module.href)}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}