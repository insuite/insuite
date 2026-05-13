import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  countActivitiesAtHotel,
  deleteHotel,
  getHotelById,
  updateHotel,
  type AdminHotel,
} from '@/lib/adminApi';

import { AdminGate } from '@/components/admin/AdminGate';

export default function AdminHotelEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [hotel, setHotel] = useState<AdminHotel | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void Promise.all([getHotelById(id), countActivitiesAtHotel(id)]).then(
      ([h, count]) => {
        if (cancelled) return;
        if (h) {
          setHotel(h);
          setName(h.name);
          setCity(h.city);
          setCountry(h.country);
        }
        setActivityCount(count);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dirty =
    hotel !== null &&
    (name.trim() !== hotel.name ||
      city.trim() !== hotel.city ||
      country.trim() !== hotel.country);
  const canSave =
    dirty &&
    name.trim().length >= 2 &&
    city.trim().length >= 2 &&
    country.trim().length >= 2 &&
    !saving;

  const save = async () => {
    if (!canSave || !id) return;
    setSaving(true);
    try {
      await updateHotel(id, { name, city, country });
      router.back();
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!hotel || !id) return;
    const dependents = activityCount ?? 0;
    if (dependents > 0) {
      Alert.alert(
        'Cannot delete',
        `${dependents} activit${dependents === 1 ? 'y is' : 'ies are'} linked to this hotel. Reassign or remove ${dependents === 1 ? 'it' : 'them'} first, then come back.`,
      );
      return;
    }
    Alert.alert(
      'Delete hotel?',
      `"${hotel.name}" will be removed from the catalog. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
    );
  };

  const doDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteHotel(id);
      router.back();
    } catch (err: any) {
      Alert.alert('Could not delete', err?.message ?? 'Please try again.');
      setDeleting(false);
    }
  };

  return (
    <AdminGate>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.navBtn}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text.primary}
            />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            Edit hotel
          </Text>
          <Pressable
            onPress={save}
            disabled={!canSave}
            hitSlop={12}
            style={styles.navBtn}
          >
            {saving ? (
              <ActivityIndicator color={colors.accent.gold} />
            ) : (
              <Text
                style={[
                  styles.saveText,
                  !canSave && { color: colors.text.ghost },
                ]}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : !hotel ? (
          <View style={styles.loading}>
            <Text style={styles.empty}>Hotel not found.</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.scroll}>
              <FieldLabel>HOTEL NAME</FieldLabel>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.text.faint}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={120}
              />

              <FieldLabel>CITY</FieldLabel>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholderTextColor={colors.text.faint}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={80}
              />

              <FieldLabel>COUNTRY</FieldLabel>
              <TextInput
                value={country}
                onChangeText={setCountry}
                placeholderTextColor={colors.text.faint}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={80}
              />

              <View style={styles.meta}>
                <Text style={styles.metaLabel}>Linked activities</Text>
                <Text style={styles.metaValue}>
                  {activityCount === null ? '…' : activityCount}
                </Text>
              </View>

              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.accent.red} />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.accent.red}
                    />
                    <Text style={styles.deleteText}>Delete hotel</Text>
                  </>
                )}
              </Pressable>
              {(activityCount ?? 0) > 0 && (
                <Text style={styles.deleteHint}>
                  Delete is blocked while activities reference this hotel.
                </Text>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </AdminGate>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  navBtn: {
    minWidth: 60,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  saveText: {
    ...typography.body,
    color: colors.accent.gold,
    fontWeight: '600',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { ...typography.body, color: colors.text.muted },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  fieldLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    fontSize: 16,
  },
  meta: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: { ...typography.small, color: colors.text.muted },
  metaValue: { ...typography.body, color: colors.text.primary, fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  deleteText: {
    ...typography.body,
    color: colors.accent.red,
    fontWeight: '600',
  },
  deleteHint: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
