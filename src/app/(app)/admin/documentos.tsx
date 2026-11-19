import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
  API_ACEPTA_METADATOS,
  LIMITE_PDF_BYTES,
  LIMITE_PDF_MB,
  ParametrosCarga,
  cargarUno,
  listarManuales,
  subirPdf,
} from '@/services/documentoService';

const MAX_BYTES = LIMITE_PDF_BYTES;

const CULTIVOS = ['Automático', 'Papa', 'Quinua', 'Maíz', 'Fréjol', 'Tomate', 'Haba', 'General', 'Otro'];
const TEMAS = [
  'Fertilización',
  'Sanidad Vegetal',
  'Bioinsumos',
  'Riego y Agua',
  'Siembra y Trasplante',
  'Semillas',
];
const TAMANOS: { id: string; label: string; max?: number }[] = [
  { id: 'srv', label: 'Servidor · 900', max: undefined },
  { id: '600', label: 'Corto · 600', max: 600 },
  { id: '1400', label: 'Largo · 1400', max: 1400 },
  { id: '2400', label: 'Muy largo · 2400', max: 2400 },
];

type Elegido = { uri: string; name: string; size?: number };

function mb(n?: number) {
  if (!n && n !== 0) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CargarManualesScreen() {
  const [cultivo, setCultivo] = useState('Automático');
  const [otroCultivo, setOtroCultivo] = useState('');
  const [tema, setTema] = useState('');
  const [tamanoId, setTamanoId] = useState('srv');
  const [soloGuardar, setSoloGuardar] = useState(false);
  const [elegidos, setElegidos] = useState<Elegido[]>([]);
  const [manuales, setManuales] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const refrescar = useCallback(async () => {
    try {
      const lista = await listarManuales();
      setManuales(lista.manuales);
    } catch (e: any) {
      setError(e.message || 'No se pudo listar la carpeta de manuales');
    }
  }, []);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const parametros = (guardar: boolean): ParametrosCarga => {
    const nombreCultivo =
      cultivo === 'Automático' ? '' : cultivo === 'Otro' ? otroCultivo.trim() : cultivo;
    const t = TAMANOS.find((x) => x.id === tamanoId);
    return {
      cultivo: nombreCultivo || undefined,
      tema: tema.trim() || undefined,
      maxChars: t?.max,
      soloGuardar: guardar,
    };
  };

  const elegir = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (picked.canceled || picked.assets.length === 0) return;
    setElegidos(picked.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size })));
    setAviso('');
  };

  const subir = async () => {
    const grandes = elegidos.filter((f) => (f.size ?? 0) > MAX_BYTES);
    if (grandes.length) {
      setError(`${grandes.map((f) => f.name).join(', ')} pasa de ${LIMITE_PDF_MB} MB.`);
      return;
    }
    setOcupado('subir');
    setError('');
    setAviso('');
    try {
      const hechos: string[] = [];
      for (let i = 0; i < elegidos.length; i++) {
        const file = elegidos[i];
        setAviso(
          soloGuardar
            ? `Guardando ${i + 1} de ${elegidos.length}: ${file.name}`
            : `Vectorizando ${i + 1} de ${elegidos.length}: ${file.name}. Ollama puede tardar varios minutos.`,
        );
        const r = await subirPdf(file.uri, file.name, parametros(soloGuardar));
        hechos.push(r.archivoGuardado || file.name);
      }
      setElegidos([]);
      setAviso(
        soloGuardar
          ? `Guardados en la carpeta, sin embeddings: ${hechos.join(', ')}. Pulsa Vectorizar cuando quieras indexarlos.`
          : `Listos en el RAG: ${hechos.join(', ')}`,
      );
      await refrescar();
    } catch (e: any) {
      setError(e.message || 'No se pudo subir el PDF');
    } finally {
      setOcupado(null);
    }
  };

  const vectorizar = async (nombre: string) => {
    setOcupado(nombre);
    setError('');
    setAviso(`Vectorizando ${nombre} con los parámetros de arriba…`);
    try {
      const r = await cargarUno(nombre, parametros(false));
      setAviso(r.mensaje || 'Manual cargado');
    } catch (e: any) {
      setError(e.message || 'No se pudo vectorizar ese manual');
      setAviso('');
    } finally {
      setOcupado(null);
    }
  };

  const bloqueado = ocupado !== null;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Documentos</Text>
      <Text style={s.sub}>
        Sube manuales en PDF (hasta {LIMITE_PDF_MB} MB cada uno) para que el asistente los use al responder.
      </Text>
      {!API_ACEPTA_METADATOS && (
        <Text style={s.hint}>
          Por ahora el servidor detecta el cultivo y el tema de cada fragmento por su cuenta y
          vectoriza el PDF al subirlo. Elegir cultivo, tema o tamaño de fragmento se habilitará
          cuando el servidor lo admita.
        </Text>
      )}

      {API_ACEPTA_METADATOS && (
        <>
      <Text style={s.label}>Cultivo</Text>
      <View style={s.chips}>
        {CULTIVOS.map((c) => (
          <Pressable key={c} onPress={() => setCultivo(c)} style={[s.chip, cultivo === c && s.chipOn]}>
            <Text style={[s.chipText, cultivo === c && s.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      {cultivo === 'Otro' && (
        <TextInput
          value={otroCultivo}
          onChangeText={setOtroCultivo}
          placeholder="Nombre del cultivo"
          placeholderTextColor={colors.textSecondary}
          style={s.input}
        />
      )}

      <Text style={s.label}>Tema</Text>
      <View style={s.chips}>
        {TEMAS.map((t) => {
          const on = tema === t;
          return (
            <Pressable key={t} onPress={() => setTema(on ? '' : t)} style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={tema}
        onChangeText={setTema}
        placeholder="Vacío = automático. O escribe, por ejemplo, tizón temprano"
        placeholderTextColor={colors.textSecondary}
        style={s.input}
      />
      <Text style={s.hint}>
        Si fijas cultivo o tema, todos los fragmentos salen con esa etiqueta. Vacío deja que cada fragmento se clasifique solo.
      </Text>

      <Text style={s.label}>Tamaño del fragmento</Text>
      <View style={s.chips}>
        {TAMANOS.map((t) => (
          <Pressable key={t.id} onPress={() => setTamanoId(t.id)} style={[s.chip, tamanoId === t.id && s.chipOn]}>
            <Text style={[s.chipText, tamanoId === t.id && s.chipTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>Qué hacer con el PDF</Text>
      <View style={s.modos}>
        <Pressable onPress={() => setSoloGuardar(false)} style={[s.modo, !soloGuardar && s.modoOn]}>
          <FontAwesome5 name="brain" size={14} color={!soloGuardar ? colors.green : '#cbd5e1'} />
          <Text style={[s.modoTitle, !soloGuardar && { color: colors.green }]}>Guardar y vectorizar</Text>
          <Text style={s.modoSub}>Entra al chat. Ollama tiene que estar encendido y puede tardar.</Text>
        </Pressable>
        <Pressable onPress={() => setSoloGuardar(true)} style={[s.modo, soloGuardar && s.modoOn]}>
          <FontAwesome5 name="folder-open" size={14} color={soloGuardar ? colors.green : '#cbd5e1'} />
          <Text style={[s.modoTitle, soloGuardar && { color: colors.green }]}>Solo guardar</Text>
          <Text style={s.modoSub}>Igual que dejarlo en la carpeta. Sin embeddings, para PDFs grandes.</Text>
        </Pressable>
      </View>

        </>
      )}

      <Pressable style={[s.secundario, bloqueado && s.off]} onPress={elegir} disabled={bloqueado}>
        <FontAwesome5 name="file-pdf" size={15} color={colors.green} />
        <Text style={s.secundarioText}>Elegir PDF</Text>
      </Pressable>

      {elegidos.map((f) => (
        <Text key={f.uri} style={s.archivo}>
          {f.name}{f.size ? ` · ${mb(f.size)}` : ''}
          {(f.size ?? 0) > MAX_BYTES ? ` · pasa de ${LIMITE_PDF_MB} MB` : ''}
        </Text>
      ))}

      <Pressable
        style={[s.subir, (bloqueado || elegidos.length === 0) && s.off]}
        onPress={subir}
        disabled={bloqueado || elegidos.length === 0}
      >
        {ocupado === 'subir' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <FontAwesome5 name="file-upload" size={15} color="#fff" />
        )}
        <Text style={s.subirText}>
          {elegidos.length === 0 ? 'Elige un PDF' : soloGuardar ? 'Guardar en la carpeta' : 'Subir y vectorizar'}
        </Text>
      </Pressable>

      {!!aviso && <Text style={s.aviso}>{aviso}</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}

      <Text style={[s.label, { marginTop: 22 }]}>Ya en la carpeta ({manuales.length})</Text>
      <Text style={s.hint}>Vectorizar usa el cultivo, el tema y el tamaño elegidos arriba.</Text>
      {manuales.length === 0 ? (
        <Text style={s.hint}>No hay PDF, o la API no responde.</Text>
      ) : (
        manuales.map((nombre) => (
          <View key={nombre} style={s.card}>
            <FontAwesome5 name="file-pdf" size={16} color={colors.green} />
            <Text style={s.cardTitle} numberOfLines={2}>{nombre}</Text>
            <Pressable style={s.dl} onPress={() => vectorizar(nombre)} disabled={bloqueado}>
              {ocupado === nombre ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.dlText}>Vectorizar</Text>
              )}
            </Pressable>
          </View>
        ))
      )}

      {Platform.OS === 'web' ? null : (
        <Text style={s.hint}>En el teléfono la API tiene que ser la IP de tu PC, no localhost.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16 },
  sub: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 6, lineHeight: 20 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  hint: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 6, lineHeight: 18, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  chipOn: { borderColor: colors.green, backgroundColor: 'rgba(34,197,94,0.15)' },
  chipText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: colors.green },
  input: {
    marginHorizontal: 16, marginTop: 10, color: colors.text,
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  modos: { paddingHorizontal: 16, gap: 8 },
  modo: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
    borderRadius: 14, padding: 12, gap: 4,
  },
  modoOn: { borderColor: colors.green, backgroundColor: 'rgba(34,197,94,0.08)' },
  modoTitle: { color: '#cbd5e1', fontWeight: '700', marginTop: 4 },
  modoSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  secundario: {
    marginHorizontal: 16, marginTop: 16, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: colors.green, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secundarioText: { color: colors.green, fontWeight: '800' },
  archivo: { color: colors.text, paddingHorizontal: 16, marginTop: 8 },
  subir: {
    marginHorizontal: 16, marginTop: 12, height: 48, borderRadius: 12,
    backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  subirText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  off: { opacity: 0.55 },
  aviso: { color: colors.text, paddingHorizontal: 16, marginTop: 12, lineHeight: 20 },
  error: { color: '#f87171', paddingHorizontal: 16, marginTop: 8, lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    marginHorizontal: 16, marginTop: 10, backgroundColor: colors.bgCard,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14, flex: 1 },
  dl: {
    backgroundColor: colors.green, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, minWidth: 88, alignItems: 'center',
  },
  dlText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
