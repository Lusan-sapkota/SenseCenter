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
  "linuwu-sense": "linuwu-sense kernel module",
  "lm-sensors": "lm-sensors",
};

export function DependencyModal({
  open,
  missing,
  repoUrl,
  onOpenChange,
}: DependencyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertTriangle className="size-5 text-amber-400" />
          </div>
          <DialogTitle>Missing dependencies</DialogTitle>
          <DialogDescription>
            SenseCenter needs the following before it can control or monitor this laptop:
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {missing.map((dep) => (
            <li
              key={dep}
              className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <div className="size-1.5 rounded-full bg-amber-400" />
              {DEPENDENCY_LABELS[dep] ?? dep}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Install instructions and download links are in the repository README.
        </p>
        <DialogFooter>
          <Button
            render={
              <a href={repoUrl} target="_blank" rel="noreferrer" />
            }
          >
            <BookOpen className="mr-2 size-4" />
            Open README
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
