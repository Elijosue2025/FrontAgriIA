import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { chatService, ModoModelo } from '@/services/chatService';
import { conversacionService, Conversacion } from '@/services/conversacionService';
import { analizarImagen, textoParaChat } from '@/services/diagnosticoService';
import { AgroColors as colors } from '@/constants/theme';

type Mensaje = {
  id: string;
  rol: 'user' | 'ia' | 'sistema';
  texto: string;
  imagenUri?: string;
  error?: boolean;
  tiempoMs?: number;
  modo?: ModoModelo;
};

const SUGERENCIAS = [
  '¿Cómo controlo las plagas en la quinua?',
  '¿Cuál es la mejor época de siembra de papa en Carchi?',
  '¿Cómo prevenir el tizón tardío?',
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function fechaCorta(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function formatTiempo(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function ChatScreen() {
  const { usuarioId } = useAuth();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cultivo, setCultivo] = useState('papa');
  const [conversacionId, setConversacionId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('Nueva consulta');
  const [enviando, setEnviando] = useState(false);
  const [fase, setFase] = useState<'idle' | 'imagen' | 'texto'>('idle');
  const [modo, setModo] = useState<ModoModelo>('preciso');

  const [historial, setHistorial] = useState<Conversacion[]>([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const listaRef = useRef<FlatList<Mensaje>>(null);

  const agregar = (m: Mensaje) => setMensajes((prev) => [...prev, m]);

  const pedirPermiso = async (camara: boolean) => {
    if (camara) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const adjuntarCamara = async () => {
    if (!(await pedirPermiso(true))) {
      Alert.alert('Permiso', 'Necesitamos acceso a la cámara.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!r.canceled && r.assets[0]) setFotoUri(r.assets[0].uri);
  };

  const adjuntarGaleria = async () => {
    if (!(await pedirPermiso(false))) {
      Alert.alert('Permiso', 'Necesitamos acceso a la galería.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!r.canceled && r.assets[0]) setFotoUri(r.assets[0].uri);
  };

  const elegirFuenteFoto = () => {
    if (Platform.OS === 'web') {
      adjuntarGaleria();
      return;
    }
    Alert.alert('Adjuntar foto', 'Elige una fuente', [
      { text: 'Cámara', onPress: adjuntarCamara },
      { text: 'Galería', onPress: adjuntarGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const enviar = async (preguntaDirecta?: string) => {
    const pregunta = (preguntaDirecta ?? texto).trim();
    const foto = fotoUri;
    if ((!pregunta && !foto) || enviando || !usuarioId) return;

    setTexto('');
    setFotoUri(null);
    setEnviando(true);
    setFase(foto ? 'imagen' : 'texto');

    const textoUsuario =
      pregunta ||
      (foto ? '¿Qué tiene esta planta y cómo la trato según los manuales?' : '');

    agregar({
      id: uid(),
      rol: 'user',
      texto: textoUsuario,
      imagenUri: foto ?? undefined,
    });

    const t0 = Date.now();

    try {
      let id = conversacionId;

      if (id === null) {
        const tituloNuevo = foto
          ? `Foto · ${(cultivo || 'cultivo').slice(0, 20)}`
          : pregunta.slice(0, 50);
        const nueva = await conversacionService.crear(usuarioId, tituloNuevo);
        id = nueva.id;
        setConversacionId(id);
        setTitulo(nueva.titulo);
      }

      if (foto) {
        setFase('imagen');
        const vision = await analizarImagen(foto, cultivo || 'papa', {
          conversacionId: id,
        });

        if (!vision.exito) {
          throw new Error(vision.errorMensaje || 'Error al analizar la imagen');
        }

        const tiempoMs = Date.now() - t0;
        agregar({
          id: uid(),
          rol: 'ia',
          texto: textoParaChat(vision),
          tiempoMs,
          modo,
        });
      } else {
        setFase('texto');
        const r = await chatService.consultar(usuarioId, id, pregunta, modo);
        const tiempoMs = Date.now() - t0;

        if (!r.exito) throw new Error(r.errorMensaje || 'No se pudo obtener una respuesta');

        agregar({
          id: uid(),
          rol: 'ia',
          texto: r.respuesta,
          tiempoMs,
          modo,
        });
      }
    } catch (e: any) {
      const tiempoMs = Date.now() - t0;
      agregar({
        id: uid(),
        rol: 'ia',
        error: true,
        texto: e.message || 'Ocurrió un error al consultar',
        tiempoMs,
        modo,
      });
    } finally {
      setEnviando(false);
      setFase('idle');
    }
  };

  const nuevaConversacion = () => {
    setMensajes([]);
    setConversacionId(null);
    setTitulo('Nueva consulta');
    setTexto('');
    setFotoUri(null);
    setVerHistorial(false);
  };

  const abrirHistorial = async () => {
    const abrir = !verHistorial;
    setVerHistorial(abrir);
    if (abrir && usuarioId) {
      setCargandoHistorial(true);
      try {
        setHistorial(await conversacionService.listar(usuarioId));
      } catch {
        setHistorial([]);
      } finally {
        setCargandoHistorial(false);
      }
    }
  };

  const retomar = async (c: Conversacion) => {
    setVerHistorial(false);
    setConversacionId(c.id);
    setTitulo(c.titulo);
    setFotoUri(null);
    setEnviando(true);
    try {
      const det = await conversacionService.obtener(c.id);
      const msgs = det.mensajes?.length
        ? det.mensajes
        : await conversacionService.mensajes(c.id);

      setMensajes(
        msgs.map((m) => ({
          id: String(m.id),
          rol: m.rol?.toLowerCase() === 'user' ? 'user' : 'ia',
          texto: m.contenido,
        }))
      );
    } catch {
      setMensajes([
        {
          id: uid(),
          rol: 'sistema',
          texto: 'No se pudieron cargar los mensajes anteriores. Puedes seguir preguntando en este hilo.',
        },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const onKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const puedeEnviar = (texto.trim().length > 0 || !!fotoUri) && !enviando;

  const textoPensando =
    fase === 'imagen'
      ? 'Analizando imagen y consultando manuales…'
      : `Pensando (${modo === 'rapido' ? 'Rápido' : 'Preciso'})…`;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <Text style={s.headerTitle} numberOfLines={1}>
          {titulo}
        </Text>
        <View style={s.headerBtns}>
          <Pressable style={s.headerBtn} onPress={abrirHistorial}>
            <FontAwesome5 name="history" size={13} color={colors.textSecondary} />
            <Text style={s.headerBtnText}>Historial</Text>
          </Pressable>
          <Pressable style={[s.headerBtn, s.headerBtnPrimary]} onPress={nuevaConversacion}>
            <FontAwesome5 name="plus" size={13} color="#fff" />
            <Text style={[s.headerBtnText, { color: '#fff' }]}>Nueva</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.modos}>
        <Pressable
          style={[s.modoChip, modo === 'rapido' && s.modoChipOn]}
          onPress={() => setModo('rapido')}
        >
          <FontAwesome5
            name="bolt"
            size={11}
            color={modo === 'rapido' ? colors.green : colors.textSecondary}
          />
          <Text style={[s.modoText, modo === 'rapido' && s.modoTextOn]}>Rápido · 3B</Text>
        </Pressable>
        <Pressable
          style={[s.modoChip, modo === 'preciso' && s.modoChipOn]}
          onPress={() => setModo('preciso')}
        >
          <FontAwesome5
            name="brain"
            size={11}
            color={modo === 'preciso' ? colors.green : colors.textSecondary}
          />
          <Text style={[s.modoText, modo === 'preciso' && s.modoTextOn]}>Preciso · 7B</Text>
        </Pressable>
        <Pressable
          style={[s.modoChip, cultivo === 'papa' && s.modoChipOn]}
          onPress={() => setCultivo('papa')}
        >
          <Text style={[s.modoText, cultivo === 'papa' && s.modoTextOn]}>Papa</Text>
        </Pressable>
        <Pressable
          style={[s.modoChip, cultivo === 'quinua' && s.modoChipOn]}
          onPress={() => setCultivo('quinua')}
        >
          <Text style={[s.modoText, cultivo === 'quinua' && s.modoTextOn]}>Quinua</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listaRef}
        data={mensajes}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Burbuja m={item} />}
        contentContainerStyle={s.lista}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={s.vacio}>
            <View style={s.vacioLogo}>
              <FontAwesome5 name="seedling" size={28} color={colors.green} />
            </View>
            <Text style={s.vacioTitulo}>¿En qué puedo ayudarte hoy?</Text>
            <Text style={s.vacioSub}>
              Escribe una consulta o adjunta una foto de la planta para analizarla en este mismo chat.
            </Text>
            <View style={s.chips}>
              {SUGERENCIAS.map((q) => (
                <Pressable key={q} style={s.chip} onPress={() => enviar(q)}>
                  <Text style={s.chipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={
          enviando ? (
            <View style={[s.fila, s.filaIa]}>
              <View style={s.avatarIa}>
                <FontAwesome5 name="robot" size={14} color={colors.green} />
              </View>
              <View style={[s.burbuja, s.burbujaIa, s.pensando]}>
                <ActivityIndicator size="small" color={colors.green} />
                <Text style={s.pensandoText}>{textoPensando}</Text>
              </View>
            </View>
          ) : null
        }
      />

      {fotoUri ? (
        <View style={s.previewBar}>
          <Image source={{ uri: fotoUri }} style={s.previewThumb} />
          <Text style={s.previewLabel} numberOfLines={1}>
            Foto lista · cultivo: {cultivo}
          </Text>
          <Pressable onPress={() => setFotoUri(null)} hitSlop={12}>
            <FontAwesome5 name="times-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <View style={s.inputZona}>
        <View style={s.inputBox}>
          <TextInput
            style={[s.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            placeholder="Consulta o adjunta una foto..."
            placeholderTextColor={colors.textSecondary}
            value={texto}
            onChangeText={setTexto}
            onKeyPress={onKeyPress}
            multiline
            blurOnSubmit={false}
            editable={!enviando}
          />
          <Pressable style={s.camBtn} onPress={elegirFuenteFoto} disabled={enviando}>
            <FontAwesome5 name="camera" size={16} color={colors.green} />
          </Pressable>
          <Pressable
            style={[s.enviarBtn, !puedeEnviar && s.enviarBtnOff]}
            onPress={() => enviar()}
            disabled={!puedeEnviar}
          >
            <FontAwesome5 name="paper-plane" size={15} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.aviso}>
          AgroGuía IA puede cometer errores. El análisis por foto es orientativo; consulta a un técnico
          ante decisiones críticas.
        </Text>
      </View>

      {verHistorial && (
        <View style={s.panel}>
          <Text style={s.panelTitulo}>Conversaciones</Text>
          {cargandoHistorial ? (
            <ActivityIndicator color={colors.green} style={{ margin: 16 }} />
          ) : historial.length === 0 ? (
            <Text style={s.panelVacio}>Aún no tienes conversaciones</Text>
          ) : (
            <FlatList
              data={historial}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.panelItem, item.id === conversacionId && s.panelItemActivo]}
                  onPress={() => retomar(item)}
                >
                  <Text style={s.panelItemTitulo} numberOfLines={1}>
                    {item.titulo}
                  </Text>
                  <Text style={s.panelItemFecha}>
                    {fechaCorta(item.fechaActualizacion ?? item.fechaCreacion)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Burbuja({ m }: { m: Mensaje }) {
  if (m.rol === 'sistema') return <Text style={s.sistema}>{m.texto}</Text>;

  const esUsuario = m.rol === 'user';
  return (
    <View style={[s.fila, esUsuario ? s.filaUsuario : s.filaIa]}>
      {!esUsuario && (
        <View style={s.avatarIa}>
          <FontAwesome5 name="robot" size={14} color={colors.green} />
        </View>
      )}
      <View
        style={[
          s.burbuja,
          esUsuario ? s.burbujaUsuario : s.burbujaIa,
          m.error && s.burbujaError,
        ]}
      >
        {m.imagenUri ? (
          <Image source={{ uri: m.imagenUri }} style={s.burbujaImg} resizeMode="cover" />
        ) : null}
        <Text
          selectable
          style={[s.texto, esUsuario && { color: '#fff' }, m.error && { color: colors.danger }]}
        >
          {m.texto}
        </Text>
        {!esUsuario && m.tiempoMs != null && (
          <Text style={s.meta}>
            {formatTiempo(m.tiempoMs)}
            {m.modo === 'rapido' ? ' · Rápido' : m.modo === 'preciso' ? ' · Preciso' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  headerBtnPrimary: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  headerBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  modos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  modoChipOn: { borderColor: colors.green, backgroundColor: 'rgba(34,197,94,0.12)' },
  modoText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  modoTextOn: { color: colors.green },
  lista: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  vacio: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 12 },
  vacioLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  vacioTitulo: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  vacioSub: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  chips: { gap: 8, width: '100%' },
  chip: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  fila: { flexDirection: 'row', marginBottom: 12, maxWidth: '100%' },
  filaUsuario: { justifyContent: 'flex-end' },
  filaIa: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  avatarIa: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  burbuja: { maxWidth: '82%', borderRadius: 16, padding: 12 },
  burbujaUsuario: { backgroundColor: colors.greenDark, borderBottomRightRadius: 4 },
  burbujaIa: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  burbujaError: { borderColor: colors.danger },
  burbujaImg: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.bgMain,
  },
  texto: { color: colors.text, fontSize: 15, lineHeight: 22 },
  meta: { color: colors.textSecondary, fontSize: 11, marginTop: 8 },
  sistema: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 13,
  },
  pensando: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pensandoText: { color: colors.textSecondary, fontSize: 13 },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSidebar,
  },
  previewThumb: { width: 44, height: 44, borderRadius: 8 },
  previewLabel: { flex: 1, color: colors.textSecondary, fontSize: 13 },
  inputZona: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  camBtn: { padding: 10 },
  enviarBtn: {
    backgroundColor: colors.green,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarBtnOff: { opacity: 0.4 },
  aviso: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  panel: {
    position: 'absolute',
    top: 56,
    right: 12,
    width: 280,
    maxHeight: 360,
    backgroundColor: colors.bgSidebar,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    zIndex: 20,
  },
  panelTitulo: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  panelVacio: { color: colors.textSecondary, padding: 12 },
  
 
    panelItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  panelItemActivo: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  panelItemTitulo: {
    color: colors.text,
    fontSize: 14,
  },
  panelItemFecha: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});