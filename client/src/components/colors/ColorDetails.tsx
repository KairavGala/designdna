import React from 'react';
import { Check, Copy } from 'lucide-react';
import {
  formatHsl,
  formatRgb,
  isLightColor
} from '../../services/imageProcessing/colorConversions';
import type { ColorReliability, ExtractedColor } from '../../types/colors';
import { SectionCard } from '../ui/SectionCard';

export interface ColorDetailsProps {
  color: ExtractedColor;
  copiedKey: string | null;
  onCopyValue: (value: string, key: string) => void;
}

const RELIABILITY_LABELS: Record<ColorReliability, string> = {
  high: 'High · Flat measured surface',
  medium: 'Medium · Shaded or gradient region',
  low: 'Low · Broad photographic cluster'
};

export const ColorDetails: React.FC<ColorDetailsProps> = ({
  color,
  copiedKey,
  onCopyValue
}) => {
  const lightSurface = isLightColor(color.rgb);
  const rgbString = formatRgb(color.rgb);
  const hslString = formatHsl(color.hsl);

  const copyRows = [
    { key: `detail-hex-${color.id}`, label: 'HEX', value: color.hex },
    { key: `detail-rgb-${color.id}`, label: 'RGB', value: rgbString },
    { key: `detail-hsl-${color.id}`, label: 'HSL', value: hslString }
  ];

  return (
    <SectionCard
      title="Colour Details"
      description="Exact measured colour values for the selected cluster."
    >
      <div className="space-y-5">
        {/* Larger colour preview */}
        <div
          className="h-28 sm:h-32 rounded-lg border border-border p-3.5 flex flex-col justify-between"
          style={{ backgroundColor: color.hex }}
        >
          <div className="flex items-center justify-between">
            <span
              className={[
                'text-xs font-mono font-medium tabular-nums',
                lightSurface ? 'text-[#202124]/80' : 'text-white/85'
              ].join(' ')}
            >
              Rank #{color.rank}
            </span>
            <span
              className={[
                'text-xs font-mono tabular-nums',
                lightSurface ? 'text-[#202124]/80' : 'text-white/85'
              ].join(' ')}
            >
              {color.percentage.toFixed(1)}%
            </span>
          </div>
          <p
            className={[
              'font-mono text-base font-semibold tracking-tight',
              lightSurface ? 'text-[#202124]' : 'text-white'
            ].join(' ')}
          >
            {color.hex}
          </p>
        </div>

        {/* Copyable colour formats */}
        <dl className="divide-y divide-border border-y border-border text-sm">
          {copyRows.map((row) => {
            const isCopied = copiedKey === row.key;
            return (
              <div
                key={row.key}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <dt className="text-xs text-muted shrink-0">{row.label}</dt>
                <dd className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onCopyValue(row.value, row.key)}
                    aria-label={`Copy ${row.label} value ${row.value}`}
                    className="inline-flex items-center gap-2 font-mono text-[13px] font-medium text-ink hover:text-accent transition-colors cursor-pointer rounded px-1.5 py-0.5 -mr-1.5"
                  >
                    <span className="truncate">{row.value}</span>
                    {isCopied ? (
                      <Check
                        className="w-3.5 h-3.5 text-[#34D399] shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy
                        className="w-3.5 h-3.5 text-muted shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </dd>
              </div>
            );
          })}
        </dl>

        {/* Measured cluster metrics */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Pixel Count</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium text-ink tabular-nums">
              {color.pixelCount.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Area Share</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium text-ink tabular-nums">
              {color.percentage.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Rank</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium text-ink tabular-nums">
              #{color.rank}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Cluster Spread</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium text-ink tabular-nums">
              σ {color.intraClusterSpread.toFixed(1)} RGB
            </dd>
          </div>
          <div className="col-span-2 pt-2 border-t border-border">
            <dt className="text-xs text-muted">Measurement Reliability</dt>
            <dd className="mt-0.5 text-[13px] font-medium text-ink">
              {RELIABILITY_LABELS[color.reliability]}
            </dd>
          </div>
        </dl>

        {/* Honest measured vs. inferred boundary note */}
        <p className="text-xs text-muted leading-relaxed pt-3 border-t border-border">
          Measured directly from sampled pixels. Semantic design roles (primary brand, accent,
          background, text) are assigned separately by AI Visual Interpretation.
        </p>
      </div>
    </SectionCard>
  );
};
