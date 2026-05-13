import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/colors';
import { useProfile } from '@/stores/profileStore';

/**
 * Wraps an admin screen with a client-side gate: non-admins get bounced
 * back to the previous route. RLS is the real enforcer (every write goes
 * through admin-only policies in supabase/admin_role.sql) — this is just
 * UX so a deep-linked or stale-cached non-admin doesn't stare at empty
 * lists and failing actions.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const profile = useProfile();

  useEffect(() => {
    if (!profile.isAdmin) {
      // Slight delay so router has mounted; replace so back doesn't loop.
      const t = setTimeout(() => router.replace('/profile'), 0);
      return () => clearTimeout(t);
    }
  }, [profile.isAdmin, router]);

  if (!profile.isAdmin) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Returning…</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fallbackText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
