import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AgroColors as colors } from '@/constants/theme';
import {
  PACKS_DISPONIBLES,
  PackCultivo,
  listarDescargados,
  marcarDescargado,
  quitarDescargado,
} from '@/services/conocimientoService';
import { cargarTodos, cargarUno, listarManuales, subirPdf } from '@/services/documentoService';

export default function BibliotecaScreen() {
  const [descargados, setDescargados] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [manuales, setManuales] = useState<string[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const refrescar = useCallback(async () => {
    setCargandoLista(true);
    setError('');
    try {
      const [packs, lista] = await Promise.all([
        listarDescargados(),
        listarManuales().catch((e: Error) => {
          setError(e.message || 'No se pudo listar los manuales');
          return { manuales: [] as string[], total: 0 };
        }),
      ]);
      setDescargados(packs);
      setManuales(lista.manuales);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refrescar();
    }, [refrescar])
  );

  const toggle = async (p: PackCultivo) => {
    setBusy(p.id);
    try {
      if (descargados.includes(p.id)) await quitarDescargado(p.id);
      else {
        await new Promise((r) => setTimeout(r, 400));
        await marcarDescargado(p.id);
      }
      setDescargados(await listarDescargados());
    } finally {
      setBusy(null);
    }
  };

  const elegirYSubir = async () => {
    setError('');
    setAviso('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    setSubiendo(true);
    try {
      const guardados: string[] = [];
      for (let i = 0; i < picked.assets.length; i++) {
        const file = picked.assets[i];
        setAviso(`Vectorizando ${i + 1} de ${picked.assets.length}: ${file.name}. Puede tardar varios minutos.`);
        const r = await subirPdf(file.uri, file.name);
        guardados.push(r.archivoGuardado || file.name);
      }
      setAviso(`Listo. ${guardados.join(', ')}`);
      await refrescar();
    } catch (e: any) {
      setError(e.message || 'No se pudo subir el PDF');
      setAviso('');
    } finally {
      setSubiendo(false);
    }
  };

  const reindexar = async (nombre: string) => {
    setBusy(nombre);
    setError('');
    setAviso(`Cargando ${nombre} al RAG…`);
    try {
      const r = await cargarUno(nombre);
      setAviso(r.mensaje || 'Manual cargado');
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar ese manual');
      setAviso('');
    } finally {
      setBusy(null);
    }
  };

  const reindexarTodos = async () => {
    setBusy('__todos');
    setError('');
    setAviso('Cargando todos los PDF de la carpeta. Puede tardar.');
    try {
      const r = await cargarTodos();
      setAviso(`${r.mensaje}. Procesados: ${r.documentosProcesados ?? 0}`);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar los manuales');
      setAviso('');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={s.title}>Biblioteca técnica</Text>
      <Text style={s.sub}>
        Sube un PDF. La API lo guarda en la carpeta de manuales y lo vectoriza con nomic-embed-text.
      </Text>

      <Pressable style={[s.subir, subiendo && { opacity: 0.7 }]} onPress={elegirYSubir} disabled={subiendo}>
        {subiendo ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <FontAwesome5 name="file-upload" size={16} color="#fff" />
        )}
        <Text style={s.subirText}>{subiendo ? 'Subiendo…' : 'Subir PDF'}</Text>
      </Pressable>

      {!!aviso && <Text style={s.aviso}>{aviso}</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}

      <View style={s.rowTitle}>
        <Text style={s.section}>En el servidor ({manuales.length})</Text>
        <Pressable onPress={reindexarTodos} disabled={busy === '__todos' || subiendo}>
          <Text style={s.link}>Cargar todos</Text>
        </Pressable>
      </View>

      {cargandoLista ? (
        <ActivityIndicator color={colors.green} style={{ marginVertical: 16 }} />
      ) : manuales.length === 0 ? (
        <Text style={s.vacio}>No hay PDF en la carpeta de manuales, o la API no responde.</Text>
      ) : (
        manuales.map((nombre) => (
          <View key={nombre} style={s.card}>
            <FontAwesome5 name="file-pdf" size={18} color={colors.green} />
            <Text style={s.cardTitle} numberOfLines={2}>{nombre}</Text>
            <Pressable
              style={s.dl}
              onPress={() => reindexar(nombre)}
              disabled={busy === nombre || subiendo}
            >
              {busy === nombre ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.dlText}>Al RAG</Text>
              )}
            </Pressable>
          </View>
        ))
      )}

      <Text style={[s.section, { marginTop: 22 }]}>Packs en el teléfono</Text>
      <Text style={s.sub}>Marca local. Todavía no descarga el manual para usarlo sin internet.</Text>
      {PACKS_DISPONIBLES.map((item) => {
        const ok = descargados.includes(item.id);
        return (
          <View key={item.id} style={s.card}>
            <View style={s.cardIcon}>
              <FontAwesome5 name="book" size={16} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.titulo}</Text>
              <Text style={s.cardDesc}>{item.descripcion}</Text>
            </View>
            <Pressable style={[s.dl, ok && s.dlOk]} onPress={() => toggle(item)} disabled={busy === item.id}>
              {busy === item.id ? (
                <ActivityIndicator size="small" color={ok ? colors.green : '#fff'} />
              ) : (
                <Text style={[s.dlText, ok && { color: colors.green }]}>
                  {ok ? 'En el teléfono' : 'Marcar'}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}

      {Platform.OS === 'web' ? null : (
        <Text style={s.vacio}>
          En el teléfono la API tiene que ser la IP de tu PC, no localhost.
        </Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16 },
  sub: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 6, marginBottom: 8, lineHeight: 20 },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', paddingHorizontal: 16 },
  rowTitle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingRight: 16, marginTop: 18,
  },
  link: { color: colors.green, fontWeight: '700' },
  subir: {
    marginHorizontal: 16, marginTop: 8, height: 48, borderRadius: 12,
    backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  subirText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  aviso: { color: colors.text, paddingHorizontal: 16, marginTop: 10, lineHeight: 20 },
  error: { color: '#f87171', paddingHorizontal: 16, marginTop: 8 },
  vacio: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 16, marginTop: 10,
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14, flex: 1 },
  cardDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  dl: {
    backgroundColor: colors.green, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    minWidth: 72, alignItems: 'center',
  },
  dlOk: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: colors.green },
  dlText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
