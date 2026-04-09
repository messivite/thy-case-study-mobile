// Offline queue setup — API entegrasyonunda OfflineManager ile yapılandırılacak
// @mustafaaksoy41/react-native-offline-queue kullanılacak
// Şimdilik placeholder export

export const offlineQueue = {
  add: (item: unknown) => {
    console.log('[OfflineQueue] Queued:', item);
  },
  flush: () => {
    console.log('[OfflineQueue] Flush');
  },
};

export default offlineQueue;
