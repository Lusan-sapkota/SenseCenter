import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTelemetry, tauriErrorMessage } from "@/lib/api";
import type { TelemetryPoint, TelemetrySnapshot } from "@/types";

const HISTORY_LIMIT = 40;

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

    let id: number | null = null;

    const start = () => {
      if (id == null && !document.hidden) {
        void poll();
        id = window.setInterval(() => void poll(), pollMs);
      }
    };

    const stop = () => {
      if (id != null) {
        window.clearInterval(id);
        id = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, pollMs, poll]);

  return useMemo(
    () => ({ snapshot, history, error, refresh: poll }),
    [snapshot, history, error, poll],
  );
}
