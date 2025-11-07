import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastCounter = 0;

export function useToast() {
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // In a real implementation, this would dispatch to a global toast context
    // For now, we'll use window alerts as a fallback
    if (typeof window !== 'undefined') {
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      console.log(`${icon} ${message}`);
      
      // You could also use a global event bus or context here
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message, type, id: `toast-${++toastCounter}` },
        })
      );
    }
  }, []);

  return { showToast };
}
