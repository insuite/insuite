import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  approveHotelRequest,
  listPendingHotelRequests,
  rejectHotelRequest,
  type HotelRequestSummary,
} from '@/lib/adminApi';

import { AdminGate } from '@/components/admin/AdminGate';

export default function AdminRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<HotelRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<HotelRequestSummary | null>(
    null,
  );

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    listPendingHotelRequests()
      .then((list) => {
        if (cancelled) return;
        setRequests(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return refresh();
    }, [refresh]),
  );

  const onReject = (req: HotelRequestSummary) => {
    Alert.alert(
      'Reject this request?',
      `"${req.name}" (${req.city}) will be marked rejected. The submitter won't be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectHotelRequest(req.id);
              setRequests((prev) => prev.filter((r) => r.id !== req.id));
            } catch (err: any) {
              Alert.alert(
                'Could not reject',
                err?.message ?? 'Please try again.',
              );
            }
          },
        },
      ],
    );
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
          <Text style={styles.navTitle}>Hotel requests</Text>
          <View style={styles.navBtn} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCity}>
                  {item.city} · {item.country}
                </Text>
                {item.notes ? (
                  <Text style={styles.cardNotes}>"{item.notes}"</Text>
                ) : null}
                <Text style={styles.cardMeta}>
                  From {item.requesterName} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => onReject(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.rejectBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setApproveTarget(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.approveBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.approveText}>Approve…</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={32}
                  color={colors.text.faint}
                />
                <Text style={styles.emptyText}>No pending requests.</Text>
              </View>
            }
          />
        )}

        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={(id) => {
            setApproveTarget(null);
            setRequests((prev) => prev.filter((r) => r.id !== id));
          }}
        />
      </SafeAreaView>
    </AdminGate>
  );
}

function ApproveModal({
  request,
  onClose,
  onApproved,
}: {
  request: HotelRequestSummary | null;
  onClose: () => void;
  onApproved: (requestId: string) => void;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (request) {
      setName(request.name);
      setCity(request.city);
      setCountry(request.country);
      setSubmitting(false);
    }
  }, [request]);

  if (!request) return null;

  const canSubmit =
    name.trim().length >= 2 &&
    city.trim().length >= 2 &&
    country.trim().length >= 2 &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await approveHotelRequest({
        requestId: request.id,
        hotel: { name, city, country },
      });
      onApproved(request.id);
    } catch (err: any) {
      Alert.alert('Could not approve', err?.message ?? 'Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={request !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Approve hotel</Text>
            <Pressable onPress={submit} disabled={!canSubmit} hitSlop={12}>
              {submitting ? (
                <ActivityIndicator color={colors.accent.gold} />
              ) : (
                <Text
                  style={[
                    styles.modalConfirm,
                    !canSubmit && { color: colors.text.ghost },
                  ]}
                >
                  Approve
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalIntro}>
              Clean up the name / city / country if needed — these are what
              get inserted into the catalog. The request is then marked
              approved.
            </Text>

            <FieldLabel>HOTEL NAME</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={120}
            />

            <FieldLabel>CITY</FieldLabel>
            <TextInput
              value={city}
              onChangeText={setCity}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
            />

            <FieldLabel>COUNTRY</FieldLabel>
            <TextInput
              value={country}
              onChangeText={setCountry}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
            />

            {request.notes ? (
              <>
                <FieldLabel>SUBMITTER NOTES</FieldLabel>
                <Text style={styles.notesBlock}>"{request.notes}"</Text>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { ...typography.h3, color: colors.text.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  cardName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  cardCity: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  cardNotes: {
    ...typography.small,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  cardMeta: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: colors.accent.red,
    backgroundColor: 'transparent',
  },
  rejectText: {
    ...typography.body,
    color: colors.accent.red,
    fontWeight: '500',
  },
  approveBtn: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.accent.gold,
  },
  approveText: {
    ...typography.body,
    color: colors.accent.goldDark,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, color: colors.text.muted },
  modalContainer: { flex: 1, backgroundColor: colors.bg.primary },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  modalCancel: { ...typography.body, color: colors.text.muted },
  modalTitle: { ...typography.h3, color: colors.text.primary },
  modalConfirm: {
    ...typography.body,
    color: colors.accent.gold,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  modalIntro: {
    ...typography.small,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: spacing.sm,
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
  notesBlock: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
    lineHeight: 22,
  },
});
