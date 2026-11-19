import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { AgroColors as colors } from '@/constants/theme';
import { EstadoVision, obtenerEstadoVision } from '@/services/diagnosticoService';

export default function AdminDiagnosticosScreen() {
  const [estado, setEstado] = useState<EstadoVision | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setEstado(await obtenerEstadoVision());
    } catch (e: any) {
      setError(e.message || 'No se pudo consultar el estado del diagnóstico');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Diagnósticos</Text>
      <Text style={s.sub}>Estado del módulo de análisis de imágenes.</Text>

      {cargando && <ActivityIndicator color={colors.green} style={{ marginTop: 16 }} />}
      {!!error && <Text style={s.error}>{error}</Text>}

      {estado && (
        <View style={s.card}>
          <View style={s.fila}>
            <FontAwesome5
              name={estado.modeloDisponible ? 'check-circle' : 'exclamation-circle'}
              size={18}
              color={estado.modeloDisponible ? colors.green : colors.danger}
            />
            <Text style={s.cardTitle}>
              {estado.modeloDisponible ? 'Modelo cargado' : 'Sin modelo de reconocimiento'}
            </Text>
          </View>
          {!!estado.modelo && <Text style={s.linea}>Modelo: {estado.modelo}</Text>}
          <Text style={s.linea}>Clases reconocidas: {estado.numeroEtiquetas}</Text>
          {!!estado.detalle && <Text style={s.detalle}>{estado.detalle}</Text>}
        </View>
      )}

      <Pressable style={s.btn} onPress={refrescar} disabled={cargando}>
        <Text style={s.btnText}>Actualizar</Text>
      </Pressable>

      <Text style={s.hint}>
        El listado de incidencias de todos los usuarios, con filtros y detalle, se mostrará aquí
        cuando el servidor tenga el endpoint de administración.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16 },
  sub: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 6, lineHeight: 20 },
  card: {
    marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 14,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  linea: { color: colors.text, marginTop: 4 },
  detalle: { color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  error: { color: colors.danger, paddingHorizontal: 16, marginTop: 12 },
  btn: {
    marginHorizontal: 16, marginTop: 16, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: colors.green, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: colors.green, fontWeight: '800' },
  hint: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 18, lineHeight: 18, fontSize: 13 },
});
