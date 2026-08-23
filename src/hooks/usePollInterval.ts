import { useEffect, useState } from "react";

const POLL_INTERVAL_KEY = "sensecenter:poll-interval-ms";
export const DEFAULT_POLL_MS = 2000;

export function usePollInterval() {
  const [pollMs, setPollMs] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(POLL_INTERVAL_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_POLL_MS;
    } catch {
      return DEFAULT_POLL_MS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(POLL_INTERVAL_KEY, String(pollMs));
    } catch {
      // ignore storage failures (private mode, disabled storage)
    }
  }, [pollMs]);

  return [pollMs, setPollMs] as const;
}
