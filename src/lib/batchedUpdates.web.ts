// React 18'de state güncellemeleri otomatik batch'lenir — no-op yeterli.
export const unstable_batchedUpdates = (fn: () => void) => fn();
