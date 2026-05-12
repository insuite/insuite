import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { addHotel } from '@/lib/adminApi';

import { AdminGate } from '@/components/admin/AdminGate';

export default function AdminHotelNew() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave =
    name.trim().length >= 2 &&
    city.trim().length >= 2 &&
    country.trim().length >= 2 &&
    !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const result = await addHotel({ name, city, country });
      if (!result.created) {
        Alert.alert(
          'Already exists',
          'A hotel with that name and city is already in the catalog. Pointing back to it.',
        );
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
      setSaving(false);
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
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.navTitle}>Add hotel</Text>
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

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <FieldLabel>HOTEL NAME</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grand Hyatt Tokyo"
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
              placeholder="e.g. Tokyo"
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
              placeholder="e.g. Japan"
              placeholderTextColor={colors.text.faint}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
            />

            <Text style={styles.hint}>
              Duplicates by (name + city) are detected — adding the same hotel
              twice is a no-op.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
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
  navTitle: { ...typography.h3, color: colors.text.primary },
  saveText: {
    ...typography.body,
    color: colors.accent.gold,
    fontWeight: '600',
  },
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
  hint: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
