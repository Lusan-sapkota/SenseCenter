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

      const now = Date.now();
      const points: TelemetryPoint[] = data.hwmon
        .filter((r) => r.temp_c != null)
        .map((r) => ({
          time: now,
          label: r.label,
          temp: r.temp_c as number,
        }));

      if (data.gpu?.temp_c != null) {
        points.push({
          time: now,
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
