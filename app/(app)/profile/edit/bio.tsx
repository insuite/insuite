import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { commitProfileUpdate } from '@/lib/profileApi';
import { useProfile } from '@/stores/profileStore';

const MAX_LEN = 120;
const ACCESSORY_ID = 'bioEditAccessory';

export default function EditBioScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [value, setValue] = useState(profile.bio);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const dirty = trimmed !== profile.bio;
  const canSave = dirty && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await commitProfileUpdate({ bio: trimmed });
      Keyboard.dismiss();
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.navTitle}>Bio</Text>
          <Pressable onPress={save} disabled={!canSave} hitSlop={12}>
            {saving ? (
              <ActivityIndicator color={colors.accent.gold} />
            ) : (
              <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            A quick hello for future co-guests.
          </Text>
          <TextInput
            value={value}
            onChangeText={(t) => setValue(t.slice(0, MAX_LEN))}
            placeholder="Business traveller, always up for a quiet coffee."
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            multiline
            maxLength={MAX_LEN}
            textAlignVertical="top"
            inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
          />
          <Text style={styles.counter}>
            {value.length}/{MAX_LEN}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={styles.accessory}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={8}>
              <Text style={styles.accessoryDone}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  saveText: {
    ...typography.body,
    color: colors.accent.gold,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  saveTextDisabled: {
    color: colors.text.ghost,
  },
  content: {
    padding: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  input: {
    minHeight: 140,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
    lineHeight: 24,
  },
  counter: {
    ...typography.small,
    color: colors.text.faint,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  accessory: {
    backgroundColor: colors.bg.secondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'flex-end',
  },
  accessoryDone: {
    color: colors.accent.gold,
    fontSize: 17,
    fontWeight: '600',
  },
});
