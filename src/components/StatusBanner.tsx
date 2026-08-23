import { memo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
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
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-brand-teal/15 text-brand-teal"
          : warn
            ? "bg-chart-4/15 text-[color:var(--chart-4)]"
            : "bg-destructive/15 text-destructive"
      }`}
    >
      <div
        className={`size-1.5 rounded-full ${
          ok ? "bg-brand-teal" : warn ? "bg-[color:var(--chart-4)]" : "bg-destructive"
        }`}
      />
      {label}
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
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="size-3 animate-spin" />
            Checking…
          </Badge>
        )}
        {!loading && status && (
          <>
            <StatusPill ok={status.module_loaded} label="Module" />
            <StatusPill
              ok={status.in_linuwu_sense_group}
              label="Permissions"
              warn={status.module_loaded && !status.in_linuwu_sense_group}
            />
            <StatusPill ok={status.fwupd_available} label="fwupd" />
            {ready && (
              <StatusPill ok label="Ready" />
            )}
          </>
        )}
        {error && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="size-3" />
            Startup error
          </Badge>
        )}
        {unlockResult && (
          <Badge variant={unlockResult === "Unlocked" ? "secondary" : "destructive"}>
            {unlockResult === "Unlocked" ? (
              <CheckCircle2 className="mr-1 size-3" />
            ) : null}
            {unlockResult === "Unlocked"
              ? "Advanced features unlocked"
              : unlockResult}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!loading && status?.module_loaded && !status.in_linuwu_sense_group && (
          <span className="hidden text-xs text-[color:var(--chart-4)] sm:inline">
            <ShieldAlert className="mr-1 inline size-3" />
            Log out and back in after joining linuwu_sense group
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleUnlock()}
          disabled={unlocking}
        >
          {unlocking ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Lock className="mr-1.5 size-3.5" />
          )}
          Unlock
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
});
