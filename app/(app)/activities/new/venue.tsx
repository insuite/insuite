import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { venues, type VenueKey } from '@/constants/venues';
import { activityDraft, useActivityDraft } from '@/stores/activityDraftStore';

export default function VenueStep() {
  const router = useRouter();
  const draft = useActivityDraft();

  const pick = (key: VenueKey) => {
    activityDraft.set({ venue: key });
    router.push('/activities/new/datetime');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text.muted} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.step}>2 / 4</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.title}>Where do you{'\n'}want to meet?</Text>
        <Text style={styles.subtitle}>
          {draft.hotelName ? `At ${draft.hotelName}` : 'Pick one venue at your hotel.'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {venues.map((venue) => {
          const active = draft.venue === venue.key;
          return (
            <Pressable
              key={venue.key}
              onPress={() => pick(venue.key)}
              style={({ pressed }) => [
                styles.card,
                active && styles.cardActive,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={venue.icon as any}
                  size={26}
                  color={active ? colors.accent.gold : colors.text.secondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                  {venue.label}
                </Text>
                <Text style={styles.cardDesc}>{venue.description}</Text>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'chevron-forward'}
                size={active ? 22 : 16}
                color={active ? colors.accent.gold : colors.text.ghost}
              />
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
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.subtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.gold,
  },
  step: {
    ...typography.tiny,
    color: colors.text.muted,
    letterSpacing: 1.5,
  },
  intro: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  title: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
  },
  grid: {
    gap: spacing.sm,
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
  cardPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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
