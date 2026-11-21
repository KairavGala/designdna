import React from 'react';

export interface BrandMarkProps {
  collapsed?: boolean;
  onClick?: () => void;
}

export interface DesignDnaSymbolProps {
  size?: number;
  className?: string;
}

export const DesignDnaSymbol: React.FC<DesignDnaSymbolProps> = ({
  size = 20,
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Subtle upper prism facet wash */}
    <path d="M12 2L22 12H2L12 2Z" fill="#16D6C5" fillOpacity="0.14" />
    {/* Intersecting structural viewport frame (cyan detail) */}
    <rect
      x="6"
      y="6"
      width="12"
      height="12"
      rx="1.5"
      stroke="#4BE4F2"
      strokeOpacity="0.78"
      strokeWidth="1.4"
    />
    {/* Faceted outer diamond silhouette */}
    <path
      d="M12 2L22 12L12 22L2 12L12 2Z"
      stroke="#16D6C5"
      strokeWidth="1.65"
      strokeLinejoin="round"
    />
    {/* Cardinal lens/facet alignment lines */}
    <path
      d="M12 2V6M22 12H18M12 22V18M2 12H6"
      stroke="#16D6C5"
      strokeOpacity="0.45"
      strokeWidth="1.15"
      strokeLinecap="round"
    />
    {/* Central faceted lens aperture */}
    <path d="M12 8.5L15.5 12L12 15.5L8.5 12L12 8.5Z" fill="#16D6C5" />
    <circle cx="12" cy="12" r="1.4" fill="#070B0D" />
  </svg>
);

export const BrandMark: React.FC<BrandMarkProps> = ({ collapsed = false, onClick }) => {
  const content = (
    <>
      <span
        className="w-7 h-7 rounded-lg bg-accent-soft border border-accent-border flex items-center justify-center shrink-0 shadow-[0_0_16px_-4px_rgba(22,214,197,0.45)]"
        aria-hidden="true"
      >
        <DesignDnaSymbol size={20} />
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
