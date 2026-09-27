import { AlertTriangle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DependencyModalProps {
  open: boolean;
  missing: string[];
  repoUrl: string;
  onOpenChange: (open: boolean) => void;
}

const DEPENDENCY_LABELS: Record<string, string> = {
  "linuwu-sense": "linuwu-sense kernel module (sysfs WMI driver)",
  "lm-sensors": "lm-sensors (hwmon temperature/fan telemetry)",
};

export function DependencyModal({
  open,
  missing,
  repoUrl,
  onOpenChange,
}: DependencyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0C101A] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="font-heading text-lg font-bold tracking-tight text-white">
            Missing System Drivers / Tools
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            SenseCenter requires kernel sysfs drivers and telemetry utilities to interface with this laptop:
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {missing.map((dep) => (
            <li
              key={dep}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/30 p-3 font-mono text-xs"
            >
              <div className="size-2 rounded-full bg-amber-400" />
              <span className="font-medium text-foreground">{DEPENDENCY_LABELS[dep] ?? dep}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs text-muted-foreground/80">
          Installation guides, DKMS setup, and group permission rules are documented in the SenseCenter repository.
        </p>
        <DialogFooter className="pt-2">
          <Button
            className="w-full sm:w-auto bg-brand-teal text-black hover:bg-brand-teal/90 font-mono text-xs tracking-wider font-semibold"
            render={
              <a href={repoUrl} target="_blank" rel="noreferrer" />
            }
          >
            <BookOpen className="mr-2 size-4" />
            Open Install Documentation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
