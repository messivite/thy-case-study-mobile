import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { BrandSendButton } from '@/atoms/BrandSendButton';
import { AI_MODELS, AIModelId } from '@/constants/models';
import { Attachment } from '@/types/chat.types';
import { AttachmentPreview } from '@/molecules/AttachmentPreview';
import { AttachmentPickerSheet } from '@/molecules/AttachmentPickerSheet';
import { radius, spacing, shadow } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { palette } from '@/constants/colors';

type Props = {
  onSend: (text: string, attachments: Attachment[]) => void;
  onModelSelectorPress: () => void;
  selectedModel: AIModelId;
  disabled?: boolean;
  placeholder?: string;
};

export const ChatInput: React.FC<Props> = ({
  onSend,
  onModelSelectorPress,
  selectedModel,
  disabled = false,
  placeholder = 'Mesajınızı yazın...',
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(48);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const focusProgress = useSharedValue(0);

  const containerBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
  }));

  const handleFocus = () => focusProgress.value = withTiming(1, { duration: 200 });
  const handleBlur = () => focusProgress.value = withTiming(0, { duration: 200 });

  // --- Attachment helpers ---

  const addAttachment = (a: Attachment) =>
    setAttachments((prev) => [...prev, a]);

  const updateAttachment = (id: string, updates: Partial<Attachment>) =>
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  // Simulate upload — API entegrasyonunda gerçek upload ile değiştirilecek
  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.15 + Math.random() * 0.1;
      if (progress >= 1) {
        clearInterval(interval);
        updateAttachment(id, { status: 'done', progress: 1, remoteUrl: 'https://placeholder.url' });
      } else {
        updateAttachment(id, { status: 'uploading', progress });
      }
    }, 250);
  };

  // --- Pickers ---

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const id = `att_${Date.now()}`;
    const attachment: Attachment = {
      id,
      type: 'image',
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
      width: asset.width,
      height: asset.height,
      status: 'uploading',
      progress: 0,
    };
    addAttachment(attachment);
    simulateUpload(id);
  }, []);

  const handleGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5,
    });
    if (result.canceled || !result.assets?.length) return;

    result.assets.forEach((asset) => {
      const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const attachment: Attachment = {
        id,
        type: 'image',
        name: asset.fileName ?? `image_${Date.now()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        status: 'uploading',
        progress: 0,
      };
      addAttachment(attachment);
      simulateUpload(id);
    });
  }, []);

  const handleDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', '*/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const id = `att_${Date.now()}`;
    const isPDF = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');
    const attachment: Attachment = {
      id,
      type: isPDF ? 'pdf' : 'file',
      name: asset.name ?? `file_${Date.now()}`,
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size,
      status: 'uploading',
      progress: 0,
    };
    addAttachment(attachment);
    simulateUpload(id);
  }, []);

  // --- Send ---

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const hasContent = trimmed.length > 0 || attachments.length > 0;
    if (!hasContent || disabled) return;

    // Block if any attachment still uploading
    const stillUploading = attachments.some((a) => a.status === 'uploading');
    if (stillUploading) return;

    haptics.medium();
    onSend(trimmed, attachments);
    setText('');
    setAttachments([]);
    setInputHeight(48);
  }, [text, attachments, disabled, onSend]);

  const canSend =
    !disabled &&
    (text.trim().length > 0 || attachments.length > 0) &&
    !attachments.some((a) => a.status === 'uploading');

  const model = AI_MODELS.find((m) => m.id === selectedModel);
  const hasAttachments = attachments.length > 0;
  const imageAttachments = attachments.filter((a) => a.type === 'image');
  const fileAttachments = attachments.filter((a) => a.type !== 'image');

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.tabBarBg, borderTopColor: colors.tabBarBorder },
      ]}
    >
      {/* Attachment previews above input */}
      {hasAttachments && (
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.previewArea}
        >
          {/* Image row */}
          {imageAttachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagePreviewRow}
            >
              {imageAttachments.map((att) => (
                <AttachmentPreview
                  key={att.id}
                  attachment={att}
                  isInput
                  onRemove={() => removeAttachment(att.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* File list */}
          {fileAttachments.map((att) => (
            <AttachmentPreview
              key={att.id}
              attachment={att}
              isInput
              onRemove={() => removeAttachment(att.id)}
            />
          ))}
        </MotiView>
      )}

      {/* Input row */}
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
          shadow.sm,
          containerBorderStyle,
        ]}
      >
        {/* Model button */}
        <TouchableOpacity style={styles.modelBtn} onPress={onModelSelectorPress}>
          <Ionicons
            name={(model?.icon as any) ?? 'flash-outline'}
            size={18}
            color={model?.color ?? colors.primary}
          />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.base,
              height: Math.max(48, Math.min(inputHeight, 120)),
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          value={text}
          onChangeText={setText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onContentSizeChange={(e) =>
            setInputHeight(e.nativeEvent.contentSize.height + 16)
          }
          returnKeyType="default"
          editable={!disabled}
          textAlignVertical="center"
        />

        {/* Attachment button */}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => { haptics.light(); setPickerVisible(true); }}
          disabled={disabled}
        >
          <Ionicons
            name="attach"
            size={20}
            color={hasAttachments ? colors.primary : colors.textSecondary}
          />
          {hasAttachments && (
            <View style={[styles.attachBadge, { backgroundColor: colors.primary }]}>
              <Animated.Text
                style={{ color: palette.white, fontSize: 9, fontFamily: fontFamily.bold }}
              >
                {attachments.length}
              </Animated.Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Send button — THY branded */}
        <BrandSendButton
          size={34}
          onPress={handleSend}
          disabled={!canSend}
          style={{ marginBottom: Platform.OS === 'ios' ? 4 : 2 }}
        />
      </Animated.View>

      {/* Picker sheet */}
      <AttachmentPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onDocument={handleDocument}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[4],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  previewArea: {
    gap: spacing[2],
  },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  modelBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  input: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  attachBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 6 : 4,
    position: 'relative',
  },
  attachBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
