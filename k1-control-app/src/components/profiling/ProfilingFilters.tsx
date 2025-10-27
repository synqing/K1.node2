import { Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface ProfilingFiltersProps {
  selectedEffect: string;
  onEffectChange: (effect: string) => void;
  timeRange: '100' | '500' | '1000';
  onTimeRangeChange: (range: '100' | '500' | '1000') => void;
  showComparison: boolean;
  onComparisonToggle: (show: boolean) => void;
  disabled: boolean;
}

export function ProfilingFilters({
  selectedEffect,
  onEffectChange,
  timeRange,
  onTimeRangeChange,
  showComparison,
  onComparisonToggle,
  disabled,
}: ProfilingFiltersProps) {
  const handleExport = () => {
    toast.success('Profiling data exported', {
      description: 'CSV file downloaded to your device',
    });
  };

  return (
    <div className="p-4 flex items-center gap-4 bg-[var(--k1-bg-elev)]">
      {/* Effect Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide whitespace-nowrap">
          Effect
        </Label>
        <Select value={selectedEffect} onValueChange={onEffectChange} disabled={disabled}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Effects</SelectItem>
            <SelectItem value="analog">Analog</SelectItem>
            <SelectItem value="spectrum">Spectrum</SelectItem>
            <SelectItem value="octave">Octave</SelectItem>
            <SelectItem value="metronome">Metronome</SelectItem>
            <SelectItem value="spectronome">Spectronome</SelectItem>
            <SelectItem value="hype">Hype</SelectItem>
            <SelectItem value="bloom">Bloom</SelectItem>
            <SelectItem value="pulse">PULSE</SelectItem>
            <SelectItem value="sparkle">SPARKLE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Range */}
      <div className="flex items-center gap-2">
        <Label className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide whitespace-nowrap">
          Range
        </Label>
        <div className="flex gap-1 bg-[var(--k1-panel)] p-1 rounded-lg">
          {(['100', '500', '1000'] as const).map((range) => (
            <button
              key={range}
              onClick={() => !disabled && onTimeRangeChange(range)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded text-[10px] transition-colors ${
                timeRange === range
                  ? 'bg-[var(--k1-accent)] text-[var(--k1-bg)]'
                  : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Last {range}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="comparison"
          checked={showComparison}
          onCheckedChange={onComparisonToggle}
          disabled={disabled}
        />
        <Label htmlFor="comparison" className="text-[var(--k1-text-dim)] cursor-pointer">
          Phase Comparison
        </Label>
      </div>

      {/* Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={disabled}
        className="ml-auto"
      >
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>

      {/* Update Indicator */}
      {!disabled && (
        <div className="flex items-center gap-2 text-[10px] text-[var(--k1-text-dim)]">
          <div className="w-2 h-2 rounded-full bg-[var(--k1-success)] animate-pulse" />
          Updating ~10Hz
        </div>
      )}
    </div>
  );
}
