import { BookOpen } from "lucide-react";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Missing dependencies</DialogTitle>
          <DialogDescription>
            SenseCenter needs the following before it can control or monitor
            this laptop:
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {missing.map((dep) => (
            <li key={dep}>{DEPENDENCY_LABELS[dep] ?? dep}</li>
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
