import React, { useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import {
  APP_MILESTONE,
  APP_VERSION,
  DESIGN_SYSTEM_NAV_ITEMS,
  MAIN_NAV_ITEMS,
  UTILITY_NAV_ITEMS,
  type DesignSystemSectionId,
  type PageId
} from '../../types/navigation';
import { BrandMark } from './BrandMark';
import { SidebarItem } from './SidebarItem';

export interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unlockedSections?: ReadonlySet<DesignSystemSectionId>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  unlockedSections
}) => {
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const handleSelect = (page: PageId) => {
    onNavigate(page);
    onCloseMobile();
  };

  const renderSidebarContent = (isCollapsed: boolean, isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full bg-sidebar select-none">
      {/* Brand header aligned with top bar height */}
      <div
        className={[
          'h-14 shrink-0 border-b border-border flex items-center',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        ].join(' ')}
      >
        <BrandMark collapsed={isCollapsed} onClick={() => handleSelect('overview')} />

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : !isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            aria-expanded={!isCollapsed}
            title="Collapse sidebar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Scrollable navigation groups */}
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
        {/* Main workspace group */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-2.5 pb-1.5 text-[11px] font-medium text-faint">
              Workspace
            </p>
          )}
          {MAIN_NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={activePage === item.id}
              collapsed={isCollapsed}
              onClick={() => handleSelect(item.id)}
            />
          ))}
        </div>

        {/* Design system sections — unlock as extraction data becomes available */}
        <div className="space-y-1 pt-4 border-t border-border">
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-medium text-faint">Design System</p>
              <span
                className={[
                  'text-[11px] font-mono tabular-nums',
                  unlockedSections && unlockedSections.size > 0
                    ? 'text-accent'
                    : 'text-faint'
                ].join(' ')}
              >
                {unlockedSections && unlockedSections.size > 0
                  ? `${unlockedSections.size} / ${DESIGN_SYSTEM_NAV_ITEMS.length} ready`
                  : 'No analysis'}
              </span>
            </div>
          )}
          {DESIGN_SYSTEM_NAV_ITEMS.map((item) => {
            const isUnlocked = Boolean(unlockedSections?.has(item.id));
            const navigablePageId: PageId = item.id;
            const disabledReason =
              item.id === 'colors'
                ? 'Upload a screenshot and run extraction to unlock'
                : 'Run AI Visual Interpretation from Colors to unlock';

            return (
              <SidebarItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={isUnlocked && activePage === navigablePageId}
                disabled={!isUnlocked}
                collapsed={isCollapsed}
                disabledReason={disabledReason}
                onClick={isUnlocked ? () => handleSelect(navigablePageId) : undefined}
              />
            );
          })}
        </div>
      </nav>

      {/* Bottom utility section & version */}
      <div className="shrink-0 border-t border-border px-2.5 py-3 space-y-1">
        {!isMobileDrawer && isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            aria-expanded={false}
            title="Expand sidebar"
            className="w-full h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors cursor-pointer mb-1"
          >
            <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {UTILITY_NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={activePage === item.id}
            collapsed={isCollapsed}
            onClick={() => handleSelect(item.id)}
          />
        ))}

        {!isCollapsed && (
          <div className="px-2.5 pt-2.5 mt-2 border-t border-border flex items-center justify-between text-[11px] text-faint">
            <span className="font-mono tabular-nums">v{APP_VERSION}</span>
            <span className="truncate ml-2">{APP_MILESTONE}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet persistent sidebar */}
      <aside
        aria-label="Sidebar"
        className={[
          'hidden md:flex md:flex-col md:shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen',
          collapsed ? 'w-[68px]' : 'w-[248px]'
        ].join(' ')}
      >
        {renderSidebarContent(collapsed, false)}
      </aside>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] h-full border-r border-border bg-sidebar shadow-2xl">
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
};
