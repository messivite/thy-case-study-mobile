import { unstable_batchedUpdates } from '@/lib/batchedUpdates.web';

describe('batchedUpdates.web', () => {
  it('fonksiyon çağrısını senkron olarak çalıştırır', () => {
    let called = false;
    unstable_batchedUpdates(() => { called = true; });
    expect(called).toBe(true);
  });

  it('iç dönüş değerini geçer', () => {
    let result: number | undefined;
    unstable_batchedUpdates(() => { result = 42; });
    expect(result).toBe(42);
  });

  it('birden fazla state güncellemesi batch\'lenir (no-op test)', () => {
    const updates: string[] = [];
    unstable_batchedUpdates(() => {
      updates.push('a');
      updates.push('b');
      updates.push('c');
    });
    expect(updates).toEqual(['a', 'b', 'c']);
  });
});
