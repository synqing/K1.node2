import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { Activity, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';

/**
 * COMPONENT LIBRARY SHOWCASE
 * Emotiscope 2.0 Control Dashboard Design System
 * 
 * This file demonstrates all UI components with their variants,
 * states, and usage examples following the PRISM.node design tokens.
 */

export function ComponentLibrary() {
  return (
    <div className="min-h-screen bg-[var(--k1-bg)] p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-[var(--k1-text)] mb-2">Component Library</h1>
          <p className="text-[var(--k1-text-dim)]">
            Emotiscope 2.0 Control Dashboard • Design System Reference
          </p>
        </div>

        {/* Design Tokens */}
        <section>
          <h2 className="text-[var(--k1-text)] mb-4">Design Tokens</h2>
          <div className="grid grid-cols-4 gap-4">
            {/* Colors */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Colors</h3>
              <div className="space-y-2">
                <ColorSwatch label="Background" color="var(--k1-bg)" hex="#0F1115" />
                <ColorSwatch label="Elevated BG" color="var(--k1-bg-elev)" hex="#151923" />
                <ColorSwatch label="Panel" color="var(--k1-panel)" hex="#1A1F2B" />
                <ColorSwatch label="Text" color="var(--k1-text)" hex="#E6E9EF" />
                <ColorSwatch label="Text Dim" color="var(--k1-text-dim)" hex="#B5BDCA" />
                <ColorSwatch label="Accent (Cyan)" color="var(--k1-accent)" hex="#6EE7F3" />
                <ColorSwatch label="Accent 2 (Purple)" color="var(--k1-accent-2)" hex="#A78BFA" />
              </div>
            </Card>

            {/* Status Colors */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Status</h3>
              <div className="space-y-2">
                <ColorSwatch label="Success" color="var(--k1-success)" hex="#34D399" />
                <ColorSwatch label="Warning" color="var(--k1-warning)" hex="#F59E0B" />
                <ColorSwatch label="Error" color="var(--k1-error)" hex="#EF4444" />
                <ColorSwatch label="Info" color="var(--k1-info)" hex="#6EE7F3" />
              </div>
            </Card>

            {/* Port Colors */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Port Types</h3>
              <div className="space-y-2">
                <ColorSwatch label="Scalar" color="var(--port-scalar)" hex="#F59E0B" />
                <ColorSwatch label="Field" color="var(--port-field)" hex="#22D3EE" />
                <ColorSwatch label="Color" color="var(--port-color)" hex="#F472B6" />
                <ColorSwatch label="Output" color="var(--port-output)" hex="#34D399" />
              </div>
            </Card>

            {/* Typography */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Typography</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-[var(--k1-text-dim)]">Body (Inter)</div>
                  <div className="text-[var(--k1-text)]">14px Regular</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--k1-text-dim)]">Code (JetBrains Mono)</div>
                  <div className="font-[family-name:var(--k1-code-family)] text-[var(--k1-text)]">
                    12px Mono
                  </div>
                </div>
                <div className="space-y-1 text-[8px] text-[var(--k1-text-dim)]">
                  <div>Spacing: 8/12/16/24/32</div>
                  <div>Radius: 4/8/12</div>
                  <div>Motion: 120/180/300ms</div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-[var(--k1-text)] mb-4">Buttons</h2>
          <div className="grid grid-cols-3 gap-6">
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Variants</h3>
              <div className="space-y-2">
                <Button className="w-full">Primary (Cyan)</Button>
                <Button variant="secondary" className="w-full">Secondary</Button>
                <Button variant="outline" className="w-full">Outline</Button>
                <Button variant="ghost" className="w-full">Ghost</Button>
                <Button variant="destructive" className="w-full">Destructive</Button>
              </div>
            </Card>

            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Sizes</h3>
              <div className="space-y-2">
                <Button size="sm" className="w-full">Small</Button>
                <Button className="w-full">Default</Button>
                <Button size="lg" className="w-full">Large</Button>
                <Button size="icon">
                  <Activity className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">States</h3>
              <div className="space-y-2">
                <Button className="w-full">Default</Button>
                <Button className="w-full" disabled>Disabled</Button>
                <Button className="w-full">
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Loading
                </Button>
                <Button className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  With Icon
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* Form Controls */}
        <section>
          <h2 className="text-[var(--k1-text)] mb-4">Form Controls</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Inputs */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Input Fields</h3>
              <div className="space-y-3">
                <Input placeholder="Default input" />
                <Input placeholder="Disabled input" disabled />
                <Input
                  placeholder="Error state"
                  className="border-[var(--k1-error)]"
                />
                <Input
                  placeholder="Monospace"
                  className="font-[family-name:var(--k1-code-family)]"
                />
              </div>
            </Card>

            {/* Selects */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Select Dropdowns</h3>
              <div className="space-y-3">
                <Select defaultValue="option1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Disabled" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Sliders */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Sliders</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--k1-text-dim)]">Default</span>
                    <span className="text-[var(--k1-text)]">50%</span>
                  </div>
                  <Slider defaultValue={[50]} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--k1-text-dim)]">Disabled</span>
                    <span className="text-[var(--k1-text-dim)]">75%</span>
                  </div>
                  <Slider defaultValue={[75]} disabled />
                </div>
              </div>
            </Card>

            {/* Switches */}
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Switches</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--k1-text)]">Enabled</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--k1-text)]">Disabled</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--k1-text-dim)]">Disabled State</span>
                  <Switch disabled />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Badges & Status */}
        <section>
          <h2 className="text-[var(--k1-text)] mb-4">Badges & Status Indicators</h2>
          <div className="grid grid-cols-3 gap-6">
            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Badge Variants</h3>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </Card>

            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Status Pills</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--k1-success)]" />
                  <span className="text-[var(--k1-text)]">Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--k1-warning)] animate-pulse" />
                  <span className="text-[var(--k1-text)]">Connecting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--k1-error)]" />
                  <span className="text-[var(--k1-text)]">Error</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
              <h3 className="text-[var(--k1-text)] mb-3">Progress Bars</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-[var(--k1-text-dim)] mb-1">Success</div>
                  <Progress value={60} indicatorClassName="bg-[var(--k1-success)]" />
                </div>
                <div>
                  <div className="text-[10px] text-[var(--k1-text-dim)] mb-1">Warning</div>
                  <Progress value={75} indicatorClassName="bg-[var(--k1-warning)]" />
                </div>
                <div>
                  <div className="text-[10px] text-[var(--k1-text-dim)] mb-1">Error</div>
                  <Progress value={90} indicatorClassName="bg-[var(--k1-error)]" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Alerts & Notifications */}
        <section>
          <h2 className="text-[var(--k1-text)] mb-4">Alerts & Notifications</h2>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>
                This is an informational message with additional context.
              </AlertDescription>
            </Alert>

            <Alert className="border-[var(--k1-success)] text-[var(--k1-success)]">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription className="text-[var(--k1-text)]">
                Operation completed successfully.
              </AlertDescription>
            </Alert>

            <Alert className="border-[var(--k1-warning)] text-[var(--k1-warning)]">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription className="text-[var(--k1-text)]">
                Please review this important information.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                An error occurred. Please try again.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => {
                toast.success('Toast notification', {
                  description: 'This is a success toast message',
                });
              }}
            >
              Show Toast Notification
            </Button>
          </div>
        </section>

        {/* Navigation */}
        <section>
          <h2 className="text-[var(--k1-text)] mb-4">Navigation & Tabs</h2>
          <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Control Panel</TabsTrigger>
                <TabsTrigger value="tab2">Profiling</TabsTrigger>
                <TabsTrigger value="tab3">Terminal</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="mt-4">
                <p className="text-[var(--k1-text-dim)]">Control Panel content</p>
              </TabsContent>
              <TabsContent value="tab2" className="mt-4">
                <p className="text-[var(--k1-text-dim)]">Profiling content</p>
              </TabsContent>
              <TabsContent value="tab3" className="mt-4">
                <p className="text-[var(--k1-text-dim)]">Terminal content</p>
              </TabsContent>
            </Tabs>
          </Card>
        </section>
      </div>
    </div>
  );
}

// Helper component for color swatches
function ColorSwatch({ label, color, hex }: { label: string; color: string; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded border border-[var(--k1-border)]"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-[var(--k1-text)]">{label}</div>
        <div className="text-[8px] text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)]">
          {hex}
        </div>
      </div>
    </div>
  );
}
