/**
 * Sohbet metnini cihaz TTS’i için sadeleştirir (markdown / kod bloku gürültüsünü azaltır).
 */
export function stripTextForSpeech(raw: string): string {
  let s = raw;
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/__(.+?)__/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/_(.+?)_/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\[(.+?)]\([^)]+\)/g, '$1');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

export function speechLocaleForAppLang(lang: string): string {
  return lang.startsWith('tr') ? 'tr-TR' : 'en-US';
}
