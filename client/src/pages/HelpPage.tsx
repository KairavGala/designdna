import React from 'react';
import { ArrowRight, ScanLine } from 'lucide-react';
import { APP_MILESTONE, APP_VERSION, DESIGN_SYSTEM_NAV_ITEMS, type PageId } from '../types/navigation';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface HelpPageProps {
  onNavigate: (page: PageId) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onNavigate }) => {
  return (
    <PageContainer>
      <PageHeading
        title="Help & Documentation"
        description="Guide to the DesignDNA Website Visual Intelligence workspace and extraction pipeline."
      />

      <SectionCard
        title="How DesignDNA works"
        description="Deconstruct any website and discover its visual DNA — turning screenshots into structured, inspectable design systems."
        bodyClassName="p-0"
      >
        <ol className="divide-y divide-border">
          <li className="px-5 py-4 sm:px-6 flex items-start gap-4">
            <span className="font-mono text-xs font-medium text-accent pt-0.5 tabular-nums">
              01
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">Capture and upload</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Start from New Analysis with a PNG, JPG, or WEBP screenshot of any web page or
                interface component.
              </p>
            </div>
          </li>
          <li className="px-5 py-4 sm:px-6 flex items-start gap-4">
            <span className="font-mono text-xs font-medium text-accent pt-0.5 tabular-nums">
              02
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">Structured system extraction</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Measured colour extraction pairs with structured inference to populate seven
                dedicated inspection views: {DESIGN_SYSTEM_NAV_ITEMS.map((item) => item.label).join(', ')}.
              </p>
            </div>
          </li>
          <li className="px-5 py-4 sm:px-6 flex items-start gap-4">
            <span className="font-mono text-xs font-medium text-accent pt-0.5 tabular-nums">
              03
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">Inspect and export</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Review every visual token in the sidebar and export reusable CSS variables or JSON
                specifications directly into your codebase.
              </p>
            </div>
          </li>
        </ol>
      </SectionCard>

      <SectionCard
        title="Why Design System sections are locked"
        description="Design System views in the left sidebar remain disabled until an analysis has been completed."
      >
        <p className="text-sm text-muted leading-relaxed">
          You are currently running <span className="font-medium text-ink">DesignDNA v{APP_VERSION}</span>{' '}
          ({APP_MILESTONE}). Upload a screenshot in New Analysis to extract its measured colour
          palette locally (unlocking Colors), then run AI Visual Interpretation to unlock
          Typography, Spacing, Components, Layout, Effects, and normalised Design Tokens. Return to
          Overview at any time for a unified dashboard summary of your active session.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <PrimaryButton
            size="sm"
            onClick={() => onNavigate('new-analysis')}
            className="w-full sm:w-auto"
          >
            <ScanLine className="w-4 h-4" aria-hidden="true" />
            <span>View New Analysis</span>
          </PrimaryButton>
          <SecondaryButton
            size="sm"
            onClick={() => onNavigate('settings')}
            className="w-full sm:w-auto"
          >
            <span>Check Backend Status</span>
            <ArrowRight className="w-4 h-4 text-muted" aria-hidden="true" />
          </SecondaryButton>
        </div>
      </SectionCard>
    </PageContainer>
  );
};
