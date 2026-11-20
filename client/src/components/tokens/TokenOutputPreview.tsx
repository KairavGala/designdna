import React, { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { DesignSystem } from '../../types/designSystem';
import { SecondaryButton } from '../ui/Buttons';
import { SectionCard } from '../ui/SectionCard';

export interface TokenOutputPreviewProps {
  designSystem: DesignSystem;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
}

type OutputFormatTab = 'css' | 'json';

export const TokenOutputPreview: React.FC<TokenOutputPreviewProps> = ({
  designSystem,
  copiedKey,
  onCopy
}) => {
  const [activeTab, setActiveTab] = useState<OutputFormatTab>('css');

  const jsonText = useMemo(
    () => `${JSON.stringify(designSystem.jsonBundle, null, 2)}\n`,
    [designSystem.jsonBundle]
  );

  const currentCode = activeTab === 'css' ? designSystem.cssVariables : jsonText;
  const copyKey = `output-${activeTab}`;
  const isCopied = copiedKey === copyKey;

  return (
    <SectionCard
      title="Generated CSS & JSON Token Data"
      description="Deterministic CSS custom properties and structured JSON token output derived from the normalised DesignSystem."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Token output format"
            className="inline-flex rounded-lg border border-border bg-canvas p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'css'}
              onClick={() => setActiveTab('css')}
              className={[
                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                activeTab === 'css'
                  ? 'bg-accent-soft text-accent border border-accent-border'
                  : 'text-muted hover:text-ink border border-transparent'
              ].join(' ')}
            >
              CSS Variables
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'json'}
              onClick={() => setActiveTab('json')}
              className={[
                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                activeTab === 'json'
                  ? 'bg-accent-soft text-accent border border-accent-border'
                  : 'text-muted hover:text-ink border border-transparent'
              ].join(' ')}
            >
              JSON Tokens
            </button>
          </div>

          <SecondaryButton
            size="sm"
            onClick={() => onCopy(currentCode, copyKey)}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                <span>Copy {activeTab === 'css' ? 'CSS' : 'JSON'}</span>
              </>
            )}
          </SecondaryButton>
        </div>
      }
    >
      <div className="rounded-lg border border-border bg-canvas overflow-hidden">
        <pre className="p-4 text-xs font-mono text-ink leading-relaxed overflow-x-auto max-h-[380px]">
          <code>{currentCode}</code>
        </pre>
      </div>
    </SectionCard>
  );
};
