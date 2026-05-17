import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  index?: number;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel,
  index = 0,
}: StatsCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-destructive/10 text-destructive",
              !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : isNegative ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        {changeLabel && (
          <p className="mt-1 text-xs text-muted-foreground">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
}