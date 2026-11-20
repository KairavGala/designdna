import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';

export interface SidebarItemProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  disabledReason?: string;
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  collapsed = false,
  disabledReason = 'Available after running an analysis',
  onClick
}) => {
  const titleText = disabled ? `${label} — ${disabledReason}` : label;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-current={active ? 'page' : undefined}
      onClick={disabled ? undefined : onClick}
      title={collapsed || disabled ? titleText : undefined}
      className={[
        'group w-full flex items-center rounded-lg text-[13px] leading-none border transition-all duration-150',
        collapsed ? 'justify-center h-9 px-0' : 'justify-between h-9 px-2.5 gap-2.5',
        disabled
          ? 'border-transparent text-faint cursor-not-allowed select-none'
          : active
            ? 'bg-accent-soft border-accent-border text-ink font-medium shadow-[inset_0_0_16px_rgba(22,214,197,0.07)] cursor-pointer'
            : 'border-transparent text-muted hover:text-ink hover:bg-elevated font-normal cursor-pointer'
      ].join(' ')}
    >
      <span className={['flex items-center min-w-0', collapsed ? '' : 'gap-2.5'].join(' ')}>
        <Icon
          className={[
            'w-4 h-4 shrink-0 transition-colors duration-150',
            disabled
              ? 'text-faint/70'
              : active
                ? 'text-accent'
                : 'text-muted group-hover:text-ink'
          ].join(' ')}
          strokeWidth={active ? 2 : 1.75}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate whitespace-nowrap">{label}</span>}
      </span>
      {!collapsed && disabled && (
        <Lock
          className="w-3 h-3 shrink-0 text-faint/65"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
    </button>
  );
};
