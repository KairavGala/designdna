import React from 'react';
import type { DesignSystem } from '../../types/designSystem';
import type { UploadedImage } from '../../types/upload';
import { SectionCard } from '../ui/SectionCard';

export interface TokenScreenshotPreviewProps {
  image: UploadedImage;
  designSystem: DesignSystem;
}

function findTokenValue(
  designSystem: DesignSystem,
  candidateNames: string[],
  fallback: string
): string {
  for (const name of candidateNames) {
    const match = designSystem.tokens.find((t) => t.name === name);
    if (match) return match.value;
  }
  return fallback;
}

export const TokenScreenshotPreview: React.FC<TokenScreenshotPreviewProps> = ({
  image,
  designSystem
}) => {
  const bgCanvas = findTokenValue(designSystem, ['color-bg-canvas', 'color-palette-1'], '#070B0D');
  const bgSurface = findTokenValue(
    designSystem,
    ['color-bg-surface', 'color-bg-canvas', 'color-palette-1'],
    '#0E171A'
  );
  const textPrimary = findTokenValue(
    designSystem,
    ['color-text-primary', 'color-palette-2'],
    '#E8F0F0'
  );
  const textSecondary = findTokenValue(
    designSystem,
    ['color-text-secondary', 'color-text-primary'],
    '#91A2A5'
  );
  const brandPrimary = findTokenValue(
    designSystem,
    ['color-brand-primary', 'color-accent', 'color-palette-3'],
    '#16D6C5'
  );
  const brandOnPrimary = findTokenValue(
    designSystem,
    ['color-brand-on-primary'],
    '#051315'
  );
  const borderDefault = findTokenValue(
    designSystem,
    ['border-default'],
    '1px solid #1A2B30'
  );
  const shadowSurface = findTokenValue(designSystem, ['shadow-surface'], 'none');
  const headingFont = findTokenValue(
    designSystem,
    ['font-heading'],
    'system-ui, sans-serif'
  );
  const bodyFont = findTokenValue(designSystem, ['font-body'], headingFont);
  const cardRadius = designSystem.byCategory.radius[0]?.value ?? '8px';
  const containerPadding = findTokenValue(
    designSystem,
    ['space-container', 'space-md'],
    '20px'
  );

  // Scoped CSS custom property map applied directly to the live token preview container
  const previewCssVars = {
    '--preview-canvas': bgCanvas,
    '--preview-surface': bgSurface,
    '--preview-text': textPrimary,
    '--preview-muted': textSecondary,
    '--preview-brand': brandPrimary,
    '--preview-on-brand': brandOnPrimary,
    '--preview-border': borderDefault === 'none' ? '1px solid #1A2B30' : borderDefault,
    '--preview-shadow': shadowSurface,
    '--preview-radius': cardRadius,
    '--preview-font-heading': headingFont,
    '--preview-font-body': bodyFont.startsWith('var(') ? headingFont : bodyFont,
    '--preview-pad': containerPadding
  } as React.CSSProperties;

  return (
    <SectionCard
      title="Screenshot-to-Token Relationship Preview"
      description="Compare your unmodified screenshot against a live surface styled exclusively with the normalised tokens above."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Original unmodified screenshot */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">
            Original Screenshot ({image.width} × {image.height} px)
          </p>
          <div className="flex-1 rounded-lg border border-border bg-canvas p-4 flex items-center justify-center min-h-[220px] max-h-[340px] overflow-hidden">
            <img
              src={image.previewUrl}
              alt={`Original screenshot ${image.name}`}
              className="max-w-full max-h-[300px] w-auto h-auto object-contain rounded border border-border bg-surface"
            />
          </div>
        </div>

        {/* Right: Live token-rendered specimen */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">
            Live Token Specimen ({designSystem.summary.themeMode} theme ·{' '}
            {designSystem.metrics.totalTokens} tokens)
          </p>
          <div
            className="flex-1 rounded-lg border border-border p-5 flex items-center justify-center min-h-[220px]"
            style={{
              ...previewCssVars,
              backgroundColor: 'var(--preview-canvas)',
              fontFamily: 'var(--preview-font-body)'
            }}
          >
            <div
              className="w-full max-w-sm space-y-3"
              style={{
                backgroundColor: 'var(--preview-surface)',
                border: 'var(--preview-border)',
                borderRadius: 'var(--preview-radius)',
                boxShadow: 'var(--preview-shadow)',
                padding: 'var(--preview-pad)'
              }}
            >
              <div className="space-y-1">
                <p
                  className="text-base font-semibold leading-snug"
                  style={{
                    color: 'var(--preview-text)',
                    fontFamily: 'var(--preview-font-heading)'
                  }}
                >
                  {designSystem.summary.interfaceType}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--preview-muted)' }}
                >
                  Rendered using normalised canvas, surface, typography, border, radius, and
                  accessible brand contrast tokens.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--preview-brand)',
                    color: 'var(--preview-on-brand)',
                    borderRadius: 'var(--preview-radius)'
                  }}
                >
                  Primary Action
                </span>
                <span
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--preview-surface)',
                    color: 'var(--preview-text)',
                    border: 'var(--preview-border)',
                    borderRadius: 'var(--preview-radius)'
                  }}
                >
                  Secondary
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
