'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface TigerSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

/**
 * Tokenizin Golden Spinner Component
 * Uses the brand's golden/orange color scheme
 */
export function TigerSpinner({ size = 'md', className }: TigerSpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin',
        sizeClasses[size],
        'text-orange-600 dark:text-orange-400', // Tiger golden color
        className
      )}
    />
  );
}

/**
 * Statistics Card with Loading State
 * Shows spinner while loading, displays value when loaded
 */
interface StatCardProps {
  value: number | string | null | undefined;
  isLoading?: boolean;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  formatter?: (value: number) => string;
}

export function StatCard({
  value,
  isLoading = false,
  label,
  icon,
  className,
  formatter,
}: StatCardProps) {
  const displayValue = isLoading
    ? null
    : value !== null && value !== undefined
    ? typeof value === 'number'
      ? formatter
        ? formatter(value)
        : value.toLocaleString()
      : value
    : '0';

  return (
    <div className={className}>
      {icon && (
        <div className="flex items-center justify-between mb-2">
          {icon}
          {isLoading && <TigerSpinner size="sm" />}
        </div>
      )}
      <div className="text-2xl font-bold text-foreground dark:text-white">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <TigerSpinner size="sm" />
            <span className="text-muted-foreground dark:text-gray-500">Loading...</span>
          </div>
        ) : (
          displayValue
        )}
      </div>
      <div className="text-xs text-muted-foreground dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

