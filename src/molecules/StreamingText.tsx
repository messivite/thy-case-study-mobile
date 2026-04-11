import React, { useRef, useState, useEffect } from 'react';
import { Animated, Text as RNText, TextStyle } from 'react-native';

type Props = {
  content: string;
  color: string;
  style?: TextStyle;
};

/**
 * Streaming text — her yeni delta chunk'u opacity 0→1 ile fade-in yapar.
 * Önceki metin sabit, sadece yeni eklenen kısım animate olur.
 */
export const StreamingText: React.FC<Props> = React.memo(({ content, color, style }) => {
  const [committed, setCommitted] = useState('');
  const [pending, setPending] = useState(content);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevContentRef = useRef(content);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const prev = prevContentRef.current;
    if (content === prev) return;
    prevContentRef.current = content;

    if (content.startsWith(prev)) {
      const newText = content.slice(prev.length);
      // Önceki pending'i committed'e taşı, yeni delta'yı pending yap
      setCommitted(content.slice(0, prev.length));
      setPending(newText);
      // Fade-in yeni delta
      fadeAnim.setValue(0);
      animRef.current?.stop();
      animRef.current = Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      });
      animRef.current.start();
    } else {
      // Reset
      setCommitted('');
      setPending(content);
      fadeAnim.setValue(1);
    }
  }, [content]);

  return (
    <RNText style={[{ lineHeight: 22, minWidth: 40, color }, style]}>
      {committed}
      <Animated.Text style={{ opacity: fadeAnim, color }}>
        {pending}
      </Animated.Text>
    </RNText>
  );
});
