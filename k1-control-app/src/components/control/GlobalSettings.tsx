import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';

interface GlobalSettingsProps {
  disabled: boolean;
}

export function GlobalSettings({ disabled }: GlobalSettingsProps) {
  // Brightness is unified under Color Management; keep local for display only
  const [brightness, setBrightness] = useState(90);
  const [softness, setSoftness] = useState(50);
  const [warmth, setWarmth] = useState(50);

  const queue = useCoalescedParams();

  // Remove brightness dispatches to avoid duplicate control
  useEffect(() => {
    // No brightness updates here; handled in ColorManagement
  }, [brightness]);

  return (
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      <h3 className="text-[var(--k1-text)] mb-4">Global Settings</h3>

      {/* Brightness moved */}
      <div className="space-y-2 opacity-70">
        <div className="flex items-center justify-between">
          <Label className="text-[var(--k1-text)]">Brightness (moved to Color Management)</Label>
          <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
            {brightness}%
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[brightness]}
          onValueChange={([v]: number[]) => setBrightness(v)}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-[var(--k1-text-dim)] text-[11px]">Use Color Management → Brightness.</p>
      </div>

      {/* Softness */}
      <div className="space-y-2 mt-6">
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
          onValueChange={([v]: number[]) => {
            setSoftness(v);
            if (!disabled) {
              queue({ softness: v });
            }
          }}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Warmth */}
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-[var(--k1-text)]">Warmth</Label>
          <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
            {warmth}%
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[warmth]}
          onValueChange={([v]: number[]) => {
            setWarmth(v);
            if (!disabled) {
              queue({ warmth: v });
            }
          }}
          disabled={disabled}
          className="w-full"
        />
      </div>
    </Card>
  );
}
