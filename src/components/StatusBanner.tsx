import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/Logo";
import { tauriErrorMessage, unlockPrivileged } from "@/lib/api";
import type { StartupStatus } from "@/types";

interface StatusBannerProps {
  status: StartupStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function StatusBanner({
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
      setUnlockResult("Unlocked — CPU power, thermal profile, and radio toggles are now writable.");
    } catch (err) {
      setUnlockResult(tauriErrorMessage(err));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <h1 className="text-xl font-semibold tracking-tight">
              <Wordmark />
            </h1>
            {status?.device && (
              <Badge variant="secondary">{status.device.product_name}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Hardware control and live monitoring for linuwu-sense
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleUnlock()}
            disabled={unlocking}
          >
            {unlocking ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Lock className="mr-2 size-4" />
            )}
            Unlock advanced features
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {unlockResult && (
        <Alert>
          <AlertDescription>{unlockResult}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Startup check failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && status && !status.module_loaded && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>linuwu-sense not loaded</AlertTitle>
          <AlertDescription>
            Load the kernel module first (<code className="text-xs">sudo make install</code>{" "}
            in the Linuwu-Sense repo), then reboot or{" "}
            <code className="text-xs">sudo modprobe linuwu_sense</code>.
          </AlertDescription>
        </Alert>
      )}

      {!loading && status?.module_loaded && !status.in_linuwu_sense_group && (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Permission setup required</AlertTitle>
          <AlertDescription>
            Add your user to the <code className="text-xs">linuwu_sense</code> group, then{" "}
            <strong>log out and back in</strong> — group membership does not apply mid-session.
          </AlertDescription>
        </Alert>
      )}

      {!loading && ready && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Ready</AlertTitle>
          <AlertDescription>
            Module loaded, permissions OK
            {status.fwupd_available ? ", fwupd available" : ", fwupd unavailable"}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
