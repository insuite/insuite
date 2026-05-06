import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { languageMap } from '@/constants/languages';
import { venueMap } from '@/constants/venues';
import { presentAvatarPicker } from '@/lib/avatarPicker';
import { commitProfileUpdate, removeAvatar, uploadAvatar } from '@/lib/profileApi';
import { useProfile } from '@/stores/profileStore';

export default function EditProfileMenu() {
  const router = useRouter();
  const profile = useProfile();

  const langPreview =
    profile.languages.length === 0
      ? 'None'
      : profile.languages
          .map((code) => languageMap[code]?.name ?? code)
          .join(', ');

  const openToPreview =
    profile.openTo.length === 0
      ? 'None'
      : profile.openTo.map((k) => venueMap[k].label).join(', ');

  const vibePreview =
    profile.vibeTags.length === 0 ? 'None' : profile.vibeTags.join(', ');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onPickPhoto = () => {
    if (uploadingPhoto) return;
    presentAvatarPicker({
      onPicked: async (localUri) => {
        setUploadingPhoto(true);
        try {
          const publicUrl = await uploadAvatar(localUri);
          await commitProfileUpdate({ avatarUri: publicUrl });
        } catch (err: any) {
          Alert.alert('Upload failed', err?.message ?? 'Please try again.');
        } finally {
          setUploadingPhoto(false);
        }
      },
      onRemoved: profile.avatarUri
        ? async () => {
            setUploadingPhoto(true);
            try {
              await removeAvatar();
            } catch (err: any) {
              Alert.alert('Update failed', err?.message ?? 'Please try again.');
            } finally {
              setUploadingPhoto(false);
            }
          }
        : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Edit profile</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={onPickPhoto}
          disabled={uploadingPhoto}
          style={({ pressed }) => [
            styles.row,
            pressed && !uploadingPhoto && { opacity: 0.7 },
          ]}
        >
          {profile.avatarUri ? (
            <Image
              source={{ uri: profile.avatarUri }}
              style={styles.photoThumb}
            />
          ) : (
            <View style={styles.rowIcon}>
              <Ionicons
                name="camera-outline"
                size={18}
                color={colors.accent.gold}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Photo</Text>
            <Text
              style={[
                styles.rowValue,
                !profile.avatarUri && styles.rowValuePlaceholder,
              ]}
              numberOfLines={1}
            >
              {uploadingPhoto
                ? 'Uploading…'
                : profile.avatarUri
                  ? 'Tap to change'
                  : 'Add a profile picture'}
            </Text>
          </View>
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.accent.gold} />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.text.ghost}
            />
          )}
        </Pressable>

        <EditRow
          icon="person-outline"
          label="First name"
          value={profile.firstName}
          onPress={() => router.push('/profile/edit/name')}
        />
        <EditRow
          icon="chatbox-outline"
          label="Bio"
          value={profile.bio || 'Add a one-line bio'}
          placeholder={!profile.bio}
          onPress={() => router.push('/profile/edit/bio')}
        />
        <EditRow
          icon="language-outline"
          label="Languages"
          value={langPreview}
          onPress={() => router.push('/profile/edit/languages')}
        />
        <EditRow
          icon="sparkles-outline"
          label="Open to"
          value={openToPreview}
          onPress={() => router.push('/profile/edit/activities')}
        />
        <EditRow
          icon="color-wand-outline"
          label="Vibe"
          value={vibePreview}
          onPress={() => router.push('/profile/edit/vibe')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function EditRow({
  icon,
  label,
  value,
  placeholder,
  onPress,
}: {
  icon: any;
  label: string;
  value: string;
  placeholder?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.accent.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={[styles.rowValue, placeholder && styles.rowValuePlaceholder]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.text.ghost} />
    </Pressable>
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
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginBottom: 2,
  },
  rowValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  rowValuePlaceholder: {
    color: colors.accent.gold,
  },
  photoThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
});
