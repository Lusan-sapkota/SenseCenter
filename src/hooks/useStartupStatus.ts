import { useCallback, useEffect, useState } from "react";
import { getStartupStatus, tauriErrorMessage } from "@/lib/api";
import type { StartupStatus } from "@/types";

export function useStartupStatus() {
  const [status, setStatus] = useState<StartupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getStartupStatus());
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}
