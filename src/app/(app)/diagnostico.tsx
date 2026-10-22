import { useState } from 'react';
import {
  View, Text, Image, Pressable, StyleSheet, ActivityIndicator,
  TextInput, Platform, ScrollView, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { AgroColors as colors } from '@/constants/theme';
import { analizarImagen, DiagnosticoResultado } from '@/services/diagnosticoService';

export default function DiagnosticoScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [cultivo, setCultivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);
  const [error, setError] = useState('');

  const pedirPermisos = async (camara: boolean) => {
    if (camara) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const tomarFoto = async () => {
    if (!(await pedirPermisos(true))) {
      Alert.alert('Permiso', 'Necesitamos acceso a la cámara.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!r.canceled && r.assets[0]) {
      setUri(r.assets[0].uri);
      setResultado(null);
      setError('');
    }
  };

  const elegirGaleria = async () => {
    if (!(await pedirPermisos(false))) {
      Alert.alert('Permiso', 'Necesitamos acceso a la galería.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!r.canceled && r.assets[0]) {
      setUri(r.assets[0].uri);
      setResultado(null);
      setError('');
    }
  };

  const analizar = async () => {
    if (!uri) return;
    setCargando(true);
    setError('');
    setResultado(null);
    try {
      const r = await analizarImagen(uri, cultivo || undefined);
      setResultado(r);
    } catch (e: any) {
      setError(e.message || 'No se pudo analizar la imagen');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Diagnóstico por imagen</Text>
      <Text style={s.sub}>
        Toma o sube una foto de la hoja/planta. La IA identificará la plaga o enfermedad (modelo en entrenamiento).
      </Text>

      <View style={s.acciones}>
        <Pressable style={s.btn} onPress={tomarFoto}>
          <FontAwesome5 name="camera" size={16} color="#fff" />
          <Text style={s.btnText}>Cámara</Text>
        </Pressable>
        <Pressable style={[s.btn, s.btnSec]} onPress={elegirGaleria}>
          <FontAwesome5 name="image" size={16} color={colors.green} />
          <Text style={[s.btnText, { color: colors.green }]}>Galería</Text>
        </Pressable>
      </View>

      {uri && (
        <Image source={{ uri }} style={s.preview} resizeMode="cover" />
      )}

      <Text style={s.label}>Cultivo (opcional)</Text>
      <TextInput
        style={s.input}
        placeholder="ej. papa, quinua"
        placeholderTextColor={colors.textSecondary}
        value={cultivo}
        onChangeText={setCultivo}
      />

      <Pressable
        style={[s.btnAnalizar, (!uri || cargando) && { opacity: 0.5 }]}
        onPress={analizar}
        disabled={!uri || cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <FontAwesome5 name="search" size={14} color="#fff" />
            <Text style={s.btnText}>Analizar</Text>
          </>
        )}
      </Pressable>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {resultado && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Resultado</Text>
          <Text style={s.cardLine}>
            Clase: <Text style={s.strong}>{resultado.clase ?? '—'}</Text>
          </Text>
          {resultado.confianza != null && (
            <Text style={s.cardLine}>
              Confianza: {(resultado.confianza * 100).toFixed(1)}%
            </Text>
          )}
          {resultado.manejoSugerido ? (
            <Text style={s.cardBody}>{resultado.manejoSugerido}</Text>
          ) : null}
          {resultado.mensaje ? (
            <Text style={s.cardBody}>{resultado.mensaje}</Text>
          ) : null}
        </View>
      )}

      {Platform.OS === 'web' && (
        <Text style={s.hint}>En web usa “Galería” / elegir archivo. Cámara depende del navegador.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.textSecondary, marginTop: 8, marginBottom: 20, lineHeight: 20 },
  acciones: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: {
    flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.green, paddingVertical: 14, borderRadius: 12,
  },
  btnSec: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.green },
  btnText: { color: '#fff', fontWeight: '700' },
  preview: { width: '100%', height: 240, borderRadius: 16, marginBottom: 16, backgroundColor: colors.bgCard },
  label: { color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, color: colors.text, marginBottom: 16,
  },
  btnAnalizar: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.greenDark, paddingVertical: 14, borderRadius: 12,
  },
  error: { color: colors.danger, marginTop: 12 },
  card: {
    marginTop: 20, padding: 16, borderRadius: 14,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.green, fontWeight: '800', marginBottom: 8 },
  cardLine: { color: colors.text, marginBottom: 4 },
  strong: { fontWeight: '700' },
  cardBody: { color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 16 },
});