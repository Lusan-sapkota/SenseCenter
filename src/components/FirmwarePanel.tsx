import { memo, useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
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

export const FirmwarePanel = memo(function FirmwarePanel({ available }: FirmwarePanelProps) {
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
        <PanelCard title="fwupd Subsystem Offline" icon={ShieldAlert}>
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
              <Download className="size-6 text-muted-foreground/40" />
            </div>
            <p className="font-mono text-sm font-semibold text-foreground">fwupd daemon not responding</p>
            <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
              Install and start <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-brand-teal">fwupd</code> to enable Linux vendor firmware service (LVFS) device management.
            </p>
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Firmware & Host Security"
        description="Hardware devices reported via Linux Vendor Firmware Service (LVFS) & fwupd"
        icon={Download}
        badge={
          updateCount > 0 ? (
            <Badge variant="amber">
              {updateCount} update{updateCount !== 1 ? "s" : ""} available
            </Badge>
          ) : (
            <Badge variant="emerald">
              All devices up to date
            </Badge>
          )
        }
      />

      {securityId && (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-brand-teal/10 via-[#0F1420] to-brand-violet/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-teal/30 bg-brand-teal/10 text-brand-teal">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  HOST SECURITY ATTRIBUTE
                </p>
                <span className="size-1.5 rounded-full bg-brand-teal" />
              </div>
              <p className="mt-1 font-mono text-base font-bold tracking-tight text-white">{securityId}</p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                Cryptographic HSI
              </span>
            </div>
          </div>
        </div>
      )}

      <PanelCard
        title="Detected Firmware Targets"
        description="Firmware devices enumerated by system D-Bus"
        icon={Shield}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="border-white/10 bg-white/[0.03] hover:bg-brand-teal/20 hover:border-brand-teal/40 font-mono text-xs"
          >
            <RefreshCw className={`mr-1.5 size-3.5 text-brand-teal ${loading ? "animate-spin" : ""}`} />
            Scan Devices
          </Button>
        }
      >
        {error && (
          <Alert variant="destructive" className="mb-4 border-rose-500/30 bg-rose-500/10 font-mono text-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && devices.length === 0 && (
          <div className="flex items-center justify-center py-12 font-mono text-xs text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin text-brand-teal" />
            Connecting to org.freedesktop.fwupd...
          </div>
        )}

        {!loading && devices.length === 0 && !error && (
          <p className="py-8 text-center font-mono text-xs text-muted-foreground">No firmware devices reported.</p>
        )}

        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors duration-150 ${
                device.update_available
                  ? "border-amber-500/40 bg-[#1A1820]"
                  : "border-white/[0.06] bg-black/20 hover:border-white/15"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground border border-white/5">
                    <Cpu className="size-3.5 text-brand-teal" />
                  </div>
                  <span className="font-mono text-sm font-bold text-foreground">{device.name}</span>
                  {device.update_available ? (
                    <Badge variant="amber">
                      New Release Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Latest Flash Verified
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2 font-mono text-xs text-muted-foreground pl-9">
                  <span>{device.vendor ?? "Generic Vendor"}</span>
                  {device.version && (
                    <>
                      <span>·</span>
                      <span className="text-white/70">v{device.version}</span>
                    </>
                  )}
                </div>
                {result?.id === device.id && (
                  <p className="mt-2 font-mono text-xs text-brand-teal pl-9">{result.message}</p>
                )}
              </div>
              {device.update_available && (
                <Button
                  size="sm"
                  disabled={updating === device.id}
                  onClick={() => void applyUpdate(device.id)}
                  className="bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs font-bold tracking-wider"
                >
                  {updating === device.id ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                  )}
                  Flash Firmware
                </Button>
              )}
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
});
