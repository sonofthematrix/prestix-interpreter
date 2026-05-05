import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  return (
    <div className={cn('relative', className)}>
      {language && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {language}
        </div>
      )}
      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
        <code>{children}</code>
      </pre>
    </div>
  );
}