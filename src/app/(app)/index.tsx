import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { AgroColors as colors } from '@/constants/theme';

export default function Index() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgMain }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(app)/chat" />;
  }

  return <Redirect href="/(auth)/login" />;
}