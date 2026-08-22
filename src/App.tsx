import { useEffect, useState } from "react";
import { StatusBanner } from "@/components/StatusBanner";
import { ControlPanel } from "@/components/ControlPanel";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { FirmwarePanel } from "@/components/FirmwarePanel";
import { DependencyModal } from "@/components/DependencyModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStartupStatus } from "@/hooks/useStartupStatus";
import { useTelemetry } from "@/hooks/useTelemetry";

function App() {
  const { status, loading, error, refresh } = useStartupStatus();
  const controlsEnabled = Boolean(
    status?.module_loaded && status.in_linuwu_sense_group && status.device,
  );
  const { snapshot, history, error: telemetryError } = useTelemetry(true);

  const [depModalOpen, setDepModalOpen] = useState(false);
  useEffect(() => {
    if (status && status.missing_dependencies.length > 0) {
      setDepModalOpen(true);
    }
  }, [status]);

  const chartHistory = history.map((point) => ({
    time: point.time,
    label: point.label,
    temp: point.temp,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
        <StatusBanner
          status={status}
          loading={loading}
          error={error}
          onRefresh={() => void refresh()}
        />

        <Tabs defaultValue="monitor" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="firmware">Firmware</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="mt-4">
            <MonitoringPanel
              snapshot={snapshot}
              history={chartHistory}
              error={telemetryError}
            />
          </TabsContent>

          <TabsContent value="controls" className="mt-4">
            <ControlPanel
              device={status?.device ?? null}
              controlsEnabled={controlsEnabled}
            />
          </TabsContent>

          <TabsContent value="firmware" className="mt-4">
            <FirmwarePanel available={status?.fwupd_available ?? false} />
          </TabsContent>
        </Tabs>
      </div>

      <DependencyModal
        open={depModalOpen}
        missing={status?.missing_dependencies ?? []}
        repoUrl={status?.repo_url ?? "https://github.com/Lusan-sapkota/SenseCenter"}
        onOpenChange={setDepModalOpen}
      />
    </div>
  );
}

export default App;
