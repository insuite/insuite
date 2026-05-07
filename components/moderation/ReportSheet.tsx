import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  REPORT_REASON_LABELS,
  submitReport,
  type ReportInput,
  type ReportReason,
} from '@/lib/moderationApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Exactly one of these should be set. */
  target: { userId: string } | { activityId: string } | { messageId: string };
  /** Short title shown above the reason picker, e.g. "Report Yuko". */
  title: string;
}

const REASONS: ReportReason[] = [
  'harassment',
  'sexual',
  'spam',
  'impersonation',
  'underage',
  'other',
];

export function ReportSheet({ visible, onClose, target, title }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
    }
  }, [visible]);

  const submit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      const input: ReportInput = { reason, details: details.trim() || undefined };
      if ('userId' in target) input.userId = target.userId;
      else if ('activityId' in target) input.activityId = target.activityId;
      else input.messageId = target.messageId;
      await submitReport(input);
      onClose();
      Alert.alert(
        'Thanks for letting us know',
        'A reviewer will look into this within 24 hours. If we need more info, we may reach out via the email on your account.',
      );
    } catch (err: any) {
      Alert.alert('Could not submit', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.intro}>
              What's wrong? We review every report.
            </Text>

            <View style={styles.reasonsCard}>
              {REASONS.map((r, i) => {
                const selected = reason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    style={[
                      styles.reasonRow,
                      i === REASONS.length - 1 && styles.reasonRowLast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        selected && styles.reasonTextSelected,
                      ]}
                    >
                      {REPORT_REASON_LABELS[r]}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.accent.gold}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>DETAILS (OPTIONAL)</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Anything we should know?"
              placeholderTextColor={colors.text.faint}
              style={styles.detailsInput}
              multiline
              maxLength={1000}
            />

            <Pressable
              onPress={submit}
              disabled={!reason || submitting}
              style={({ pressed }) => [
                styles.submitBtn,
                (!reason || submitting) && styles.submitBtnDisabled,
                pressed && reason && !submitting && { opacity: 0.85 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accent.goldDark} />
              ) : (
                <Text
                  style={[
                    styles.submitText,
                    !reason && styles.submitTextDisabled,
                  ]}
                >
                  Submit report
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  cancel: {
    ...typography.body,
    color: colors.text.muted,
    width: 60,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  body: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  intro: {
    ...typography.body,
    color: colors.text.muted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  reasonsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    overflow: 'hidden',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  reasonRowLast: {
    borderBottomWidth: 0,
  },
  reasonText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  reasonTextSelected: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  label: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  detailsInput: {
    height: 110,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  submitText: {
    color: colors.accent.goldDark,
    fontSize: 17,
    fontWeight: '600',
  },
  submitTextDisabled: {
    color: colors.text.faint,
  },
});
