import {
  WELCOME_GUEST_SIGNING_TOAST_ID,
  WELCOME_GUEST_AUTH_FLOW,
} from '@/constants/welcomeGuestAuthFlow';

describe('welcomeGuestAuthFlow constants', () => {
  it('WELCOME_GUEST_SIGNING_TOAST_ID doğru string', () => {
    expect(WELCOME_GUEST_SIGNING_TOAST_ID).toBe('welcome-guest-signing');
  });

  it('dimTargetOpacity 0-1 arası', () => {
    expect(WELCOME_GUEST_AUTH_FLOW.dimTargetOpacity).toBeGreaterThan(0);
    expect(WELCOME_GUEST_AUTH_FLOW.dimTargetOpacity).toBeLessThan(1);
  });

  it('dimDurationMs pozitif', () => {
    expect(WELCOME_GUEST_AUTH_FLOW.dimDurationMs).toBeGreaterThan(0);
  });

  it('signingToast.dismissible false', () => {
    expect(WELCOME_GUEST_AUTH_FLOW.signingToast.dismissible).toBe(false);
  });

  it('signingToast.duration Infinity', () => {
    expect(WELCOME_GUEST_AUTH_FLOW.signingToast.duration).toBe(Number.POSITIVE_INFINITY);
  });

  it('signingToast.position tanımlı', () => {
    expect(WELCOME_GUEST_AUTH_FLOW.signingToast.position).toBeTruthy();
  });
});
