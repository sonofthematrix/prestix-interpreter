import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, title, description, variant };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
    
    return {
      id,
      dismiss: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
      update: (props: Partial<Omit<Toast, 'id'>>) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, ...props } : t));
      }
    };
  }, []);

  return {
    toast,
    toasts,
    dismiss: (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }
  };
}
