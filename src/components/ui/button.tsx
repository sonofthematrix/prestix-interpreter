import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-prestix hover:shadow-prestix-hover hover:-translate-y-0.5 active:translate-y-0',
        variant === 'default' && 'border border-accent/80 bg-accent text-accent-foreground hover:bg-accent/90',
        variant === 'destructive' && 'border border-accent/80 bg-accent text-accent-foreground hover:bg-accent/90',
        variant === 'outline' && 'border border-accent/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        variant === 'secondary' && 'border border-accent/50 bg-muted-bg text-foreground hover:bg-accent/10 hover:border-accent/80',
        variant === 'ghost' && 'border border-transparent text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent/70',
        variant === 'link' && 'text-accent underline-offset-4 hover:underline shadow-none hover:shadow-none hover:translate-y-0',
        size === 'default' && 'h-10 px-4 py-2',
        size === 'sm' && 'h-9 rounded-md px-3',
        size === 'lg' && 'h-11 rounded-md px-8',
        size === 'icon' && 'h-10 w-10',
        (variant === 'link' || variant === 'ghost') && 'shadow-none',
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button };
