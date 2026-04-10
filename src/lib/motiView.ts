/**
 * moti ana girişi (`import { MotiView } from 'moti'`) bileşen barrel'ında
 * `safe-area-view` modülünü de yüklüyor; o modül react-native'deki
 * deprecated SafeAreaView getter'ını tetikleyip Metro WARN üretiyor.
 *
 * Yalnızca animasyonlu View gerekiyorsa bu dosyadan içe aktarın.
 */
export { View as MotiView } from 'moti/build/components/view.js';
