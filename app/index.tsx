import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useAuth } from '@/stores/authStore';

export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.gold} />
      </View>
    );
  }

  if (status === 'needsOnboarding') {
    return <Redirect href="/onboarding/name" />;
  }

  if (status === 'ready') {
    return <Redirect href="/discover" />;
  }

  // signedOut (or supabase not configured)
  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
