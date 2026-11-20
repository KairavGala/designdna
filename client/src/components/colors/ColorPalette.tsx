import React from 'react';
import type { ExtractedColor } from '../../types/colors';
import { SectionCard } from '../ui/SectionCard';
import { ColorSwatch } from './ColorSwatch';

export interface ColorPaletteProps {
  colors: ExtractedColor[];
  selectedColorId: string;
  copiedKey: string | null;
  onSelectAndCopy: (color: ExtractedColor) => void;
  onCopyHex: (hex: string, colorId: string) => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  selectedColorId,
  copiedKey,
  onSelectAndCopy,
  onCopyHex
}) => {
  return (
    <SectionCard
      title="Extracted Colour Palette"
      description="Ranked by measured pixel prevalence. Click any swatch or HEX code to copy and inspect its details."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {colors.map((color) => (
          <ColorSwatch
            key={color.id}
            color={color}
            selected={color.id === selectedColorId}
            copied={copiedKey === color.id}
            onSelectAndCopy={onSelectAndCopy}
            onCopyHex={onCopyHex}
          />
        ))}
      </div>
    </SectionCard>
  );
};
