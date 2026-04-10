import { Linking, Platform } from 'react-native';

type OpenExternalLinkOptions = {
  url: string;
  openInApp?: () => void;
};

/**
 * Platform-aware external link helper.
 * - Web: always open in browser tab/window
 * - Native: prefer in-app opener (e.g. /webview-modal), fallback to browser
 */
export function openExternalLink({ url, openInApp }: OpenExternalLinkOptions): void {
  if (Platform.OS === 'web') {
    void Linking.openURL(url);
    return;
  }

  if (openInApp) {
    openInApp();
    return;
  }

  void Linking.openURL(url);
}

