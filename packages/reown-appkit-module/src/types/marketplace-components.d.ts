/**
 * Type declarations for marketplace UI components
 * These components are available when the package is consumed by the marketplace
 */

declare module '@/components/ui/dialog' {
  export * from '@/components/ui/dialog';
}

declare module '@/components/ui/tabs' {
  export * from '@/components/ui/tabs';
}

declare module '@/components/ui/card' {
  export * from '@/components/ui/card';
}

declare module '@/components/ui/button' {
  export * from '@/components/ui/button';
}

declare module '@/components/common/TigerSpinner' {
  export function TigerSpinner(props: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }): JSX.Element;
  export function StatCard(props: {
    value: number | string | null | undefined;
    isLoading?: boolean;
    label: string;
    icon?: React.ReactNode;
    className?: string;
    formatter?: (value: number) => string;
  }): JSX.Element;
}

