import { Stack } from 'expo-router';

/**
 * Admin stack — each screen draws its own header (matching the rest of the
 * app), so the navigator just routes without any chrome of its own.
 */
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
