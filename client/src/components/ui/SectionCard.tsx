import React from 'react';

export interface SectionCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = ''
}) => {
  const hasHeader = Boolean(title || description || action);

  return (
    <section
      className={[
        'bg-surface border border-border rounded-xl shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_10px_30px_-20px_rgba(0,0,0,0.7)]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasHeader && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 sm:px-6 border-b border-border">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName || 'p-5 sm:p-6'}>{children}</div>
    </section>
  );
};
