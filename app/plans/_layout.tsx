import { Stack } from 'expo-router';

import { colors } from '@/constants/colors';

export default function PlansLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.primary },
        animation: 'slide_from_right',
      }}
    />
  );
}
