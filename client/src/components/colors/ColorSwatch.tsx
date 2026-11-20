import React from 'react';
import { Check, Copy } from 'lucide-react';
import { isLightColor } from '../../services/imageProcessing/colorConversions';
import type { ExtractedColor } from '../../types/colors';

export interface ColorSwatchProps {
  color: ExtractedColor;
  selected: boolean;
  copied: boolean;
  onSelectAndCopy: (color: ExtractedColor) => void;
  onCopyHex: (hex: string, colorId: string) => void;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  selected,
  copied,
  onSelectAndCopy,
  onCopyHex
}) => {
  const lightSurface = isLightColor(color.rgb);

  return (
    <div
      className={[
        'group rounded-xl border bg-surface overflow-hidden transition-colors duration-150',
        selected
          ? 'border-accent ring-2 ring-accent/15'
          : 'border-border hover:border-border-strong'
      ].join(' ')}
    >
      {/* Swatch preview button: selects colour AND copies HEX */}
      <button
        type="button"
        onClick={() => onSelectAndCopy(color)}
        aria-pressed={selected}
        aria-label={`Select colour rank ${color.rank}, ${color.hex}, ${color.percentage.toFixed(1)} percent coverage, and copy HEX`}
        className="w-full h-24 p-2.5 flex flex-col justify-between text-left border-b border-border cursor-pointer focus-visible:outline-offset-[-2px]"
        style={{ backgroundColor: color.hex }}
      >
        <div className="flex items-center justify-between gap-2 w-full">
          <span
            className={[
              'text-[11px] font-mono font-medium tabular-nums',
              lightSurface ? 'text-[#202124]/80' : 'text-white/90'
            ].join(' ')}
          >
            #{color.rank}
          </span>

          {copied && (
            <span
              className={[
                'inline-flex items-center gap-1 text-[11px] font-medium',
                lightSurface ? 'text-[#202124]' : 'text-white'
              ].join(' ')}
            >
              <Check className="w-3 h-3" aria-hidden="true" />
              <span>Copied</span>
            </span>
          )}
        </div>
      </button>

      {/* Swatch metadata row with dedicated copy-HEX button */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCopyHex(color.hex, color.id)}
          aria-label={`Copy HEX value ${color.hex}`}
          title={`Copy ${color.hex}`}
          className="inline-flex items-center gap-1.5 font-mono text-[13px] font-medium text-ink hover:text-accent transition-colors cursor-pointer rounded px-1 -ml-1 py-0.5"
        >
          <span>{color.hex}</span>
          {copied ? (
            <Check className="w-3 h-3 text-[#34D399] shrink-0" aria-hidden="true" />
          ) : (
            <Copy
              className="w-3 h-3 text-muted/70 group-hover:text-muted shrink-0"
              aria-hidden="true"
            />
          )}
        </button>

        <span className="font-mono text-xs text-muted tabular-nums shrink-0">
          {color.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
