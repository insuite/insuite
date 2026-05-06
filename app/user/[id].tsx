import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { AvatarLightbox } from '@/components/ui/AvatarLightbox';
import { colors, radius, spacing, typography } from '@/constants/colors';
import { languageMap } from '@/constants/languages';
import { venueMap } from '@/constants/venues';
import { getUserProfile, type UserProfileSummary } from '@/lib/profileApi';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getUserProfile(id).then((p) => {
      if (cancelled) return;
      setProfile(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : !profile ? (
        <View style={styles.center}>
          <Text style={styles.missingText}>Profile not found.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Pressable onPress={() => setAvatarOpen(true)} hitSlop={6}>
              <Avatar
                uri={profile.avatarUri}
                initial={profile.initial}
                size={96}
                gold
              />
            </Pressable>
            <Text style={styles.name}>{profile.firstName}</Text>
          </View>

          {profile.languages.length > 0 && (
            <Section title="Languages">
              <View style={styles.chipRow}>
                {profile.languages.map((code) => {
                  const lang = languageMap[code];
                  if (!lang) return null;
                  return (
                    <View key={code} style={styles.chip}>
                      <Text style={styles.chipFlag}>{lang.flag}</Text>
                      <Text style={styles.chipText}>{lang.name}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          )}

          {profile.openTo.length > 0 && (
            <Section title="Open to">
              <View style={styles.chipRow}>
                {profile.openTo.map((key) => (
                  <View key={key} style={styles.chip}>
                    <Text style={styles.chipText}>{venueMap[key].label}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {profile.vibeTags.length > 0 && (
            <Section title="Vibe">
              <View style={styles.chipRow}>
                {profile.vibeTags.map((tag) => (
                  <View key={tag} style={styles.chip}>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {profile.bio.length > 0 && (
            <Section title="Bio">
              <Text style={styles.bioText}>{profile.bio}</Text>
            </Section>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {profile && (
        <AvatarLightbox
          visible={avatarOpen}
          onClose={() => setAvatarOpen(false)}
          uri={profile.avatarUri}
          initial={profile.initial}
          name={profile.firstName}
        />
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    ...typography.body,
    color: colors.text.muted,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  name: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  chipFlag: {
    fontSize: 14,
  },
  chipText: {
    ...typography.small,
    color: colors.text.primary,
  },
  bioText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
});
