import { toast as sonnerToast, type ToastProps } from 'sonner-native';
import { toastConfig } from '@/config/toastConfig';

type ToastOptions = Partial<Omit<ToastProps, 'id' | 'title' | 'variant'>>;

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, { duration: toastConfig.duration.success, ...options }),

  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, { duration: toastConfig.duration.error, ...options }),

  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(message, { duration: toastConfig.duration.info, ...options }),

  warning: (message: string, options?: ToastOptions) =>
    sonnerToast.warning(message, { duration: toastConfig.duration.warning, ...options }),

  custom: sonnerToast.custom.bind(sonnerToast),
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};
