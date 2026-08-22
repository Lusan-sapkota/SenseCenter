import { Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FirmwarePanelProps {
  available: boolean;
}

export function FirmwarePanel({ available }: FirmwarePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="size-5" />
          <CardTitle>Firmware updates</CardTitle>
          <Badge variant={available ? "default" : "secondary"}>
            {available ? "fwupd connected" : "unavailable"}
          </Badge>
        </div>
        <CardDescription>
          Device listing and update triggers via fwupd D-Bus — backend stub in place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {available ? (
          <p className="text-sm text-muted-foreground">
            fwupd is reachable. The next step is wiring{" "}
            <code className="text-xs">GetDevices</code> into a device list with update
            actions here.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Install and start <code className="text-xs">fwupd</code> to enable BIOS and
            component firmware updates from this panel.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
