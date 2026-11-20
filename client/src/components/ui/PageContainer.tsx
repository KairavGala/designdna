import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={[
        'w-full max-w-[1040px] mx-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 space-y-8',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};
