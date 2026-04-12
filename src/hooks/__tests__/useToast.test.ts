jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { toast } from '@/lib/toast';
import { useToast } from '@/hooks/useToast';

const mockToast = toast as jest.Mocked<typeof toast>;

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('success — toast.success çağrılır', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.success('başarılı'); });
    expect(mockToast.success).toHaveBeenCalledWith('başarılı');
  });

  it('error — toast.error çağrılır', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.error('hata'); });
    expect(mockToast.error).toHaveBeenCalledWith('hata');
  });

  it('info — toast.info çağrılır', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.info('bilgi'); });
    expect(mockToast.info).toHaveBeenCalledWith('bilgi');
  });

  it('warning — toast.warning çağrılır', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.warning('uyarı'); });
    expect(mockToast.warning).toHaveBeenCalledWith('uyarı');
  });

  it('stable referans — her render aynı fonksiyon', () => {
    const { result, rerender } = renderHook(() => useToast());
    const first = result.current.success;
    rerender({});
    expect(result.current.success).toBe(first);
  });
});
