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
import { venues, type VenueKey } from '@/constants/venues';
import { commitProfileUpdate } from '@/lib/profileApi';
import { useProfile } from '@/stores/profileStore';

export default function EditActivitiesScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [selected, setSelected] = useState<Set<VenueKey>>(
    new Set(profile.openTo),
  );
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => {
    if (selected.size !== profile.openTo.length) return true;
    return profile.openTo.some((k) => !selected.has(k));
  }, [selected, profile.openTo]);

  const valid = selected.size > 0;
  const canSave = valid && dirty && !saving;

  const toggle = (key: VenueKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await commitProfileUpdate({ openTo: Array.from(selected) });
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
        <Text style={styles.navTitle}>Open to</Text>
        <Pressable onPress={save} disabled={!canSave} hitSlop={12}>
          {saving ? (
            <ActivityIndicator color={colors.accent.gold} />
          ) : (
            <Text
              style={[styles.saveText, !canSave && styles.saveTextDisabled]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Pick the meetups you'd join.</Text>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {venues.map((venue) => {
          const active = selected.has(venue.key);
          return (
            <Pressable
              key={venue.key}
              onPress={() => toggle(venue.key)}
              style={[styles.card, active && styles.cardActive]}
            >
              <Ionicons
                name={venue.icon as any}
                size={26}
                color={active ? colors.accent.gold : colors.text.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                  {venue.label}
                </Text>
                <Text style={styles.cardDesc}>{venue.description}</Text>
              </View>
              {active && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.accent.gold}
                />
              )}
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
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
  },
  cardActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  cardLabel: {
    ...typography.h3,
    color: colors.text.muted,
  },
  cardLabelActive: {
    color: colors.text.primary,
  },
  cardDesc: {
    ...typography.small,
    color: colors.text.faint,
    marginTop: 2,
  },
});
