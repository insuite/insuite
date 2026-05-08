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

import { Avatar } from '@/components/ui/Avatar';
import { colors, radius, spacing, typography } from '@/constants/colors';
import { languageMap } from '@/constants/languages';
import { venueMap } from '@/constants/venues';
import { deleteAccount } from '@/lib/accountApi';
import { signOut as supabaseSignOut } from '@/lib/auth';
import { presentAvatarPicker } from '@/lib/avatarPicker';
import { commitProfileUpdate, removeAvatar, uploadAvatar } from '@/lib/profileApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { notificationsStore } from '@/stores/notificationsStore';
import { profileStore, useProfile } from '@/stores/profileStore';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfile();

  const initial = useMemo(
    () => (profile.firstName[0] ?? '?').toUpperCase(),
    [profile.firstName],
  );

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabaseSignOut();
      } catch {
        // best effort — local reset still happens via auth listener
      }
    }
    profileStore.reset();
    router.replace('/');
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete account?',
      'All your activities, messages, photos, and profile will be permanently removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This action is permanent. There is no recovery.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: doDelete,
                },
              ],
            );
          },
        },
      ],
    );
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      profileStore.reset();
      notificationsStore.reset();
      router.replace('/welcome');
    } catch (err: any) {
      Alert.alert('Could not delete', err?.message ?? 'Please try again.');
      setDeleting(false);
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const onAvatarPress = () => {
    if (uploadingAvatar) return;
    presentAvatarPicker({
      onPicked: async (localUri) => {
        setUploadingAvatar(true);
        try {
          const publicUrl = await uploadAvatar(localUri);
          await commitProfileUpdate({ avatarUri: publicUrl });
        } catch (err: any) {
          Alert.alert('Upload failed', err?.message ?? 'Please try again.');
        } finally {
          setUploadingAvatar(false);
        }
      },
      onRemoved: profile.avatarUri
        ? async () => {
            setUploadingAvatar(true);
            try {
              await removeAvatar();
            } catch (err: any) {
              Alert.alert('Update failed', err?.message ?? 'Please try again.');
            } finally {
              setUploadingAvatar(false);
            }
          }
        : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Pressable onPress={onAvatarPress} style={styles.avatarWrap} hitSlop={6}>
            <Avatar uri={profile.avatarUri} initial={initial} size={84} gold />
            {uploadingAvatar && (
              <View style={styles.avatarSpinner}>
                <ActivityIndicator color={colors.accent.gold} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons
                name={uploadingAvatar ? 'cloud-upload' : 'camera'}
                size={14}
                color={colors.accent.goldDark}
              />
            </View>
          </Pressable>
          <Text style={styles.name}>{profile.firstName}</Text>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons
              name="create-outline"
              size={14}
              color={colors.text.secondary}
            />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        </View>

        <Section title="Languages">
          {profile.languages.length === 0 ? (
            <Text style={styles.empty}>None set</Text>
          ) : (
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
          )}
        </Section>

        <Section title="Open to">
          {profile.openTo.length === 0 ? (
            <Text style={styles.empty}>None set</Text>
          ) : (
            <View style={styles.chipRow}>
              {profile.openTo.map((key) => (
                <View key={key} style={styles.chip}>
                  <Text style={styles.chipText}>{venueMap[key].label}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Vibe">
          {profile.vibeTags.length === 0 ? (
            <Pressable onPress={() => router.push('/profile/edit/vibe')}>
              <Text style={styles.mutedLink}>+ Add vibe tags</Text>
            </Pressable>
          ) : (
            <View style={styles.chipRow}>
              {profile.vibeTags.map((tag) => (
                <View key={tag} style={styles.chip}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Bio">
          {profile.bio ? (
            <Text style={styles.bodyText}>{profile.bio}</Text>
          ) : (
            <Pressable onPress={() => router.push('/profile/edit/bio')}>
              <Text style={styles.mutedLink}>+ Add a one-line bio</Text>
            </Pressable>
          )}
        </Section>

        <View style={styles.divider} />

        <MenuRow
          icon="card-outline"
          label="Plans & pricing"
          onPress={() => router.push('/plans')}
        />
        <MenuRow
          icon="gift-outline"
          label="Invite friends"
          trailing={profile.referralCode}
          onPress={() => router.push('/plans/referral')}
        />
        <MenuRow
          icon="ticket-outline"
          label="Redeem a code"
          onPress={() => router.push('/plans/redeem')}
        />
        <MenuRow
          icon="ban-outline"
          label="Blocked users"
          onPress={() => router.push('/profile/blocked')}
        />
        <MenuRow icon="notifications-outline" label="Notifications" />
        <MenuRow icon="help-circle-outline" label="Help & support" />

        <View style={styles.divider} />

        <MenuRow
          icon="shield-checkmark-outline"
          label="Privacy policy"
          onPress={() => router.push('/legal/privacy')}
        />
        <MenuRow
          icon="document-text-outline"
          label="Terms of service"
          onPress={() => router.push('/legal/terms')}
        />

        <View style={styles.divider} />

        <Pressable style={styles.signOut} onPress={signOut}>
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.accent.red}
          />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Pressable
          style={styles.deleteLink}
          onPress={handleDelete}
          disabled={deleting}
          hitSlop={6}
        >
          {deleting ? (
            <ActivityIndicator color={colors.accent.red} />
          ) : (
            <Text style={styles.deleteLinkText}>Delete account</Text>
          )}
        </Pressable>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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

function MenuRow({
  icon,
  label,
  trailing,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={colors.text.secondary} />
      <Text style={styles.menuLabel}>{label}</Text>
      {trailing && <Text style={styles.menuTrailing}>{trailing}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.text.ghost} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  avatarWrap: {
    width: 84,
    height: 84,
  },
  avatarSpinner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 42,
    backgroundColor: 'rgba(15, 14, 12, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.gold,
    borderWidth: 2,
    borderColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: spacing.xs,
  },
  editText: {
    ...typography.small,
    color: colors.text.secondary,
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
  empty: {
    ...typography.body,
    color: colors.text.faint,
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
  bodyText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  mutedLink: {
    ...typography.body,
    color: colors.accent.gold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.md,
    marginHorizontal: spacing.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  menuTrailing: {
    ...typography.small,
    color: colors.accent.gold,
    letterSpacing: 1,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.redBg,
    backgroundColor: colors.accent.redBg,
  },
  signOutText: {
    ...typography.body,
    color: colors.accent.red,
    fontWeight: '500',
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteLinkText: {
    ...typography.small,
    color: colors.accent.red,
    textDecorationLine: 'underline',
  },
});
