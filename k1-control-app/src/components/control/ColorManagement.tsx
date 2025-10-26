import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';
import { useK1Actions, useK1State } from '../../providers/K1Provider';
import { K1_PALETTES, K1_PATTERNS } from '../../api/k1-data';
import { K1_PATTERN_HINTS, K1_HINTS_CONFIG } from '../../api/k1-hints';
import { savePatternPreset, loadPatternPreset } from '../../utils/persistence';

interface ColorManagementProps {
  disabled: boolean;
}

// Modes for color motion behavior
const COLOR_MODES = [
  { key: 'static', label: 'Static' },
  { key: 'jitter', label: 'Jitter' },
  { key: 'travel', label: 'Travel' },
  { key: 'harmonic', label: 'Harmonic' },
  { key: 'range', label: 'Hue Range' },
] as const;

export function ColorManagement({ disabled }: ColorManagementProps) {
  const [selectedPalette, setSelectedPalette] = useState<number>(K1_PALETTES[0]?.id ?? 0);

  // Anchors & HSV
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(70);
  const [value, setValue] = useState(90);

  // Color Motion
  const [mode, setMode] = useState<typeof COLOR_MODES[number]['key']>('static');
  const [randomness, setRandomness] = useState(30); // reused as color_range amplitude
  const [motionSpeed, setMotionSpeed] = useState(40); // custom_param_3
  const [accentProb, setAccentProb] = useState(10); // custom_param_2 (probability)
  const [harmonicSet, setHarmonicSet] = useState<'complementary' | 'triad' | 'tetrad'>('complementary');

  // Hue Range fallback controls
  const [startHue, setStartHue] = useState(0);
  const [endHue, setEndHue] = useState(180);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Track last applied preset params for divergence detection
  const lastPresetParamsRef = useRef<Record<string, number> | null>(null);
  const divergenceTimerRef = useRef<number | null>(null);
  const toleranceDefaultsRef = useRef<Record<string, number>>(K1_HINTS_CONFIG.default_divergence_tolerance);
  const divergenceToleranceRef = useRef<Record<string, number>>(toleranceDefaultsRef.current);
  const debounceMsRef = useRef<number>(K1_HINTS_CONFIG.default_debounce_ms);
  const [devSensitivityOn, setDevSensitivityOn] = useState<boolean>(typeof localStorage !== 'undefined' && localStorage.getItem('k1.debug.sensitivity') === '1');
  const queue = useCoalescedParams();
  const actions = useK1Actions();
  const state = useK1State();

  // Pattern-aware hints
  const selectedPatternMeta = K1_PATTERNS.find(
    (p) => p.id === state.selectedPatternId || p.index === Number(state.selectedPatternId)
  );

  const modeCode = (mKey: typeof COLOR_MODES[number]['key']) =>
    mKey === 'static' ? 0 : mKey === 'jitter' ? 1 : mKey === 'travel' ? 2 : mKey === 'harmonic' ? 3 : 4;

  const getSuggestedModes = (category?: string) => {
    switch (category) {
      case 'static':
        return ['harmonic', 'range', 'static'] as const;
      case 'audio-reactive':
        return ['jitter', 'travel', 'harmonic'] as const;
      case 'beat-reactive':
        return ['travel', 'harmonic', 'jitter'] as const;
      case 'procedural':
        return ['travel', 'jitter', 'range'] as const;
      default:
        return ['jitter', 'travel'] as const;
    }
  };

  const suggested =
    selectedPatternMeta && K1_PATTERN_HINTS[selectedPatternMeta.id]?.mode_order
      ? K1_PATTERN_HINTS[selectedPatternMeta.id].mode_order
      : getSuggestedModes(selectedPatternMeta?.category);

  useEffect(() => {
    if (!state.selectedPatternId) {
      setActivePreset(null);
      lastPresetParamsRef.current = null;
      divergenceToleranceRef.current = toleranceDefaultsRef.current;
      debounceMsRef.current = K1_HINTS_CONFIG.default_debounce_ms;
      return;
    }
    const lastPreset = loadPatternPreset(state.selectedPatternId);
    setActivePreset(lastPreset);
    // Reset lastPresetParams on pattern change; will be set when preset applied
    lastPresetParamsRef.current = null;

    // Merge pattern-level tolerance and debounce from catalog
    const patId = selectedPatternMeta?.id;
    const patHints = patId ? K1_PATTERN_HINTS[patId] : undefined;
    const patternTol = patHints?.divergence_tolerance ?? {};
    divergenceToleranceRef.current = { ...toleranceDefaultsRef.current, ...patternTol };
    debounceMsRef.current = patHints?.debounce_ms ?? K1_HINTS_CONFIG.default_debounce_ms;
  }, [state.selectedPatternId]);

  const hsvToHex = (h: number, s: number, v: number) => {
    s = s / 100;
    v = v / 100;
    const c = v * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hh >= 0 && hh < 1) { r = c; g = x; }
    else if (hh >= 1 && hh < 2) { r = x; g = c; }
    else if (hh >= 2 && hh < 3) { g = c; b = x; }
    else if (hh >= 3 && hh < 4) { g = x; b = c; }
    else if (hh >= 4 && hh < 5) { r = x; b = c; }
    else { r = c; b = x; }
    const m = v - c;
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const currentColor = hsvToHex(hue, saturation, value);

  // Dispatch helpers
  const dispatchHuePercent = (deg: number) => {
    const huePct = Math.round((deg / 360) * 100);
    queue({ color: huePct });
  };

  const dispatchRangeFromStartEnd = (start: number, end: number) => {
    const widthDegRaw = (end - start + 360) % 360;
    const widthDeg = widthDegRaw === 0 ? 360 : widthDegRaw; // 0 means full circle
    const centerHue = (start + widthDeg / 2) % 360;
    const colorPct = Math.round((centerHue / 360) * 100);
    const rangePct = Math.round((widthDeg / 360) * 100);
    queue({ color: colorPct, color_range: rangePct });
  };

  // Divergence detection with thresholds (catalog-driven)
  const isAlmostEqual = (key: string, a: number, b: number) => {
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    const diff = Math.abs(a - b);
    const tol = divergenceToleranceRef.current[key] ?? divergenceToleranceRef.current['default'] ?? 2;
    return diff <= tol;
  };

  useEffect(() => {
    if (!activePreset || !state.parameters || !lastPresetParamsRef.current) return;
    if (divergenceTimerRef.current) {
      window.clearTimeout(divergenceTimerRef.current);
    }
    divergenceTimerRef.current = window.setTimeout(() => {
       const presetParams = lastPresetParamsRef.current!;
       let diverged = false;
       for (const [key, presetVal] of Object.entries(presetParams)) {
         const currentVal = (state.parameters as any)[key];
         if (typeof presetVal === 'number' && typeof currentVal === 'number') {
           if (!isAlmostEqual(key, presetVal, currentVal)) {
             diverged = true;
             break;
           }
         } else if (presetVal !== currentVal) {
           diverged = true;
           break;
         }
       }
       if (diverged && state.selectedPatternId) {
         setActivePreset(null);
         savePatternPreset(state.selectedPatternId, '');
         lastPresetParamsRef.current = null;
       }
    }, debounceMsRef.current);
    return () => {
      if (divergenceTimerRef.current) {
        window.clearTimeout(divergenceTimerRef.current);
      }
    };
  }, [activePreset, state.parameters, state.selectedPatternId]);

  return (
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      <h3 className="text-[var(--k1-text)] mb-4">Color Management</h3>

      {/* Palette Grid */}
      <div className="space-y-3 mb-6">
        <Label className="text-[var(--k1-text-dim)]">Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {K1_PALETTES.map((palette) => (
            <TooltipProvider key={palette.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (disabled) return;
                      setSelectedPalette(palette.id);
                      actions.setPalette(palette.id).catch(() => {});
                    }}
                    disabled={disabled}
                    className={`h-10 rounded-lg border-2 transition-all ${
                      selectedPalette === palette.id
                        ? 'border-[var(--k1-accent)] scale-105'
                        : 'border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ background: palette.gradient }}
                    aria-label={`Palette: ${palette.name}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{palette.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Color Motion Modes */}
      <div className="space-y-3 mb-6">
        <Label className="text-[var(--k1-text-dim)]">Color Motion</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                if (disabled) return;
                setMode(m.key);
                // Encode mode for firmware using custom_param_1 (safe placeholder)
                queue({ custom_param_1: modeCode(m.key) });
              }}
              disabled={disabled}
              className={`px-3 py-1 rounded border text-[12px] transition ${
                mode === m.key
                  ? 'bg-[var(--k1-accent)] text-white border-[var(--k1-accent)]'
                  : 'bg-[var(--k1-bg)] text-[var(--k1-text)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Helper Hints */}
        <div className="mt-3 p-2 rounded bg-[var(--k1-bg-elev)] border border-[var(--k1-border)]">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-[var(--k1-text-dim)]">
              {selectedPatternMeta ? (
                <span>
                  Tips for <span className="text-[var(--k1-text)]">{selectedPatternMeta.name}</span> ·
                  <span className="ml-1">{selectedPatternMeta.category.replace('-', ' ')}</span>
                  {selectedPatternMeta.is_audio_reactive ? (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-[var(--k1-panel)] text-[8px] border border-[var(--k1-border)]">Audio Reactive</span>
                  ) : (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-[var(--k1-panel)] text-[8px] border border-[var(--k1-border)]">Non-Audio</span>
                  )}
                </span>
              ) : (
                <span>Mode suggestions</span>
              )}
            </div>
            <div className="flex gap-1">
              {suggested.map((s) => (
                <TooltipProvider key={s}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (disabled) return;
                          setMode(s);
                          queue({ custom_param_1: modeCode(s) });
                        }}
                        disabled={disabled}
                        className={`px-2 py-0.5 rounded border text-[10px] transition ${
                          mode === s
                            ? 'bg-[var(--k1-accent)] text-white border-[var(--k1-accent)]'
                            : 'bg-[var(--k1-bg)] text-[var(--k1-text)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {s === 'range' ? 'Hue Range' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{
                        s === 'jitter' ? 'Adds subtle randomness for lively color.' :
                        s === 'travel' ? 'Moves color over time; great with flowing visuals.' :
                        s === 'harmonic' ? 'Locks relationships (complementary/triad/tetrad).' :
                        s === 'range' ? 'Constrain hues to a span; good for branding.' :
                        'Stable colors without motion.'
                      }</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Quick Presets from Catalog */}
          {selectedPatternMeta && K1_PATTERN_HINTS[selectedPatternMeta.id] && (
            <div className="mt-2">
              <div className="text-[10px] text-[var(--k1-text-dim)] mb-1">Quick Presets</div>
              <div className="flex items-center gap-2 mb-2">
                {activePreset && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="px-2 py-0.5 rounded border text-[10px] bg-[var(--k1-panel)] border-[var(--k1-border)] text-[var(--k1-text)]">
                          Active: {activePreset}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-[family-name:var(--k1-code-family)] text-[10px]">
                          {lastPresetParamsRef.current
                            ? Object.entries(lastPresetParamsRef.current)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(', ')
                            : 'Preset parameters applied'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {activePreset && (
                  <button
                    onClick={() => {
                      setActivePreset(null);
                      if (state.selectedPatternId) {
                        savePatternPreset(state.selectedPatternId, '');
                      }
                      lastPresetParamsRef.current = null;
                    }}
                    disabled={disabled}
                    className={`px-2 py-0.5 rounded border text-[10px] transition ${
                      'bg-[var(--k1-bg)] text-[var(--k1-text)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {K1_PATTERN_HINTS[selectedPatternMeta.id].presets.map((preset) => (
                  <TooltipProvider key={preset.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (disabled) return;
                            // Apply all preset params via coalesced queue
                            queue(preset.params);
                            setActivePreset(preset.label);
                            lastPresetParamsRef.current = preset.params as any;
                            // Merge preset-level tolerance overrides
                            const patId = selectedPatternMeta?.id;
                            const patHints = patId ? K1_PATTERN_HINTS[patId] : undefined;
                            const patternTol = patHints?.divergence_tolerance ?? {};
                            const presetTol = preset.tolerance ?? {};
                            divergenceToleranceRef.current = { ...toleranceDefaultsRef.current, ...patternTol, ...presetTol };
                            if (state.selectedPatternId) {
                              savePatternPreset(state.selectedPatternId, preset.label);
                            }
                          }}
                          disabled={disabled}
                          className={`px-2 py-0.5 rounded border text-[10px] transition ${
                            'bg-[var(--k1-bg)] text-[var(--k1-text)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {preset.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{preset.description || 'Applies tuned parameters.'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>

              {/* Recommended Palettes */}
              {K1_PATTERN_HINTS[selectedPatternMeta.id].recommended_palettes?.length ? (
                <div className="mt-2">
                  <div className="text-[10px] text-[var(--k1-text-dim)] mb-1">Recommended Palettes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {K1_PATTERN_HINTS[selectedPatternMeta.id].recommended_palettes!.map((pid) => {
                      const pal = K1_PALETTES.find((p) => p.id === pid);
                      if (!pal) return null;
                      return (
                        <TooltipProvider key={pid}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  if (disabled) return;
                                  setSelectedPalette(pid);
                                  actions.setPalette(pid).catch(() => {});
                                }}
                                disabled={disabled}
                                className={`px-2 py-0.5 rounded border text-[10px] transition ${
                                  selectedPalette === pid
                                    ? 'bg-[var(--k1-accent)] text-white border-[var(--k1-accent)]'
                                    : 'bg-[var(--k1-bg)] text-[var(--k1-text)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {pal.name}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Palette #{pal.id}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {K1_PATTERN_HINTS[selectedPatternMeta.id].notes ? (
                <div className="mt-2 text-[10px] text-[var(--k1-text-dim)]">
                  {K1_PATTERN_HINTS[selectedPatternMeta.id].notes}
                </div>
              ) : null}
              {(import.meta as any).env?.DEV && devSensitivityOn && (
                <div className="mt-3 p-2 rounded bg-[var(--k1-bg)] border border-[var(--k1-border)]">
                  <div className="text-[10px] text-[var(--k1-text-dim)] mb-1">Sensitivity Debug</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-[family-name:var(--k1-code-family)]">
                    <div>
                      <div className="text-[var(--k1-text)]">Debounce</div>
                      <div>{debounceMsRef.current} ms</div>
                    </div>
                    <div>
                      <div className="text-[var(--k1-text)]">Active Preset</div>
                      <div>{activePreset || 'None'}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-[var(--k1-text)] text-[10px]">Tolerances</div>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      {Object.entries(divergenceToleranceRef.current).map(([k, v]) => (
                        <div key={k} className="px-1 py-0.5 rounded bg-[var(--k1-panel)] border border-[var(--k1-border)] text-[10px]">
                          {k}: {v}
                        </div>
                      ))}
                    </div>
                  </div>
                  {activePreset && lastPresetParamsRef.current && state.parameters && (
                    <div className="mt-2">
                      <div className="text-[var(--k1-text)] text-[10px]">Differences</div>
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {Object.entries(lastPresetParamsRef.current).map(([k, pv]) => {
                          const cv = (state.parameters as any)[k];
                          if (typeof pv !== 'number' || typeof cv !== 'number') return null;
                          const diff = Math.abs(cv - pv);
                          const tol = divergenceToleranceRef.current[k] ?? divergenceToleranceRef.current['default'] ?? 2;
                          const within = diff <= tol;
                          return (
                            <div key={k} className={`px-1 py-0.5 rounded border text-[10px] ${within ? 'bg-[var(--k1-success)]/10 border-[var(--k1-success)]' : 'bg-[var(--k1-error)]/10 border-[var(--k1-error)]'}`}>
                              {k}: Δ{diff} ≤ {tol} {within ? '✓' : '✕'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual Controls */}
      <div className="space-y-4 pt-4 border-t border-[var(--k1-border)]">
        <Label className="text-[var(--k1-text-dim)]">Manual HSV + Motion</Label>

        {/* Hue Anchor (hidden for range mode to avoid confusion) */}
        {mode !== 'range' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[var(--k1-text)]">Hue</Label>
              <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                {hue}°
              </span>
            </div>
            <Slider
              min={0}
              max={360}
              step={1}
              value={[hue]}
              onValueChange={([value]: number[]) => {
                setHue(value);
                if (!disabled) {
                  dispatchHuePercent(value);
                }
              }}
              disabled={disabled}
              className="w-full"
            />
          </div>
        )}

        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Saturation</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {saturation}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[saturation]}
            onValueChange={([value]: number[]) => {
              setSaturation(value);
              if (!disabled) {
                queue({ saturation: value });
              }
            }}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Brightness (Value) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Brightness</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {value}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[value]}
            onValueChange={([v]: number[]) => {
              setValue(v);
              if (!disabled) {
                queue({ brightness: v });
              }
            }}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Mode-specific Controls */}
        {mode === 'jitter' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[var(--k1-text)]">Color Jitter</Label>
              <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                {randomness}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[randomness]}
              onValueChange={([value]: number[]) => {
                setRandomness(value);
                if (!disabled) {
                  queue({ color_range: value });
                }
              }}
              disabled={disabled}
              className="w-full"
            />
          </div>
        )}

        {mode === 'travel' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--k1-text)]">Motion Speed</Label>
                <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                  {motionSpeed}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[motionSpeed]}
                onValueChange={([value]: number[]) => {
                  setMotionSpeed(value);
                  if (!disabled) {
                    queue({ custom_param_3: value });
                  }
                }}
                disabled={disabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--k1-text)]">Accent Probability</Label>
                <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                  {accentProb}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[accentProb]}
                onValueChange={([value]: number[]) => {
                  setAccentProb(value);
                  if (!disabled) {
                    queue({ custom_param_2: value });
                  }
                }}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        )}

        {mode === 'harmonic' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--k1-text)]">Harmonic Set</Label>
              <div className="flex gap-2">
                {['complementary', 'triad', 'tetrad'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (disabled) return;
                      const val = opt as 'complementary' | 'triad' | 'tetrad';
                      setHarmonicSet(val);
                      const code = val === 'complementary' ? 1 : val === 'triad' ? 2 : 3;
                      queue({ custom_param_2: code });
                    }}
                    disabled={disabled}
                    className={`px-3 py-1 rounded border text-[12px] transition ${
                      harmonicSet === opt
                        ? 'bg-[var(--k1-accent)] text-white border-[var(--k1-accent)]'
                        : 'bg-[var(--k1-bg)] text-[var(--k1-text)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--k1-text)]">Randomness</Label>
                <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                  {randomness}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[randomness]}
                onValueChange={([value]: number[]) => {
                  setRandomness(value);
                  if (!disabled) {
                    queue({ color_range: value });
                  }
                }}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        )}

        {mode === 'range' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--k1-text)]">Start Hue</Label>
                <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                  {startHue}°
                </span>
              </div>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[startHue]}
                onValueChange={([val]: number[]) => {
                  setStartHue(val);
                  if (!disabled) {
                    dispatchRangeFromStartEnd(val, endHue);
                  }
                }}
                disabled={disabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--k1-text)]">End Hue</Label>
                <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                  {endHue}°
                </span>
              </div>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[endHue]}
                onValueChange={([val]: number[]) => {
                  setEndHue(val);
                  if (!disabled) {
                    dispatchRangeFromStartEnd(startHue, val);
                  }
                }}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Color Preview */}
        <div className="flex items-center gap-3 pt-2">
          <div
            className="w-12 h-12 rounded-lg border-2 border-[var(--k1-border)]"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1">
            <Label className="text-[var(--k1-text-dim)] text-[10px]">Current Color</Label>
            <Input
              value={currentColor.toUpperCase()}
              readOnly
              className="font-[family-name:var(--k1-code-family)] h-8 mt-1"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
