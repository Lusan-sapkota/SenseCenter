import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react";
import { listFirmwareDevices, tauriErrorMessage, triggerFirmwareUpdate } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

  if (!available) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="size-5" />
            <CardTitle>Firmware updates</CardTitle>
            <Badge variant="secondary">unavailable</Badge>
          </div>
          <CardDescription>
            Install and start <code className="text-xs">fwupd</code> to enable BIOS
            and component firmware updates from this panel.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Download className="size-5" />
            <CardTitle>Firmware updates</CardTitle>
            <Badge>fwupd connected</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Devices reported by fwupd. Updates run via{" "}
          <code className="text-xs">fwupdmgr update</code>, which handles its own
          download and polkit authorization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && devices.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Querying fwupd…
          </div>
        )}

        {!loading && devices.length === 0 && !error && (
          <p className="py-4 text-sm text-muted-foreground">No devices reported.</p>
        )}

        <div className="divide-y divide-border/60">
          {devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-4 py-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{device.name}</span>
                  {device.update_available ? (
                    <Badge>update available</Badge>
                  ) : (
                    <Badge variant="secondary">up to date</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {device.vendor ?? "Unknown vendor"}
                  {device.version ? ` · v${device.version}` : ""}
                </p>
                {result?.id === device.id && (
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                )}
              </div>
              {device.update_available && (
                <Button
                  size="sm"
                  disabled={updating === device.id}
                  onClick={() => void applyUpdate(device.id)}
                >
                  {updating === device.id ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 size-4" />
                  )}
                  Update
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
