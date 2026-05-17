import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "success" | "warning" | "pending" | "info";
  message: string;
  timestamp: string;
}

const activities: ActivityItem[] = [
  {
    id: "1",
    type: "success",
    message: "Rule R-1.1 validated successfully with 98% compliance",
    timestamp: "2 minutes ago",
  },
  {
    id: "2",
    type: "warning",
    message: "Exception found in LPL Brokerage Statement - EXC-1",
    timestamp: "14 minutes ago",
  },
  {
    id: "3",
    type: "success",
    message: "Template 'LPL-Portfolio-2025' published to production",
    timestamp: "45 minutes ago",
  },
  {
    id: "4",
    type: "pending",
    message: "Rule R-2.3 awaiting approval from Risk Team",
    timestamp: "1 hour ago",
  },
  {
    id: "5",
    type: "info",
    message: "New rule draft created: Cross-table Summary Consistency",
    timestamp: "2 hours ago",
  },
];

const iconMap = {
  success: CheckCircle,
  warning: AlertCircle,
  pending: Clock,
  info: FileText,
};

const colorMap = {
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  pending: "text-muted-foreground bg-muted",
  info: "text-primary bg-primary/10",
};

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
              className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              <div className={cn("rounded-lg p-2", colorMap[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}