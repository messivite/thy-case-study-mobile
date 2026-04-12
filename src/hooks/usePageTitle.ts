import { useEffect } from 'react';
import { Platform } from 'react-native';

export function usePageTitle(title: string) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = title;
  }, [title]);
}
