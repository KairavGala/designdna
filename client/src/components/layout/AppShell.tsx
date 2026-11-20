import React, { useState } from 'react';
import type { DesignSystemSectionId, PageId } from '../../types/navigation';
import { Header, type HeaderSessionContext } from './Header';
import { Sidebar } from './Sidebar';

export interface AppShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  unlockedSections?: ReadonlySet<DesignSystemSectionId>;
  sessionContext?: HeaderSessionContext | null;
  children: React.ReactNode;
}

const getInitialCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  unlockedSections,
  sessionContext,
  children
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getInitialCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-canvas text-ink flex overflow-x-clip">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        unlockedSections={unlockedSections}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          activePage={activePage}
          onNavigate={onNavigate}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          sessionContext={sessionContext}
        />

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
