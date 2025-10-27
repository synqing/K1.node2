import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';
import { Switch } from '../ui/switch';
import { useK1State } from '../../providers/K1Provider';

interface GlobalSettingsProps {
  disabled: boolean;
}

export function GlobalSettings({ disabled }: GlobalSettingsProps) {
  const state = useK1State();
  const params = state.parameters;

  // Brightness is unified under Color Management; keep local for display only
  const [brightness, setBrightness] = useState(params.brightness);
  const [softness, setSoftness] = useState(params.softness);
  const [warmth, setWarmth] = useState(params.warmth);
  const [background, setBackground] = useState(params.background);
  const [ditheringEnabled, setDitheringEnabled] = useState((params.dithering ?? 100) >= 50);

  const { queue } = useCoalescedParams();

  // Sync local UI state whenever provider parameters change (e.g., external updates)
  useEffect(() => {
    setBrightness(params.brightness);
    setSoftness(params.softness);
    setWarmth(params.warmth);
    setBackground(params.background);
    setDitheringEnabled((params.dithering ?? 100) >= 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.brightness, params.softness, params.warmth, params.background, params.dithering]);

  // Remove brightness dispatches to avoid duplicate control
  useEffect(() => {
    // No brightness updates here; handled in ColorManagement
  }, [brightness]);

  return (
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      <h3 className="text-[12px] uppercase tracking-wide text-[var(--k1-text-dim)] mb-4">Global Settings</h3>

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

      {/* Background */}
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-[var(--k1-text)]">Background</Label>
          <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
            {background}%
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[background]}
          onValueChange={([v]: number[]) => {
            setBackground(v);
            if (!disabled) {
              queue({ background: v });
            }
          }}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Dithering Toggle */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-[var(--k1-text)]">Dithering</Label>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-[family-name:var(--k1-code-family)] ${ditheringEnabled 
              ? 'bg-[var(--k1-accent)]/20 text-[var(--k1-accent)]'
              : 'bg-[var(--k1-bg)] text-[var(--k1-text-dim)] border border-[var(--k1-border)]'}`}
          >
            {ditheringEnabled ? 'On' : 'Off'}
          </span>
        </div>
        <Switch
          checked={ditheringEnabled}
          onCheckedChange={(enabled: boolean) => {
            setDitheringEnabled(enabled);
            if (!disabled) {
              queue({ dithering: enabled ? 100 : 0 });
            }
          }}
          disabled={disabled}
          aria-label="Toggle Dithering"
        />
      </div>
    </Card>
  );
}
