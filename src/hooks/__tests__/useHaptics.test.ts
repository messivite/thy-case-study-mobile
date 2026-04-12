jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import * as Haptics from 'expo-haptics';
import { useHaptics } from '@/hooks/useHaptics';

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hook stable singleton döndürür', () => {
    const h1 = useHaptics();
    const h2 = useHaptics();
    expect(h1).toBe(h2);
  });

  it('light — impactAsync çağrılır', () => {
    const h = useHaptics();
    h.light();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('medium — impactAsync çağrılır', () => {
    const h = useHaptics();
    h.medium();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('heavy — impactAsync çağrılır', () => {
    const h = useHaptics();
    h.heavy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });

  it('success — notificationAsync çağrılır', () => {
    const h = useHaptics();
    h.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('error — notificationAsync çağrılır', () => {
    const h = useHaptics();
    h.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('warning — notificationAsync çağrılır', () => {
    const h = useHaptics();
    h.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
  });

  it('selection — selectionAsync çağrılır', () => {
    const h = useHaptics();
    h.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });
});
