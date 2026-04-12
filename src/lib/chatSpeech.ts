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

const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const TR_WORDS = /\b(ve|bir|bu|da|de|ile|için|olan|olan|var|yok|ama|ya|mi|mı|mu|mü|ne|nasıl|gibi|daha|çok|en|her|ben|sen|biz|siz|onlar|ise|veya|ancak|ki|kadar|sonra|önce|bile|sadece|artık|zaten|hatta|hem|ya da|değil)\b/i;

export function detectSpeechLocale(text: string, fallbackLang?: string): string {
  if (TR_CHARS.test(text)) return 'tr-TR';
  if (TR_WORDS.test(text)) return 'tr-TR';
  if (fallbackLang) return speechLocaleForAppLang(fallbackLang);
  return 'en-US';
}
