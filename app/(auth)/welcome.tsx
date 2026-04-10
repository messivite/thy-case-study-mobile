/**
 * WelcomeScreen
 *
 * Onboarding bittikten sonra gösterilen ilk auth ekranı.
 * Ekran görüntüsündeki tasarımı referans alır:
 *   - Üst %45: açık mavi-gri gradient hero (uçak ikonu, başlık, alt başlık)
 *   - Alt %55: beyaz kart — email/password giriş formu, login butonu,
 *              Google ile giriş, misafir devam linki
 *
 * Animasyon: Tek seferlik mount fade-in, sallantı/spring yok.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { FormField } from '@/molecules/FormField';
import { Text } from '@/atoms/Text';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { scale } from '@/lib/responsive';

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().min(1, 'E-posta zorunludur').email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_RATIO = 0.38;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WelcomeScreen() {
  const { t } = useI18n();
  const { status } = useAuth();
  const { login, loginWithGoogle, continueAsGuest } = useSupabaseAuth();

  // Mount fade-in — tek seferlik, RN Animated (Reanimated bağımlılığı yok burada)
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, []);

  // Authenticated guard
  useEffect(() => {
    if (status === 'authenticated' || status === 'guest') {
      router.replace('/(tabs)');
    }
  }, [status]);

  if (status === 'authenticated' || status === 'guest') return null;

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    const result = await login(data.email, data.password);
    if (result.ok) {
      toast.success(t('toast.loginSuccess'));
    } else {
      toast.error(result.error);
    }
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
  };

  const handleGuest = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <RNAnimated.View style={[styles.fill, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── Hero ─────────────────────────────────────────── */}
            <LinearGradient
              colors={['#D8E8F5', '#E8F2FA', '#F0F6FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={styles.hero}
            >
              {/* Uçak ikonu */}
              <View style={styles.planeCircle}>
                <Ionicons name="airplane" size={scale(28)} color={palette.primary} />
              </View>

              {/* Başlık */}
              <Text style={styles.heroTitle}>
                Elevate Your{'\n'}
                <Text style={styles.heroTitleAccent}>Journey</Text>
              </Text>

              {/* Alt başlık */}
              <Text style={styles.heroSub}>
                {t('auth.welcomeSubtitle')}
              </Text>
            </LinearGradient>

            {/* ── Form Card ────────────────────────────────────── */}
            <View style={styles.card}>

              {/* Email */}
              <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
              <FormField
                control={control}
                name="email"
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Ionicons name="mail-outline" size={18} color={palette.gray400} />}
              />

              {/* Password */}
              <View style={styles.passwordHeader}>
                <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
                <TouchableOpacity
                  onPress={() => {}}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
                >
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              </View>
              <FormField
                control={control}
                name="password"
                placeholder={t('auth.passwordPlaceholder')}
                secure
              />

              {/* Login butonu */}
              <TouchableOpacity
                style={[styles.loginBtn, isSubmitting && styles.loginBtnDisabled]}
                onPress={handleSubmit(onSubmit)}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loginBtnRow}>
                    <Ionicons name="reload-outline" size={scale(16)} color={palette.white} />
                    <Text style={styles.loginBtnText}>Giriş yapılıyor...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogle}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google" size={scale(18)} color="#4285F4" />
                <Text style={styles.googleBtnText}>{t('auth.loginWithGoogle')}</Text>
              </TouchableOpacity>

              {/* Alt linkler */}
              <View style={styles.footer}>
                <TouchableOpacity onPress={handleGuest} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
                  <Text style={styles.footerLink}>{t('auth.continueAsGuest')}</Text>
                </TouchableOpacity>
                <View style={styles.footerDot} />
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                >
                  <Text style={styles.footerLink}>{t('auth.register')}</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </RNAnimated.View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#D8E8F5',
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },

  // Hero
  hero: {
    height: SCREEN_H * HERO_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  planeCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: 999,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: spacing[1],
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: scale(28),
    color: palette.navy,
    textAlign: 'center',
    lineHeight: scale(34),
  },
  heroTitleAccent: {
    fontFamily: fontFamily.bold,
    fontSize: scale(28),
    color: palette.primary,
    lineHeight: scale(34),
  },
  heroSub: {
    fontFamily: fontFamily.regular,
    fontSize: scale(13),
    color: palette.gray500,
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: palette.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[7],
    paddingBottom: spacing[8],
    marginTop: -spacing[4],
  },

  // Form
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(12),
    color: palette.gray600,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
    marginTop: spacing[2],
  },
  forgotText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(12),
    color: palette.primary,
    letterSpacing: 0.2,
  },

  // Login button
  loginBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.xl,
    height: scale(52),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loginBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(16),
    color: palette.white,
    letterSpacing: 0.2,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[5],
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.gray100,
  },
  dividerText: {
    fontFamily: fontFamily.regular,
    fontSize: scale(12),
    color: palette.gray400,
    letterSpacing: 0.2,
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(52),
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    gap: spacing[3],
  },
  googleBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(15),
    color: palette.gray700,
    letterSpacing: 0.1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[6],
    gap: spacing[3],
  },
  footerLink: {
    fontFamily: fontFamily.medium,
    fontSize: scale(12),
    color: palette.gray400,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: palette.gray300,
  },
});
