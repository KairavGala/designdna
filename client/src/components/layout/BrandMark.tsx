import React from 'react';

export interface BrandMarkProps {
  collapsed?: boolean;
  onClick?: () => void;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ collapsed = false, onClick }) => {
  const content = (
    <>
      <span
        className="w-7 h-7 rounded-lg bg-accent-soft border border-accent-border flex items-center justify-center shrink-0 shadow-[0_0_16px_-4px_rgba(22,214,197,0.45)]"
        aria-hidden="true"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="2" width="4.8" height="4.8" rx="1.2" fill="#16D6C5" />
          <circle cx="11.6" cy="4.4" r="2.4" fill="#00A6B2" fillOpacity="0.85" />
          <circle cx="4.4" cy="11.6" r="2.4" fill="#00A6B2" fillOpacity="0.85" />
          <rect x="9.2" y="9.2" width="4.8" height="4.8" rx="1.2" fill="#16D6C5" />
        </svg>
      </span>
      {!collapsed && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink whitespace-nowrap">
          DesignDNA
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2.5 rounded-md py-1 px-0.5 text-left hover:opacity-90 transition-opacity cursor-pointer"
        aria-label="DesignDNA — Go to Overview"
        title="DesignDNA"
      >
        {content}
      </button>
    );
  }

  return <div className="inline-flex items-center gap-2.5">{content}</div>;
};
