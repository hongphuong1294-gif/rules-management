import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  TestTube, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  History,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: BookOpen, label: "Rule Library", href: "/rules" },
  { icon: MessageSquare, label: "Rule Builder", href: "/builder" },
  { icon: TestTube, label: "Test Rules", href: "/test" },
  { icon: FileText, label: "Templates", href: "/templates" },
];

const secondaryNavItems: NavItem[] = [
  { icon: History, label: "Audit Log", href: "/audit" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-hero">
          <span className="text-lg font-bold text-primary-foreground">O</span>
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="whitespace-nowrap text-lg font-semibold text-foreground">
                OneNexus
              </span>
              <span className="ml-1 text-xs text-muted-foreground">Rules</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <div className="mb-2">
          {!isCollapsed && (
            <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Main
            </span>
          )}
        </div>
        {mainNavItems.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={currentPath === item.href}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate(item.href)}
          />
        ))}

        <div className="my-4 border-t border-sidebar-border" />

        <div className="mb-2">
          {!isCollapsed && (
            <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Settings
            </span>
          )}
        </div>
        {secondaryNavItems.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={currentPath === item.href}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate(item.href)}
          />
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent",
          isCollapsed && "justify-center"
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-primary-foreground">
            DA
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="truncate text-sm font-medium text-foreground">
                  Document Analyst
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  LPL Financial
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!isCollapsed && (
            <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-muted"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, isCollapsed, onClick }: NavButtonProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 rounded-lg bg-sidebar-accent"
          transition={{ duration: 0.2, ease: "easeInOut" }}
        />
      )}
      <Icon className={cn("relative z-10 h-5 w-5 shrink-0", isActive && "text-primary")} />
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="relative z-10 truncate"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {item.badge && !isCollapsed && (
        <span className="relative z-10 ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
          {item.badge}
        </span>
      )}
    </button>
  );
}