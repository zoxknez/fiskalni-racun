import toast, { type Toast as HotToast } from 'react-hot-toast'

/**
 * Toast Notification Types
 */
export type ToastType = 'success' | 'error' | 'loading' | 'info' | 'warning'

export interface ToastOptions {
  duration?: number
  position?: 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right'
  icon?: string
}

/**
 * Enhanced Toast Notification Hook
 *
 * Provides type-safe wrapper around react-hot-toast with custom defaults
 * and Serbian language support.
 */
export function useToast() {
  /**
   * Show success notification
   */
  const success = (message: string, options?: ToastOptions): string => {
    return toast.success(message, {
      duration: options?.duration ?? 3000,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '✅',
      style: {
        background: '#10b981',
        color: '#ffffff',
        fontWeight: 500,
      },
    })
  }

  /**
   * Show error notification
   */
  const error = (message: string, options?: ToastOptions): string => {
    return toast.error(message, {
      duration: options?.duration ?? 4000,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '❌',
      style: {
        background: '#ef4444',
        color: '#ffffff',
        fontWeight: 500,
      },
    })
  }

  /**
   * Show loading notification
   */
  const loading = (message: string, options?: ToastOptions): string => {
    return toast.loading(message, {
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '⏳',
    })
  }

  /**
   * Show info notification
   */
  const info = (message: string, options?: ToastOptions): string => {
    return toast(message, {
      duration: options?.duration ?? 3000,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#ffffff',
        fontWeight: 500,
      },
    })
  }

  /**
   * Show warning notification
   */
  const warning = (message: string, options?: ToastOptions): string => {
    return toast(message, {
      duration: options?.duration ?? 3500,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '⚠️',
      style: {
        background: '#f59e0b',
        color: '#ffffff',
        fontWeight: 500,
      },
    })
  }

  /**
   * Dismiss specific toast by ID
   */
  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  }

  /**
   * Update existing toast
   */
  const update = (toastId: string, message: string, type: ToastType = 'info') => {
    const toastObj: Partial<HotToast> = { id: toastId }

    switch (type) {
      case 'success':
        toast.success(message, toastObj)
        break
      case 'error':
        toast.error(message, toastObj)
        break
      case 'loading':
        toast.loading(message, toastObj)
        break
      default:
        toast(message, toastObj)
    }
  }

  /**
   * Promise toast - shows loading, success, or error based on promise result
   */
  const promise = <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    },
    options?: ToastOptions
  ): Promise<T> => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        position: options?.position ?? 'top-center',
        style: {
          fontWeight: 500,
        },
      }
    )
  }

  return {
    success,
    error,
    loading,
    info,
    warning,
    dismiss,
    update,
    promise,
  }
}

/**
 * Standalone toast functions (can be used without hook)
 */
export const toastService = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration ?? 3000,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '✅',
    })
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration ?? 4000,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '❌',
    })
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '⏳',
    })
  },

  info: (message: string, options?: ToastOptions) => {
    return toast(message, {
      duration: options?.duration ?? 3000,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? 'ℹ️',
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast(message, {
      duration: options?.duration ?? 3500,
      position: options?.position ?? 'top-center',
      icon: options?.icon ?? '⚠️',
    })
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  },
}
