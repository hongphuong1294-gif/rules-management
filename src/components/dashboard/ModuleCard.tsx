import { motion } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  actionLabel: string;
  onAction: () => void;
  variant?: "default" | "featured";
  index?: number;
}

export function ModuleCard({
  icon: Icon,
  title,
  description,
  features,
  actionLabel,
  onAction,
  variant = "default",
  index = 0,
}: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex flex-col rounded-2xl border-2 bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover",
        variant === "featured" ? "border-primary/30" : "border-border"
      )}
    >
      {/* Icon */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-md">
        <Icon className="h-7 w-7 text-primary-foreground" />
      </div>

      {/* Content */}
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {feature}
          </li>
        ))}
      </ul>

      {/* AI Ready Badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium text-primary">🤖 AI Agent Ready</span>
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-300 hover:shadow-glow group-hover:scale-[1.02]"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </motion.div>
  );
}