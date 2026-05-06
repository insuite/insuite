import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { vibeTags } from '@/constants/vibes';
import { commitProfileUpdate } from '@/lib/profileApi';
import { useProfile } from '@/stores/profileStore';

export default function EditVibeScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(profile.vibeTags),
  );
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => {
    if (selected.size !== profile.vibeTags.length) return true;
    return profile.vibeTags.some((t) => !selected.has(t));
  }, [selected, profile.vibeTags]);

  const canSave = dirty && !saving;

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await commitProfileUpdate({ vibeTags: Array.from(selected) });
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Vibe</Text>
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

      <Text style={styles.subtitle}>
        A few tags so others know what to expect. Optional.
      </Text>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {vibeTags.map((tag) => {
          const active = selected.has(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => toggle(tag)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  chipText: {
    ...typography.body,
    color: colors.text.muted,
  },
  chipTextActive: {
    color: colors.text.primary,
  },
});
