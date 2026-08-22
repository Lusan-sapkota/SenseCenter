import { useCallback, useEffect, useRef, useState } from "react";
import { getTelemetry, tauriErrorMessage } from "@/lib/api";
import type { TelemetryPoint, TelemetrySnapshot } from "@/types";

const POLL_MS = 2000;
const HISTORY_LIMIT = 60;

export function useTelemetry(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef(0);

  const poll = useCallback(async () => {
    try {
      const data = await getTelemetry();
      setSnapshot(data);
      setError(null);

      const points: TelemetryPoint[] = data.temps
        .filter((r) => /package|composite/i.test(r.label))
        .map((r) => ({
          time: 0,
          label: `${r.chip} ${r.label}`,
          temp: r.value,
        }));

      if (data.gpu?.temp_c != null) {
        points.push({
          time: 0,
          label: "GPU",
          temp: data.gpu.temp_c,
        });
      }

      if (points.length > 0) {
        tickRef.current += 1;
        setHistory((prev) =>
          [...prev, ...points.map((p) => ({ ...p, time: tickRef.current }))].slice(
            -HISTORY_LIMIT * 4,
          ),
        );
      }
    } catch (err) {
      setError(tauriErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, poll]);

  return { snapshot, history, error, refresh: poll };
}
