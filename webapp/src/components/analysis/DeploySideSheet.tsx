import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface DeploySideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEVICES = [
  { id: 'Device-01', firmware: '2.6.1', status: 'online', lastSuccess: 'Today 12:30' },
  { id: 'Device-02', firmware: '2.4.0', status: 'warning', lastSuccess: 'Yesterday 21:04' },
  { id: 'Device-03', firmware: '2.6.1', status: 'online', lastSuccess: 'Today 11:12' },
];

export function DeploySideSheet({ open, onOpenChange }: DeploySideSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] space-y-4 border-l"
        style={{
          backgroundColor: 'var(--color-prism-bg-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <SheetHeader>
          <SheetTitle
            className="font-['Bebas_Neue',sans-serif] uppercase tracking-wide"
            style={{ color: 'var(--color-prism-text-primary)' }}
          >
            Deploy Bundle
          </SheetTitle>
          <SheetDescription style={{ color: 'var(--color-prism-text-secondary)' }}>
            Firmware minimum: 2.5.0 · Map version: v4.0 · Runtime risk: 7.3 ms
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="space-y-3">
          {DEVICES.map((device) => (
            <div
              key={device.id}
              className="rounded-lg border px-3 py-2"
              style={{
                backgroundColor: 'var(--color-prism-bg-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-prism-text-primary)' }}>
                  {device.id}
                </span>
                <Badge
                  variant="outline"
                  style={{
                    borderColor:
                      device.status === 'warning'
                        ? 'var(--color-prism-warning)'
                        : 'var(--color-prism-success)',
                    color:
                      device.status === 'warning'
                        ? 'var(--color-prism-warning)'
                        : 'var(--color-prism-success)',
                  }}
                >
                  FW {device.firmware}
                </Badge>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs"
                style={{ color: 'var(--color-prism-text-secondary)' }}
              >
                <span>Last success: {device.lastSuccess}</span>
                <Button size="sm" variant="ghost" className="text-xs">
                  View logs
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3 text-sm" style={{ color: 'var(--color-prism-text-secondary)' }}>
          <p>
            Deployment is enabled because bundle compatibility checks passed and
            runtime risk is below 8 ms target.
          </p>
          <Button className="w-full">Deploy bundle</Button>
          <Button variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
