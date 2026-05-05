import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <Image
        src="/logosvg.svg"
        alt="PRESTIX"
        width={160}
        height={48}
        className="object-contain"
        priority
      />
    </div>
  );
}
