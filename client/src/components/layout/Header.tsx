import React from 'react';
import { Menu, Plus, Settings } from 'lucide-react';
import { PAGE_METADATA, type PageId } from '../../types/navigation';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';

export interface HeaderSessionContext {
  fileName: string;
  statusLabel: string;
  unlockedCount: number;
}

export interface HeaderProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenMobileMenu: () => void;
  sessionContext?: HeaderSessionContext | null;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onNavigate,
  onOpenMobileMenu,
  sessionContext
}) => {
  const meta = PAGE_METADATA[activePage];

  return (
    <header className="sticky top-0 z-30 h-14 bg-sidebar/90 backdrop-blur-md border-b border-border">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile menu button + single-line breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-ink hover:bg-elevated transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 text-sm">
            <span className="hidden sm:inline text-muted whitespace-nowrap">
              {meta.section}
            </span>
            <span className="hidden sm:inline text-border-strong" aria-hidden="true">
              /
            </span>
            <span className="font-medium text-ink truncate whitespace-nowrap">
              {meta.title}
            </span>
          </nav>
        </div>

        {/* Right: Active session context + primary CTA + Settings shortcut */}
        <div className="flex items-center gap-3 shrink-0">
          {sessionContext && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted min-w-0 max-w-[340px]">
              <span
                className="font-mono text-ink/90 truncate max-w-[160px]"
                title={sessionContext.fileName}
              >
                {sessionContext.fileName}
              </span>
              <span className="text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="whitespace-nowrap">{sessionContext.statusLabel}</span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {activePage !== 'new-analysis' ? (
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('new-analysis')}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>New Analysis</span>
              </PrimaryButton>
            ) : (
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('overview')}
              >
                <span>Overview</span>
              </SecondaryButton>
            )}

            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label="Open settings"
              aria-current={activePage === 'settings' ? 'page' : undefined}
              title="Settings"
              className={[
                'w-9 h-9 rounded-lg border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0',
                activePage === 'settings'
                  ? 'bg-accent-soft border-accent-border text-accent'
                  : 'bg-elevated border-border text-muted hover:text-ink hover:border-border-strong'
              ].join(' ')}
            >
              <Settings className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
