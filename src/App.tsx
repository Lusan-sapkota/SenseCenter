import { useEffect, useState } from "react";
import { StatusBanner } from "@/components/StatusBanner";
import { ControlPanel } from "@/components/ControlPanel";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { FirmwarePanel } from "@/components/FirmwarePanel";
import { DependencyModal } from "@/components/DependencyModal";
import { AppShell, type NavSection } from "@/components/layout/AppShell";
import { useStartupStatus } from "@/hooks/useStartupStatus";
import { useTelemetry } from "@/hooks/useTelemetry";
import { usePollInterval } from "@/hooks/usePollInterval";

function App() {
  const { status, loading, error, refresh } = useStartupStatus();
  const controlsEnabled = Boolean(
    status?.module_loaded && status.in_linuwu_sense_group && status.device,
  );

  const [pollMs, setPollMs] = usePollInterval();
  const telemetry = useTelemetry(true, pollMs);

  const [section, setSection] = useState<NavSection>("monitor");
  const [depModalOpen, setDepModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (status && status.missing_dependencies.length > 0) {
      setDepModalOpen(true);
    }
  }, [status]);

  return (
    <>
      <AppShell
        active={section}
        onNavigate={setSection}
        productName={status?.device?.product_name}
        header={
          <StatusBanner
            status={status}
            loading={loading}
            error={error}
            onRefresh={() => void refresh()}
          />
        }
      >
        {section === "monitor" && (
          <MonitoringPanel
            snapshot={telemetry.snapshot}
            history={telemetry.history}
            error={telemetry.error}
            pollMs={pollMs}
            onPollMsChange={setPollMs}
          />
        )}
        <div hidden={section !== "controls"}>
          <ControlPanel
            device={status?.device ?? null}
            controlsEnabled={controlsEnabled}
          />
        </div>
        {section === "firmware" && (
          <FirmwarePanel available={status?.fwupd_available ?? false} />
        )}
      </AppShell>

      <DependencyModal
        open={depModalOpen}
        missing={status?.missing_dependencies ?? []}
        repoUrl={status?.repo_url ?? "https://github.com/Lusan-sapkota/SenseCenter"}
        onOpenChange={setDepModalOpen}
      />
    </>
  );
}

export default App;
