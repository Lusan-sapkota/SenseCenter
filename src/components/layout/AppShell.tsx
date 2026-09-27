import { memo, useEffect, useState } from "react";
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
    } catch {}
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}

export type NavSection = "monitor" | "controls" | "firmware";

interface NavItem {
  id: NavSection;
  index: string;
  label: string;
  icon: typeof Activity;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "monitor",
    index: "01",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Live telemetry",
  },
  {
    id: "controls",
    index: "02",
    label: "Controls",
    icon: SlidersHorizontal,
    description: "Hardware settings",
  },
  {
    id: "firmware",
    index: "03",
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
        "relative flex shrink-0 flex-col border-r border-white/[0.07] bg-[#0A0D15] transition-[width] duration-200 select-none z-20 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)]",
        collapsed ? "w-20" : "w-60",
      )}
    >
      <div className={cn("border-b border-white/[0.06] p-4", collapsed ? "px-2 py-4" : "p-5")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="relative shrink-0">
            <div className="flex items-center justify-center rounded-xl bg-[#0F131D] p-1.5 border border-white/10">
              <LogoMark size={collapsed ? 28 : 32} />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold leading-tight tracking-tight">
                <Wordmark />
              </h1>
              {productName ? (
                <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                  <span className="size-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <p className="truncate font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    {productName}
                  </p>
                </div>
              ) : (
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  LINUX WMI
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1.5 p-3", collapsed && "px-2")}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? `${item.label} — ${item.description}` : undefined}
              aria-label={item.label}
              className={cn(
                "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 outline-none select-none",
                collapsed && "justify-center px-0 py-3",
                isActive
                  ? "bg-[#141A28] text-foreground border border-white/10"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-teal transition-transform duration-200",
                  isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50",
                )}
              />
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                  isActive
                    ? "bg-brand-teal/15 text-brand-teal border border-brand-teal/30"
                    : "bg-white/[0.03] text-muted-foreground group-hover:text-foreground group-hover:bg-white/[0.06]",
                )}
              >
                <Icon className="size-4" />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none tracking-tight">{item.label}</p>
                    <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                      {item.index}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.description}</p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className={cn("border-t border-white/[0.06] p-3", collapsed && "px-2")}>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground transition-all hover:bg-white/[0.06] hover:text-foreground hover:border-white/[0.08]",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-3.5 shrink-0" />
              <span className="font-mono text-[11px] tracking-wider uppercase">Collapse Deck</span>
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
    <div className="flex h-screen overflow-hidden bg-[#080A0F] text-foreground">
      <Sidebar
        active={active}
        onNavigate={onNavigate}
        productName={productName}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-10 shrink-0 border-b border-white/[0.07] bg-[#0A0E17] px-6 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          {header}
        </header>
        <main className="relative z-10 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export const SectionHeader = memo(function SectionHeader({
  title,
  description,
  icon: Icon,
  badge,
  action,
}: {
  title: string;
  description?: string;
  icon?: typeof Cpu;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#121724] text-brand-teal">
            <Icon className="size-4.5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-xl font-bold tracking-tight text-white">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground font-mono tracking-wide">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
});

export const PanelCard = memo(function PanelCard({
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
        "relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D111A] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] bg-white/[0.015] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] text-brand-teal ring-1 ring-white/10">
              <Icon className="size-3.5" />
            </div>
          )}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground/95">{title}</h3>
            {description && (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
});
