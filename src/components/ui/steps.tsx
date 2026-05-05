import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepsProps {
  children: React.ReactNode;
  className?: string;
}

export function Steps({ children, className }: StepsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
}

interface StepProps {
  children: React.ReactNode;
  number?: number;
  completed?: boolean;
  className?: string;
}

export function Step({ children, number, completed = false, className }: StepProps) {
  return (
    <div className={cn('flex items-start space-x-4', className)}>
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0',
        completed 
          ? 'bg-green-500 border-green-500 text-white' 
          : 'bg-white border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
      )}>
        {completed ? (
          <Check className="w-4 h-4" />
        ) : (
          <span className="text-sm font-medium">{number}</span>
        )}
      </div>
      <div className="flex-1 pt-1">
        {children}
      </div>
    </div>
  );
}
