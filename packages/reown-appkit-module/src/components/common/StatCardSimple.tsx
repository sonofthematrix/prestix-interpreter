/**
 * Helper component for statistics cards with loading state
 * Shows golden tiger spinner while loading
 */
'use client';

import { TigerSpinner } from '@/components/common/TigerSpinner';
import { Card, CardContent } from '../ui/card'; 

interface StatCardSimpleProps {
  value: number | string | null | undefined;
  isLoading?: boolean;
  label: string;
  className?: string;
}

export function StatCardSimple({
  value,
  isLoading = false,
  label,
  className,
}: StatCardSimpleProps) {
  const displayValue = isLoading
    ? null
    : value !== null && value !== undefined
    ? typeof value === 'number'
      ? value.toLocaleString()
      : value
    : '0';

  return (
    <Card className={`bg-muted/50 dark:bg-gray-900/50 border-border dark:border-gray-700 ${className || ''}`}>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-foreground dark:text-white">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <TigerSpinner size="sm" />
              <span className="text-sm text-muted-foreground dark:text-gray-500">Loading...</span>
            </div>
          ) : (
            displayValue
          )}
        </div>
        <div className="text-xs text-muted-foreground dark:text-gray-400 mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

