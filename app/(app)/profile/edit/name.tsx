import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const MAX_LEN = 20;

export default function EditNameScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [value, setValue] = useState(profile.firstName);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const valid = trimmed.length > 0;
  const dirty = trimmed !== profile.firstName;
  const canSave = valid && dirty && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await commitProfileUpdate({ firstName: trimmed });
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
        <NavBar
          title="First name"
          onBack={() => router.back()}
          onSave={save}
          canSave={canSave}
          saving={saving}
        />

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            This is how fellow guests will see you.
          </Text>
          <TextInput
            value={value}
            onChangeText={(t) => setValue(t.slice(0, MAX_LEN))}
            placeholder="James"
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={MAX_LEN}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={styles.counter}>
            {trimmed.length}/{MAX_LEN}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NavBar({
  title,
  onBack,
  onSave,
  canSave,
  saving,
}: {
  title: string;
  onBack: () => void;
  onSave: () => void;
  canSave: boolean;
  saving?: boolean;
}) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </Pressable>
      <Text style={styles.navTitle}>{title}</Text>
      <Pressable onPress={onSave} disabled={!canSave} hitSlop={12}>
        {saving ? (
          <ActivityIndicator color={colors.accent.gold} />
        ) : (
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            Save
          </Text>
        )}
      </Pressable>
    </View>
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
    marginBottom: spacing.xl,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '300',
  },
  counter: {
    ...typography.small,
    color: colors.text.faint,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveBtnText: {
    ...typography.body,
    color: colors.accent.gold,
  },
});
