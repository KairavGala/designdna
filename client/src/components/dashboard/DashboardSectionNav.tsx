import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import type { DashboardState } from '../../services/dashboard/deriveDashboardState';
import type { ExtractedColor } from '../../types/colors';
import {
  DESIGN_SYSTEM_NAV_ITEMS,
  type PageId
} from '../../types/navigation';
import { SectionCard } from '../ui/SectionCard';

export interface DashboardSectionNavProps {
  dashboard: DashboardState;
  measuredColors?: readonly ExtractedColor[];
  onNavigate: (page: PageId) => void;
}

export const DashboardSectionNav: React.FC<DashboardSectionNavProps> = ({
  dashboard,
  measuredColors,
  onNavigate
}) => {
  return (
    <SectionCard
      title="Analysis Sections"
      description="Jump directly into any unlocked section using your current analysis results."
      action={
        <span className="text-xs font-mono text-accent tabular-nums">
          {dashboard.unlockedCount} / {dashboard.totalSectionCount} unlocked
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-border">
        {DESIGN_SYSTEM_NAV_ITEMS.map((item, idx) => {
          const sectionState = dashboard.sections[item.id];
          const Icon = item.icon;
          const isUnlocked = sectionState.unlocked;
          const showColorDots =
            item.id === 'colors' && isUnlocked && measuredColors && measuredColors.length > 0;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!isUnlocked}
              onClick={isUnlocked ? () => onNavigate(item.id) : undefined}
              title={isUnlocked ? `Open ${item.label}` : sectionState.lockReason}
              className={[
                'group text-left p-4 sm:p-5 flex flex-col justify-between gap-3 transition-colors duration-150 min-w-0',
                'border-b border-border sm:border-r last:border-b-0',
                idx >= 4 ? 'lg:border-b-0' : '',
                isUnlocked
                  ? 'bg-surface hover:bg-elevated/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent'
                  : 'bg-canvas/50 text-faint cursor-not-allowed'
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={[
                      'w-4 h-4 shrink-0',
                      isUnlocked ? 'text-accent' : 'text-faint'
                    ].join(' ')}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span
                    className={[
                      'text-sm font-semibold truncate',
                      isUnlocked ? 'text-ink group-hover:text-accent transition-colors' : 'text-faint'
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                </div>

                {isUnlocked ? (
                  <ArrowRight
                    className="w-3.5 h-3.5 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Lock
                    className="w-3.5 h-3.5 text-faint shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="space-y-2">
                {showColorDots && (
                  <div className="flex items-center gap-1" aria-hidden="true">
                    {measuredColors.slice(0, 5).map((c) => (
                      <span
                        key={c.id}
                        className="w-3 h-3 rounded-[3px] border border-border-strong/70"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                )}
                <p
                  className={[
                    'text-xs leading-relaxed line-clamp-2',
                    isUnlocked ? 'text-muted' : 'text-faint'
                  ].join(' ')}
                >
                  {isUnlocked ? sectionState.metaText : sectionState.lockReason}
                </p>
              </div>
            </button>
          );
        })}

        {/* Quiet 8th cell on 4-column desktop grid balancing the 7 sections */}
        <div className="hidden lg:flex flex-col justify-between p-5 bg-canvas/40 text-xs text-muted">
          <span className="font-medium text-ink">Local-first session</span>
          <p className="leading-relaxed">
            Switching sections reads directly from in-memory results without re-running extraction or
            API requests.
          </p>
        </div>
      </div>
    </SectionCard>
  );
};
