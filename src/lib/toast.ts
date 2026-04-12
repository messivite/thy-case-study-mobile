import { toast as sonnerToast, type ExternalToast } from 'sonner-native';
import { toastConfig } from '@/config/toastConfig';

export const toast = {
  success: (message: string, options?: ExternalToast) =>
    sonnerToast.success(message, { duration: toastConfig.duration.success, ...options }),

  error: (message: string, options?: ExternalToast) =>
    sonnerToast.error(message, { duration: toastConfig.duration.error, ...options }),

  info: (message: string, options?: ExternalToast) =>
    sonnerToast.info(message, { duration: toastConfig.duration.info, ...options }),

  warning: (message: string, options?: ExternalToast) =>
    sonnerToast.warning(message, { duration: toastConfig.duration.warning, ...options }),

  custom: sonnerToast.custom.bind(sonnerToast),
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};
