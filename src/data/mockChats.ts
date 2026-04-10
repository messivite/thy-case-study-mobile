import { ChatListItem, GetChatsResponse } from '@/types/chat.api.types';

const PAGE_SIZE = 10;

/** Paginated mock response tipi — API contract ile uyumlu */
export type MockChatsPage = {
  items: ChatListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Mock paginated fetch — API gelince bu fonksiyon kaldırılır,
 * sadece getChats(cursor) ile değiştirilir.
 */
export function getMockChatsPage(cursor?: string): Promise<MockChatsPage> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const all = ALL_MOCK_CHATS;
      const startIndex = cursor ? parseInt(cursor, 10) : 0;
      const items = all.slice(startIndex, startIndex + PAGE_SIZE);
      const nextStart = startIndex + PAGE_SIZE;
      const hasMore = nextStart < all.length;
      resolve({
        items,
        nextCursor: hasMore ? String(nextStart) : null,
        hasMore,
      });
    }, 1200); // simulate network delay
  });
}

/** Tüm mock kayıtlar — sayfalama bu diziden hesaplanır */
const ALL_MOCK_CHATS: ChatListItem[] = [
  {
    id: 'chat-001',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    title: 'İstanbul uçuş saatleri',
    createdAt: '2026-04-10T08:00:00Z',
    updatedAt: '2026-04-10T08:44:00Z',
    lastMessagePreview: 'Ankara - İstanbul seferi sabah 06:30\'da kalkıyor.',
  },
  {
    id: 'chat-002',
    provider: 'google',
    model: 'gemini-2.5-flash',
    title: 'Bagaj kuralları hakkında',
    createdAt: '2026-04-10T06:00:00Z',
    updatedAt: '2026-04-10T06:20:00Z',
    lastMessagePreview: 'Ekonomi sınıfında 23 kg\'a kadar bagaj hakkınız var.',
  },
  {
    id: 'chat-003',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    title: 'Miles&Smiles puan sorgulama',
    createdAt: '2026-04-09T18:30:00Z',
    updatedAt: '2026-04-09T19:05:00Z',
    lastMessagePreview: 'Toplam 12.450 milınız bulunuyor. Bir sonraki seviye için 7.550 mil daha kazanmanız gerekiyor.',
  },
  {
    id: 'chat-004',
    provider: 'openai',
    model: 'gpt-4.1',
    title: 'Uçuş iptali ve iade',
    createdAt: '2026-04-09T10:00:00Z',
    updatedAt: '2026-04-09T10:40:00Z',
    lastMessagePreview: 'İptal talebiniz 48 saat içinde işleme alınacaktır.',
  },
  {
    id: 'chat-005',
    provider: 'google',
    model: 'gemini-2.5-pro',
    title: 'Business Class yemek menüsü',
    createdAt: '2026-04-08T14:00:00Z',
    updatedAt: '2026-04-08T14:25:00Z',
    lastMessagePreview: 'İstanbul - New York hattında özel şef menüsü sunulmaktadır.',
  },
  {
    id: 'chat-006',
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    title: 'Koltuk yükseltme işlemi',
    createdAt: '2026-04-07T11:00:00Z',
    updatedAt: '2026-04-07T11:30:00Z',
    lastMessagePreview: 'Koltuk yükseltme için gerekli mil miktarı 15.000\'dir.',
  },
  {
    id: 'chat-007',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    title: 'Vize gereksinimleri - Tokyo',
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:45:00Z',
    lastMessagePreview: 'Türk vatandaşları Japonya\'ya vizesiz 90 güne kadar giriş yapabilir.',
  },
  {
    id: 'chat-008',
    provider: 'google',
    model: 'gemini-2.5-flash',
    title: 'Havalimanı lounge erişimi',
    createdAt: '2026-04-04T16:00:00Z',
    updatedAt: '2026-04-04T16:10:00Z',
    lastMessagePreview: 'Atatürk Havalimanı CIP Lounge\'a Elite üyeler erişebilmektedir.',
  },
  {
    id: 'chat-009',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    title: 'Özel yemek talebi',
    createdAt: '2026-04-03T08:00:00Z',
    updatedAt: '2026-04-03T08:20:00Z',
    lastMessagePreview: 'Vejetaryen yemek talebiniz kalkıştan en az 24 saat önce yapılmalıdır.',
  },
  {
    id: 'chat-010',
    provider: 'openai',
    model: 'gpt-4.1',
    title: 'Uçuş gecikmesi tazminatı',
    createdAt: '2026-03-31T20:00:00Z',
    updatedAt: '2026-03-31T20:55:00Z',
    lastMessagePreview: '3 saat ve üzeri gecikmelerde EC 261/2004 yönetmeliği kapsamında tazminat hakkınız doğmaktadır.',
  },
  // --- Sayfa 2 ---
  {
    id: 'chat-011',
    provider: 'google',
    model: 'gemini-2.5-pro',
    title: 'Çocuk bileti fiyatları',
    createdAt: '2026-03-30T10:00:00Z',
    updatedAt: '2026-03-30T10:15:00Z',
    lastMessagePreview: '2-12 yaş arası çocuklar yetişkin bilet fiyatının %75\'i üzerinden bilet alabilir.',
  },
  {
    id: 'chat-012',
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    title: 'Online check-in işlemleri',
    createdAt: '2026-03-29T08:00:00Z',
    updatedAt: '2026-03-29T08:30:00Z',
    lastMessagePreview: 'Online check-in uçuştan 24 saat önce başlar, 90 dakika öncesine kadar tamamlanmalıdır.',
  },
  {
    id: 'chat-013',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    title: 'Engelli yolcu hizmetleri',
    createdAt: '2026-03-28T14:00:00Z',
    updatedAt: '2026-03-28T14:50:00Z',
    lastMessagePreview: 'Tekerlekli sandalye desteği için en geç 48 saat önce talep oluşturulmalıdır.',
  },
  {
    id: 'chat-014',
    provider: 'google',
    model: 'gemini-2.5-flash',
    title: 'Kargo ve evcil hayvan taşıma',
    createdAt: '2026-03-27T11:00:00Z',
    updatedAt: '2026-03-27T11:40:00Z',
    lastMessagePreview: 'Kabin içinde kargo kabul edilmez; evcil hayvanlar için önceden rezervasyon gereklidir.',
  },
  {
    id: 'chat-015',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    title: 'Sık uçan yolcu avantajları',
    createdAt: '2026-03-26T09:00:00Z',
    updatedAt: '2026-03-26T09:25:00Z',
    lastMessagePreview: 'Elite Plus üyeleri öncelikli biniş ve ekstra bagaj hakkından faydalanır.',
  },
  {
    id: 'chat-016',
    provider: 'openai',
    model: 'gpt-4.1',
    title: 'Uçuş değişikliği nasıl yapılır',
    createdAt: '2026-03-25T15:00:00Z',
    updatedAt: '2026-03-25T15:20:00Z',
    lastMessagePreview: 'Uçuş değişikliği thy.com üzerinden veya çağrı merkezi aracılığıyla yapılabilir.',
  },
  {
    id: 'chat-017',
    provider: 'google',
    model: 'gemini-2.5-pro',
    title: 'Türkiye - Avrupa hat bilgileri',
    createdAt: '2026-03-24T12:00:00Z',
    updatedAt: '2026-03-24T12:45:00Z',
    lastMessagePreview: 'İstanbul\'dan Frankfurt\'a günlük 5 sefer bulunmaktadır.',
  },
  {
    id: 'chat-018',
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    title: 'Uçuş sigortası seçenekleri',
    createdAt: '2026-03-23T16:00:00Z',
    updatedAt: '2026-03-23T16:35:00Z',
    lastMessagePreview: 'Yolcu sigortası bilet fiyatının %3\'ü oranında sunulmaktadır.',
  },
  {
    id: 'chat-019',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    title: 'Türk Hava Yolları tarihçesi',
    createdAt: '2026-03-22T10:00:00Z',
    updatedAt: '2026-03-22T10:30:00Z',
    lastMessagePreview: 'THY 1933 yılında kurulmuş olup bugün 340\'tan fazla destinasyona uçmaktadır.',
  },
  {
    id: 'chat-020',
    provider: 'google',
    model: 'gemini-2.5-flash',
    title: 'Promosyon bilet koşulları',
    createdAt: '2026-03-21T09:00:00Z',
    updatedAt: '2026-03-21T09:20:00Z',
    lastMessagePreview: 'Promosyon biletlerde iade yapılamaz; tarih değişikliği ek ücrete tabidir.',
  },
];

/** İlk sayfa mock verisi — useGetChatsQuery için */
export const MOCK_CHATS: ChatListItem[] = ALL_MOCK_CHATS.slice(0, PAGE_SIZE);
