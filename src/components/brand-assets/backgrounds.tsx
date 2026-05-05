import * as React from 'react';
import { cn } from '@/lib/utils';

export function ResponsiveLandingBackground({
  children,
  className,
  variant,
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: string;
}) {
  return (
    <div className={cn('min-h-screen bg-background', variant && 'responsive-landing', className)}>
      {children}
    </div>
  );
}
