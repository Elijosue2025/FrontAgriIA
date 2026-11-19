import { ComponentProps } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AgroColors as colors } from '@/constants/theme';

type Props = {
  titulo: string;
  descripcion: string;
  icono: ComponentProps<typeof FontAwesome5>['name'];
};

/** Pantalla provisional hasta que el catálogo esté disponible en el API. */
export default function Placeholder({ titulo, descripcion, icono }: Props) {
  return (
    <View style={s.container}>
      <View style={s.icono}>
        <FontAwesome5 name={icono} size={28} color={colors.green} />
      </View>
      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.desc}>{descripcion}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bgMain,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  icono: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  titulo: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  desc: {
    color: colors.textSecondary, marginTop: 8, lineHeight: 20,
    textAlign: 'center', maxWidth: 420,
  },
});
