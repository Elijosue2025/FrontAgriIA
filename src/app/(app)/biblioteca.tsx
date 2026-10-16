import { View, Text, StyleSheet } from 'react-native';
import { AgroColors as colors } from '@/constants/theme';

export default function BibliotecaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Biblioteca Técnica</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { color: colors.text, fontSize: 22, fontWeight: '700' },
});