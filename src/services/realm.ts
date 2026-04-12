/**
 * realm.ts — TypeScript anchor only
 *
 * Metro runtime'da platformu otomatik seçer:
 *   - native → realm.native.ts  (Realm DB)
 *   - web    → realm.web.ts     (localStorage)
 *
 * Bu dosya hiçbir zaman bundle'a girmez — sadece TS için tip kaynağı.
 * Buraya native veya realm import ETME, web bundle da bu dosyayı görür.
 */

// Web implementasyonundan tip çıkar — ikisi aynı shape'e sahip
import type { realmService as _RealmService } from './realm.web';

// Metro .native.ts / .web.ts'i seçer; bu declare sadece TS'e shape'i söyler
declare const realmService: typeof _RealmService;
export { realmService };
