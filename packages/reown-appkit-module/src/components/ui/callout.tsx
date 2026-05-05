import { cn } from '@/lib/utils';

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}

export function Callout({ type = 'info', children, className }: CalloutProps) {
  const baseClasses = 'p-4 rounded-lg border-l-4';
  
  const typeClasses = {
    info: 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-100',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-400 dark:text-yellow-100',
    error: 'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/20 dark:border-red-400 dark:text-red-100',
    success: 'bg-green-50 border-green-500 text-green-900 dark:bg-green-900/20 dark:border-green-400 dark:text-green-100',
  };

  return (
    <div className={cn(baseClasses, typeClasses[type], className)}>
      {children}
    </div>
  );
}