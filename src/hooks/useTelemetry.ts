import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { getTelemetry, tauriErrorMessage } from "@/lib/api";
import type { TelemetryPoint, TelemetrySnapshot } from "@/types";

const HISTORY_LIMIT = 60;

export function useTelemetry(enabled: boolean, pollMs: number) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef(0);
  const pollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const data = await getTelemetry();

      const points: TelemetryPoint[] = data.temps
        .filter((r) => /package|composite/i.test(r.label))
        .map((r) => ({
          time: 0,
          label: `${r.chip} ${r.label}`,
          temp: r.value,
        }));

      if (data.gpu?.temp_c != null) {
        points.push({ time: 0, label: "GPU", temp: data.gpu.temp_c });
      }

      startTransition(() => {
        setSnapshot(data);
        setError(null);
        if (points.length > 0) {
          tickRef.current += 1;
          const tick = tickRef.current;
          setHistory((prev) =>
            [...prev, ...points.map((p) => ({ ...p, time: tick }))].slice(
              -HISTORY_LIMIT * 4,
            ),
          );
        }
      });
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void poll();
    const id = window.setInterval(() => void poll(), pollMs);
    return () => window.clearInterval(id);
  }, [enabled, pollMs, poll]);

  return { snapshot, history, error, refresh: poll };
}
