import { memo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tauriErrorMessage, unlockPrivileged } from "@/lib/api";
import type { StartupStatus } from "@/types";

interface StatusBannerProps {
  status: StartupStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function StatusPill({
  ok,
  label,
  warn,
}: {
  ok: boolean;
  label: string;
  warn?: boolean;
}) {
  const stateColor = ok
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : warn
      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-rose-400 bg-rose-500/10 border-rose-500/30";

  const dotColor = ok
    ? "bg-emerald-400"
    : warn
      ? "bg-amber-400"
      : "bg-rose-500";

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-white/[0.08] bg-[#070A11] shadow-xs select-none">
      <div className="flex items-center px-2 py-0.5 border-r border-white/[0.06] bg-white/[0.02]">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
      </div>
      <div className={`flex items-center gap-1.5 px-2 py-0.5 ${stateColor}`}>
        <span className={`size-1.5 rounded-full ${dotColor}`} />
        <span className="font-mono text-[10px] font-bold tracking-wider">
          {ok ? "ONLINE" : warn ? "WARN" : "OFFLINE"}
        </span>
      </div>
    </div>
  );
}

export const StatusBanner = memo(function StatusBanner({
  status,
  loading,
  error,
  onRefresh,
}: StatusBannerProps) {
  const ready =
    status?.module_loaded &&
    status.in_linuwu_sense_group &&
    status.device != null;

  const [unlocking, setUnlocking] = useState(false);
  const [unlockResult, setUnlockResult] = useState<string | null>(null);

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockResult(null);
    try {
      await unlockPrivileged();
      setUnlockResult("Unlocked");
    } catch (err) {
      setUnlockResult(tauriErrorMessage(err));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {loading && (
          <Badge variant="outline" className="gap-1.5 border-brand-teal/40 bg-brand-teal/10 text-brand-teal">
            <Loader2 className="size-3 animate-spin text-brand-teal" />
            POLLING HARDWARE...
          </Badge>
        )}
        {!loading && status && (
          <>
            <StatusPill ok={status.module_loaded} label="Module" />
            <StatusPill
              ok={status.in_linuwu_sense_group}
              label="Perms"
              warn={status.module_loaded && !status.in_linuwu_sense_group}
            />
            <StatusPill ok={status.fwupd_available} label="fwupd" />
            {ready && (
              <div className="hidden sm:inline-flex items-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-emerald-300 uppercase select-none">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                SYSTEM READY
              </div>
            )}
          </>
        )}
        {error && (
          <Badge variant="destructive" className="gap-1.5">
            <AlertCircle className="size-3" />
            SYSTEM FAULT
          </Badge>
        )}
        {unlockResult && (
          <Badge
            variant={unlockResult === "Unlocked" ? "emerald" : "destructive"}
            className="gap-1.5"
          >
            {unlockResult === "Unlocked" && <CheckCircle2 className="size-3 text-emerald-400" />}
            {unlockResult === "Unlocked"
              ? "Privileges Unlocked (Root sysfs enabled)"
              : unlockResult}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {!loading && status?.module_loaded && !status.in_linuwu_sense_group && (
          <span className="hidden text-xs font-mono text-amber-400 sm:inline flex items-center gap-1">
            <ShieldAlert className="inline size-3.5" />
            Re-login required for linuwu_sense group
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleUnlock()}
          disabled={unlocking}
          className="border-white/10 bg-white/[0.03] hover:bg-brand-violet/20 hover:border-brand-violet/40 hover:text-white transition-all shadow-sm"
        >
          {unlocking ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin text-brand-violet" />
          ) : (
            <KeyRound className="mr-1.5 size-3.5 text-brand-violet" />
          )}
          <span className="font-mono text-xs tracking-wider">Elevate</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="border-white/10 bg-white/[0.03] hover:bg-brand-teal/20 hover:border-brand-teal/40 hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`mr-1.5 size-3.5 text-brand-teal ${loading ? "animate-spin" : ""}`} />
          <span className="font-mono text-xs tracking-wider">Refresh</span>
        </Button>
      </div>
    </div>
  );
});
