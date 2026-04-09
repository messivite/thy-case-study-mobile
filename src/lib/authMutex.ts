/**
 * authMutex.ts
 *
 * Aynı anda birden fazla API isteği 401 alırsa hepsi ayrı ayrı
 * refresh denemesi yapar — bu race condition'dır. Birinci refresh
 * başarıyla yeni token alır, ikincisi eski refresh token ile dener
 * ve Supabase "already used" hatası döner.
 *
 * Çözüm: Singleton Promise mutex.
 * - İlk 401 → refresh başlatır, Promise'i kaydeder
 * - Diğer 401'ler → aynı Promise'i bekler
 * - Refresh bitince hepsi aynı sonucu alır, retry yapar
 *
 *  Kullanım (api.ts interceptor içinde):
 *
 *    const session = await authMutex.refresh();
 *    if (!session) { logout(); return; }
 *    // yeni token ile retry
 */

import { supabase } from '@/services/supabase';
import { persistSession } from '@/services/authService';

type RefreshResult =
  | { ok: true; accessToken: string }
  | { ok: false };

class AuthMutex {
  private _refreshPromise: Promise<RefreshResult> | null = null;

  /**
   * Refresh mutex'i. Eş zamanlı çağrılarda sadece bir tanesi
   * Supabase'e istek yapar; diğerleri aynı Promise'i bekler.
   */
  async refresh(): Promise<RefreshResult> {
    // Zaten devam eden bir refresh var → onu bekle
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    // İlk çağrı → refresh başlat ve Promise'i sakla
    this._refreshPromise = this._doRefresh().finally(() => {
      this._refreshPromise = null;
    });

    return this._refreshPromise;
  }

  private async _doRefresh(): Promise<RefreshResult> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        return { ok: false };
      }

      // Yeni token'ları SecureStore'a yaz
      await persistSession({
        user: {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          name:
            (data.session.user.user_metadata?.full_name as string) ??
            data.session.user.email?.split('@')[0] ??
            '',
          avatarUrl: data.session.user.user_metadata?.avatar_url as string | undefined,
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt:
          data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      });

      return { ok: true, accessToken: data.session.access_token };
    } catch {
      return { ok: false };
    }
  }

  /** Manuel reset — test veya logout sonrası için */
  reset() {
    this._refreshPromise = null;
  }
}

// Uygulama genelinde tek instance
export const authMutex = new AuthMutex();
