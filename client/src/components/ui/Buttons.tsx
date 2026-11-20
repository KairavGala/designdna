import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2'
};

export const PrimaryButton: React.FC<ButtonProps> = ({
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...props
}) => {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap shrink-0',
        'bg-accent text-[#051315] hover:bg-accent-hover active:translate-y-[0.5px]',
        'shadow-[0_0_20px_-6px_rgba(22,214,197,0.45)] hover:shadow-[0_0_24px_-4px_rgba(22,214,197,0.58)]',
        'transition-all duration-150 cursor-pointer',
        'disabled:opacity-45 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:bg-accent',
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...props
}) => {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap shrink-0',
        'bg-elevated text-ink border border-border hover:bg-[#16252A] hover:border-border-strong',
        'transition-colors duration-150 cursor-pointer',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-elevated',
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
};
