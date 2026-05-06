import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { authStore } from '@/stores/authStore';

export default function RootLayout() {
  useEffect(() => {
    void authStore.init();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg.primary },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen
            name="activity/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="activity/edit/[id]"
            options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen name="plans" options={{ headerShown: false }} />
          <Stack.Screen name="legal" options={{ headerShown: false }} />
        </Stack>
      </View>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
