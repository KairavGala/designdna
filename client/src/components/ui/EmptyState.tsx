import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  compact = false
}) => {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-14 px-6'
      ].join(' ')}
    >
      <div className="w-10 h-10 rounded-lg bg-subtle border border-border flex items-center justify-center text-muted mb-4">
        <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted max-w-md leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
