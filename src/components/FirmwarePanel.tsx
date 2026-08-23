import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  ShieldCheck,
} from "lucide-react";
import {
  getSecurityId,
  listFirmwareDevices,
  tauriErrorMessage,
  triggerFirmwareUpdate,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanelCard, SectionHeader } from "@/components/layout/AppShell";
import type { FirmwareDevice } from "@/types";

interface FirmwarePanelProps {
  available: boolean;
}

export function FirmwarePanel({ available }: FirmwarePanelProps) {
  const [devices, setDevices] = useState<FirmwareDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; message: string } | null>(null);
  const [securityId, setSecurityId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    setError(null);
    try {
      setDevices(await listFirmwareDevices());
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!available) return;
    getSecurityId().then(setSecurityId).catch(() => undefined);
  }, [available]);

  const applyUpdate = async (deviceId: string) => {
    setUpdating(deviceId);
    setResult(null);
    try {
      const message = await triggerFirmwareUpdate(deviceId);
      setResult({ id: deviceId, message: message || "Update triggered." });
      await load();
    } catch (err) {
      setResult({ id: deviceId, message: tauriErrorMessage(err) });
    } finally {
      setUpdating(null);
    }
  };

  const updateCount = devices.filter((d) => d.update_available).length;

  if (!available) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Firmware & Security"
          description="BIOS and component updates via fwupd"
          icon={Download}
        />
        <PanelCard title="fwupd Unavailable" icon={Download}>
          <div className="flex flex-col items-center py-8 text-center">
            <Download className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Install and start{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fwupd</code> to enable
              firmware updates from this panel.
            </p>
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Firmware & Security"
        description="Devices reported by fwupd  updates delegate auth to polkit"
        icon={Download}
        badge={
          updateCount > 0 ? (
            <Badge>{updateCount} update{updateCount !== 1 ? "s" : ""} available</Badge>
          ) : (
            <Badge variant="secondary">All up to date</Badge>
          )
        }
      />

      {securityId && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-teal/20 bg-gradient-to-r from-brand-teal/10 to-brand-violet/10 px-5 py-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-background/40">
            <ShieldCheck className="size-5 text-brand-teal" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Host Security ID
            </p>
            <p className="font-mono text-sm font-medium">{securityId}</p>
          </div>
        </div>
      )}

      <PanelCard
        title="Firmware Devices"
        description="Updates run via fwupdmgr update"
        icon={Shield}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      >
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && devices.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Querying fwupd…
          </div>
        )}

        {!loading && devices.length === 0 && !error && (
          <p className="py-8 text-center text-sm text-muted-foreground">No devices reported.</p>
        )}

        <div className="space-y-2">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3.5 transition-colors ${
                device.update_available
                  ? "border-brand-violet/30 bg-brand-violet/5"
                  : "border-border/40 bg-muted/20"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{device.name}</span>
                  {device.update_available ? (
                    <Badge>Update available</Badge>
                  ) : (
                    <Badge variant="secondary">Up to date</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {device.vendor ?? "Unknown vendor"}
                  {device.version ? ` · v${device.version}` : ""}
                </p>
                {result?.id === device.id && (
                  <p className="mt-1 text-xs text-muted-foreground">{result.message}</p>
                )}
              </div>
              {device.update_available && (
                <Button
                  size="sm"
                  disabled={updating === device.id}
                  onClick={() => void applyUpdate(device.id)}
                >
                  {updating === device.id ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                  )}
                  Update
                </Button>
              )}
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
