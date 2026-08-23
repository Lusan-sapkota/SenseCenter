import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  LayoutDashboard,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/Logo";

const SIDEBAR_COLLAPSED_KEY = "sensecenter:sidebar-collapsed";

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage failures (private mode, disabled storage)
    }
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}

export type NavSection = "monitor" | "controls" | "firmware";

interface NavItem {
  id: NavSection;
  label: string;
  icon: typeof Activity;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "monitor",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Live telemetry",
  },
  {
    id: "controls",
    label: "Controls",
    icon: SlidersHorizontal,
    description: "Hardware settings",
  },
  {
    id: "firmware",
    label: "Firmware",
    icon: Download,
    description: "Updates & security",
  },
];

interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  productName?: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({
  active,
  onNavigate,
  productName,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl transition-all duration-200",
        collapsed ? "w-18" : "w-56",
      )}
    >
      <div className={cn("border-b border-border/60 px-5 py-5", collapsed && "px-0")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <LogoMark size={32} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight tracking-tight">
                <Wordmark />
              </h1>
              {productName && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {productName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1 p-3", collapsed && "px-2")}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200",
                collapsed && "justify-center px-0",
                isActive
                  ? "translate-x-0.5 bg-gradient-to-r from-brand-teal/20 to-brand-violet/20 text-foreground shadow-sm ring-1 ring-brand-violet/30"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-foreground",
                collapsed && "hover:translate-x-0",
                collapsed && isActive && "translate-x-0",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-brand-teal to-brand-violet transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-brand-teal" : "group-hover:text-brand-teal",
                )}
              />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{item.label}</p>
                  <p className="mt-0.5 truncate text-[10px] opacity-70">{item.description}</p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className={cn("border-t border-border/60 p-4", collapsed && "px-2")}>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-3.5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

interface AppShellProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  productName?: string | null;
  header: ReactNode;
  children: ReactNode;
}

export function AppShell({
  active,
  onNavigate,
  productName,
  header,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        active={active}
        onNavigate={onNavigate}
        productName={productName}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 size-96 rounded-full bg-brand-teal/8 blur-3xl" />
          <div className="absolute -right-32 top-1/3 size-96 rounded-full bg-brand-violet/8 blur-3xl" />
        </div>
        <header className="relative z-10 shrink-0 border-b border-border/60 bg-background/60 px-6 py-4 backdrop-blur-md">
          {header}
        </header>
        <main className="relative z-10 flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  badge,
}: {
  title: string;
  description?: string;
  icon?: typeof Cpu;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-teal/20 to-brand-violet/20 text-brand-teal">
            <Icon className="size-4" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PanelCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  icon?: typeof Palette;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex size-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
          )}
          <div>
            <h3 className="font-heading text-sm font-semibold">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
