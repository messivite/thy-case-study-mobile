import { Platform } from 'react-native';

let injected = false;

/**
 * Expo Web: html/body/#root yüksekliği yoksa hiçbir `flex: 1` zinciri viewport'u doldurmaz
 * (içerik üste sıkışır, ScrollView yüksekliği 0 kalır).
 * Bir kez global stil enjekte eder; SSR'da document yoksa no-op.
 */
export function ensureWebViewportRootStyle(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || injected) {
    return;
  }
  const id = 'thy-web-viewport-root';
  if (document.getElementById(id)) {
    injected = true;
    return;
  }
  injected = true;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
    html, body, #root {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      overflow: hidden;
    }
  `;
  document.head.appendChild(el);
}
