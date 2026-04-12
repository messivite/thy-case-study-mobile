import { stripTextForSpeech, speechLocaleForAppLang, detectSpeechLocale } from '@/lib/chatSpeech';

describe('stripTextForSpeech', () => {
  it('code block kaldırır', () => {
    expect(stripTextForSpeech('merhaba\n```js\nconsole.log(1)\n```\nbye')).toBe('merhaba bye');
  });

  it('inline code içeriği korur, tırnakları kaldırır', () => {
    expect(stripTextForSpeech('şu `değişken` değer')).toBe('şu değişken değer');
  });

  it('bold ** kaldırır', () => {
    expect(stripTextForSpeech('**güçlü** metin')).toBe('güçlü metin');
  });

  it('bold __ kaldırır', () => {
    expect(stripTextForSpeech('__güçlü__ metin')).toBe('güçlü metin');
  });

  it('italic * kaldırır', () => {
    expect(stripTextForSpeech('*italik* metin')).toBe('italik metin');
  });

  it('italic _ kaldırır', () => {
    expect(stripTextForSpeech('_italik_ metin')).toBe('italik metin');
  });

  it('heading # kaldırır', () => {
    expect(stripTextForSpeech('## Başlık\nmetin')).toBe('Başlık metin');
  });

  it('markdown link metnini korur, URL kaldırır', () => {
    expect(stripTextForSpeech('[tıkla](https://example.com)')).toBe('tıkla');
  });

  it('liste bullet kaldırır', () => {
    expect(stripTextForSpeech('- madde bir\n- madde iki')).toBe('madde bir madde iki');
  });

  it('çoklu boşlukları teke indirir', () => {
    expect(stripTextForSpeech('merhaba   dünya')).toBe('merhaba dünya');
  });

  it('boş string döner boş', () => {
    expect(stripTextForSpeech('')).toBe('');
  });

  it('düz metin değişmez', () => {
    expect(stripTextForSpeech('Merhaba dünya')).toBe('Merhaba dünya');
  });
});

describe('speechLocaleForAppLang', () => {
  it('tr → tr-TR', () => {
    expect(speechLocaleForAppLang('tr')).toBe('tr-TR');
  });

  it('tr-TR → tr-TR', () => {
    expect(speechLocaleForAppLang('tr-TR')).toBe('tr-TR');
  });

  it('en → en-US', () => {
    expect(speechLocaleForAppLang('en')).toBe('en-US');
  });

  it('bilinmeyen dil → en-US', () => {
    expect(speechLocaleForAppLang('fr')).toBe('en-US');
  });
});

describe('detectSpeechLocale', () => {
  it('Türkçe özel karakter içeriyorsa tr-TR', () => {
    expect(detectSpeechLocale('merhaba çok güzel')).toBe('tr-TR');
  });

  it('ğ harfi ile tr-TR', () => {
    expect(detectSpeechLocale('değil')).toBe('tr-TR');
  });

  it('Türkçe kelime içeriyorsa tr-TR', () => {
    expect(detectSpeechLocale('bu bir test')).toBe('tr-TR');
  });

  it('Türkçe bulunamazsa fallbackLang kullanır', () => {
    expect(detectSpeechLocale('hello world', 'tr')).toBe('tr-TR');
  });

  it('Türkçe bulunamazsa ve fallback yoksa en-US', () => {
    expect(detectSpeechLocale('hello world')).toBe('en-US');
  });
});
