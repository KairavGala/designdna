import React from 'react';
import type { DesignToken } from '../../types/designSystem';

export interface TokenVisualSwatchProps {
  token: DesignToken;
}

function parsePxNumber(value: string, fallback: number): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const TokenVisualSwatch: React.FC<TokenVisualSwatchProps> = ({ token }) => {
  switch (token.category) {
    case 'color':
      return (
        <span
          className="w-8 h-8 rounded-md border border-border-strong shrink-0 block"
          style={{ backgroundColor: token.value }}
          aria-hidden="true"
        />
      );

    case 'typography': {
      const previewStyle: React.CSSProperties =
        token.cssType === 'fontFamily'
          ? { fontFamily: token.value }
          : token.cssType === 'fontWeight'
            ? { fontWeight: Number(token.value) || 500 }
            : token.cssType === 'dimension'
              ? { fontSize: `${Math.min(Math.max(parsePxNumber(token.value, 14), 11), 20)}px` }
              : {};
      return (
        <span
          className="w-8 h-8 rounded-md border border-border bg-canvas text-ink flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden"
          style={previewStyle}
          aria-hidden="true"
        >
          Aa
        </span>
      );
    }

    case 'spacing': {
      const px = parsePxNumber(token.value, 8);
      const barPx = Math.min(Math.max(Math.round(px * 0.75), 4), 24);
      return (
        <span
          className="w-8 h-8 rounded-md border border-border bg-canvas flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span
            className="h-2 rounded-xs bg-accent/80 block"
            style={{ width: `${barPx}px` }}
          />
        </span>
      );
    }

    case 'radius': {
      const px = parsePxNumber(token.value, 6);
      const radiusCss = px >= 999 ? '9999px' : `${Math.min(Math.max(px, 0), 14)}px`;
      return (
        <span
          className="w-8 h-8 rounded-md border border-border bg-canvas flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span
            className="w-5 h-5 border-2 border-accent/80 bg-surface block"
            style={{ borderRadius: radiusCss }}
          />
        </span>
      );
    }

    case 'border':
      return (
        <span
          className="w-8 h-8 rounded-md bg-canvas flex items-center justify-center shrink-0 p-1"
          aria-hidden="true"
        >
          <span
            className="w-full h-full rounded-sm bg-surface block"
            style={{
              border: token.value === 'none' ? '1px dashed #273F47' : token.value
            }}
          />
        </span>
      );

    case 'shadow':
      return (
        <span
          className="w-8 h-8 rounded-md border border-border bg-canvas flex items-center justify-center shrink-0 p-1.5"
          aria-hidden="true"
        >
          <span
            className="w-full h-full rounded-xs bg-surface border border-border block"
            style={{ boxShadow: token.value === 'none' ? 'none' : token.value }}
          />
        </span>
      );

    case 'layout':
      return (
        <span
          className="w-8 h-8 rounded-md border border-border bg-canvas flex items-center justify-center gap-0.5 px-1.5 shrink-0"
          aria-hidden="true"
        >
          <span className="w-1 h-4 bg-accent/35 rounded-xs block" />
          <span className="w-1 h-4 bg-accent/65 rounded-xs block" />
          <span className="w-1 h-4 bg-accent/35 rounded-xs block" />
        </span>
      );
  }
};
