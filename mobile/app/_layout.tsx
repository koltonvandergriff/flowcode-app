import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg.surface },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          contentStyle: { backgroundColor: colors.bg.base },
        }}
      />
    </>
  );
}
