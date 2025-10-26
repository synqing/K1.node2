import { useState } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Sun, HelpCircle } from 'lucide-react';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';

interface GlobalSettingsProps {
  disabled: boolean;
}

const blurStops = [0, 25, 50, 75, 100];

export function GlobalSettings({ disabled }: GlobalSettingsProps) {
  const [brightness, setBrightness] = useState(80);
  const [blur, setBlur] = useState(25);
  const [softness, setSoftness] = useState(40);
  const [gamma, setGamma] = useState(true);
  const [warmth, setWarmth] = useState(50);
  const { queue } = useCoalescedParams(80);

  const getBrightnessColor = (value: number) => {
    if (value < 30) return 'var(--k1-warning)';
    if (value > 90) return 'var(--k1-error)';
    return 'var(--k1-success)';
  };

  return (
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      <h3 className="text-[var(--k1-text)] mb-4">Global Settings</h3>

      <div className="space-y-6">
        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-[var(--k1-text-dim)]" />
              <Label className="text-[var(--k1-text)]">Brightness</Label>
            </div>
            <span
              className="font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--k1-bg)',
                color: getBrightnessColor(brightness),
              }}
            >
              {brightness}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[brightness]}
            onValueChange={([value]: number[]) => {
              setBrightness(value);
              queue({ brightness: value });
            }}
            disabled={disabled}
            className="w-full"
          />
          {brightness < 30 && (
            <p className="text-[10px] text-[var(--k1-warning)]">
              ⚠️ Low brightness may be difficult to see
            </p>
          )}
          {brightness > 90 && (
            <p className="text-[10px] text-[var(--k1-error)]">
              ⚠️ High brightness may cause eye strain
            </p>
          )}
        </div>

        {/* Blur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-[var(--k1-text)]">Blur</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-[var(--k1-text-dim)]" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Softens LED transitions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {blur}%
            </span>
          </div>
          <div className="relative">
            <Slider
              min={0}
              max={100}
              step={25}
              value={[blur]}
              onValueChange={([value]: number[]) => {
                setBlur(value);
                // Optional: map blur to softness if desired; keeping local-only for now
              }}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              {blurStops.map((stop) => (
                <div key={stop} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-[var(--k1-border)]" />
                  <span className="text-[8px] text-[var(--k1-text-dim)] mt-0.5">
                    {stop}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Softness with Mini Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Softness</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {softness}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[softness]}
            onValueChange={([value]: number[]) => {
              setSoftness(value);
              queue({ softness: value });
            }}
            disabled={disabled}
            className="w-full"
          />
          {/* Mini visualization */}
          <div className="h-8 bg-[var(--k1-bg)] rounded flex items-end gap-px p-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.sin(i * 0.3) * 0.5 + 0.5;
              const smoothedHeight = height * (1 - softness / 100) + (softness / 100) * 0.5;
              return (
                <div
                  key={i}
                  className="flex-1 bg-[var(--k1-accent)] rounded-sm transition-all"
                  style={{ height: `${smoothedHeight * 100}%`, opacity: 0.6 }}
                />
              );
            })}
          </div>
        </div>

        {/* Gamma Correction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-[var(--k1-text)]">Gamma Correction</Label>
              <p className="text-[10px] text-[var(--k1-text-dim)]">
                Adjusts color curve for better perception
              </p>
            </div>
            <Switch
              checked={gamma}
              onCheckedChange={setGamma}
              disabled={disabled}
            />
          </div>
          {/* Curve preview */}
          <div className="h-12 bg-[var(--k1-bg)] rounded p-2 relative">
            <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
              {/* Linear (off) */}
              <path
                d="M 0 40 L 100 0"
                stroke="var(--k1-text-dim)"
                strokeWidth="1"
                fill="none"
                opacity={gamma ? 0.3 : 0.8}
                strokeDasharray={gamma ? "2,2" : "none"}
              />
              {/* Gamma curve (on) */}
              <path
                d="M 0 40 Q 30 30, 60 15 T 100 0"
                stroke="var(--k1-accent)"
                strokeWidth="1.5"
                fill="none"
                opacity={gamma ? 1 : 0.3}
              />
            </svg>
          </div>
        </div>

        {/* Warmth */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Warmth</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {warmth > 50 ? '+' : warmth < 50 ? '-' : '±'}{Math.abs(warmth - 50)}
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[warmth]}
            onValueChange={([value]: number[]) => {
              setWarmth(value);
              queue({ warmth: value });
            }}
            disabled={disabled}
            className="w-full"
          />
          {/* Color temperature preview */}
          <div
            className="h-4 rounded"
            style={{
              background: `linear-gradient(90deg, 
                hsl(200, 80%, 60%), 
                hsl(0, 0%, 100%), 
                hsl(30, 100%, 60%)
              )`,
              position: 'relative',
            }}
          >
            <div
              className="absolute top-0 w-1 h-full bg-[var(--k1-text)] rounded-full"
              style={{ left: `${warmth}%`, transform: 'translateX(-50%)' }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
