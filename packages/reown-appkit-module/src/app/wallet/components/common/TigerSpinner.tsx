import { Loader2 } from "lucide-react";
import { cn } from "../../../../../../../src/lib/utils";

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