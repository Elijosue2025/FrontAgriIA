import { Stack } from 'expo-router';
import { AgroColors as colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgMain },
        animation: 'fade',
      }}
    />
  );
}