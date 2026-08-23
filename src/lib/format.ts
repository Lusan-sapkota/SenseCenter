export function formatRate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatBytes(bytes: number): string {
  const gib = bytes / (1024 * 1024 * 1024);
  if (gib < 1) return `${(bytes / (1024 * 1024)).toFixed(0)} MiB`;
  return `${gib.toFixed(1)} GiB`;
}

export function formatKib(kib: number): string {
  if (kib < 1024) return `${kib.toFixed(0)} KiB`;
  if (kib < 1024 * 1024) return `${(kib / 1024).toFixed(1)} MiB`;
  return `${(kib / (1024 * 1024)).toFixed(1)} GiB`;
}

export function formatUptime(secs: number): string {
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function tempColor(celsius: number): string {
  if (celsius < 50) return "var(--brand-teal)";
  if (celsius < 85) return "var(--chart-4)";
  return "var(--destructive)";
}

export function usageColor(pct: number): string {
  if (pct < 60) return "var(--brand-teal)";
  if (pct < 80) return "var(--chart-4)";
  return "var(--destructive)";
}

export function loadColor(pct: number): string {
  if (pct < 50) return "var(--brand-teal)";
  if (pct < 75) return "var(--brand-violet)";
  if (pct < 90) return "var(--chart-4)";
  return "var(--destructive)";
}

export function fanColor(rpm: number): string {
  if (rpm < 2000) return "var(--brand-teal)";
  if (rpm < 4000) return "var(--brand-violet)";
  if (rpm < 5000) return "var(--chart-4)";
  return "var(--destructive)";
}

export function powerColor(watts: number, maxW = 140): string {
  const pct = (watts / maxW) * 100;
  return usageColor(pct);
}
