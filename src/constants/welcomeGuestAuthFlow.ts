/**
 * Welcome ekranı — misafir girişi / toast / dim overlay akışı sabitleri.
 * (useState + continueAsGuest ile kullanılan davranış.)
 */

export const WELCOME_GUEST_SIGNING_TOAST_ID = 'welcome-guest-signing' as const;

export const WELCOME_GUEST_AUTH_FLOW = {
  /** Misafir beklerken form bloğu opacity */
  dimTargetOpacity: 0.38,
  dimDurationMs: 280,
  signingToast: {
    position: 'bottom-center' as const,
    duration: Number.POSITIVE_INFINITY as number,
    dismissible: false,
    unstyled: true,
  },
} as const;
