jest.mock('sonner-native', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    custom: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock('@/config/toastConfig', () => ({
  toastConfig: {
    duration: {
      success: 3000,
      error: 5000,
      info: 3000,
      warning: 4000,
    },
  },
}));

import { toast as sonnerToast } from 'sonner-native';
import { toast } from '@/lib/toast';

const mockToast = sonnerToast as jest.Mocked<typeof sonnerToast>;

describe('toast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('success — sonner success çağrılır, duration 3000', () => {
    toast.success('işlem tamam');
    expect(mockToast.success).toHaveBeenCalledWith('işlem tamam', { duration: 3000 });
  });

  it('success — ek options merge edilir', () => {
    toast.success('ok', { duration: 9999 });
    expect(mockToast.success).toHaveBeenCalledWith('ok', { duration: 9999 });
  });

  it('error — sonner error çağrılır, duration 5000', () => {
    toast.error('bir hata oluştu');
    expect(mockToast.error).toHaveBeenCalledWith('bir hata oluştu', { duration: 5000 });
  });

  it('info — sonner info çağrılır', () => {
    toast.info('bilgi mesajı');
    expect(mockToast.info).toHaveBeenCalledWith('bilgi mesajı', { duration: 3000 });
  });

  it('warning — sonner warning çağrılır', () => {
    toast.warning('dikkat');
    expect(mockToast.warning).toHaveBeenCalledWith('dikkat', { duration: 4000 });
  });

  it('dismiss — sonner dismiss bind', () => {
    toast.dismiss('toast-id');
    expect(mockToast.dismiss).toHaveBeenCalledWith('toast-id');
  });
});
