import React from 'react';

export interface PageHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-border">
      <div className="space-y-1.5 min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] text-ink leading-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-[15px] text-muted leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
