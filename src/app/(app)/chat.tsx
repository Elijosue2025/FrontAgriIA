import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { conversacionService, Conversacion } from '@/services/conversacionService';
import { AgroColors as colors, MaxContentWidth } from '@/constants/theme';

type Mensaje = {
  id: string;
  rol: 'user' | 'ia' | 'sistema';
  texto: string;
  error?: boolean;
};

const SUGERENCIAS = [
  '¿Cómo controlo las plagas en la quinua?',
  '¿Cuál es la mejor época de siembra de papa en Carchi?',
  '¿Cómo prevenir el tizón tardío?',
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ChatScreen() {
  const { usuarioId } = useAuth();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [conversacionId, setConversacionId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('Nueva consulta');
  const [enviando, setEnviando] = useState(false);

  const [historial, setHistorial] = useState<Conversacion[]>([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const listaRef = useRef<FlatList<Mensaje>>(null);

  const agregar = (m: Mensaje) => setMensajes((prev) => [...prev, m]);

  const enviar = async (preguntaDirecta?: string) => {
    const pregunta = (preguntaDirecta ?? texto).trim();
    if (!pregunta || enviando || !usuarioId) return;

    setTexto('');
    setEnviando(true);
    agregar({ id: uid(), rol: 'user', texto: pregunta });

    try {
      let id = conversacionId;

      // La conversación se crea con la primera pregunta
      if (id === null) {
        const nueva = await conversacionService.crear(usuarioId, pregunta.slice(0, 50));
        id = nueva.id;
        setConversacionId(id);
        setTitulo(nueva.titulo);
      }

      const r = await chatService.consultar(usuarioId, id, pregunta);
      if (!r.exito) throw new Error(r.errorMensaje || 'No se pudo obtener una respuesta');

      agregar({ id: uid(), rol: 'ia', texto: r.respuesta });
    } catch (e: any) {
      agregar({
        id: uid(), rol: 'ia', error: true,
        texto: e.message || 'Ocurrió un error al consultar',
      });
    } finally {
      setEnviando(false);
    }
  };

  const nuevaConversacion = () => {
    setMensajes([]);
    setConversacionId(null);
    setTitulo('Nueva consulta');
    setTexto('');
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

  const retomar = (c: Conversacion) => {
    setConversacionId(c.id);
    setTitulo(c.titulo);
    setMensajes([{
      id: uid(), rol: 'sistema',
      texto: 'Retomaste esta conversación. Los mensajes anteriores aún no se muestran, pero puedes seguir preguntando.',
    }]);
    setVerHistorial(false);
  };

  // Enter envía, Shift+Enter hace salto de línea (solo web)
  const onKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const puedeEnviar = texto.trim().length > 0 && !enviando;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Encabezado del chat */}
      <View style={s.header}>
        <Text style={s.headerTitle} numberOfLines={1}>{titulo}</Text>
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

      {/* Mensajes */}
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
              Consulta sobre cultivos, plagas, enfermedades y manejo agronómico.
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
              <View style={[s.burbuja, s.burbujaIa]}>
                <ActivityIndicator size="small" color={colors.green} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Entrada */}
      <View style={s.inputZona}>
        <View style={s.inputBox}>
          <TextInput
            style={[s.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            placeholder="Escribe tu consulta agronómica..."
            placeholderTextColor={colors.textSecondary}
            value={texto}
            onChangeText={setTexto}
            onKeyPress={onKeyPress}
            multiline
            blurOnSubmit={false}
            editable={!enviando}
          />
          <Pressable
            style={[s.enviarBtn, !puedeEnviar && s.enviarBtnOff]}
            onPress={() => enviar()}
            disabled={!puedeEnviar}
          >
            <FontAwesome5 name="paper-plane" size={15} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.aviso}>
          AgroGuía IA puede cometer errores. Ante decisiones críticas, consulta a un técnico agrónomo.
        </Text>
      </View>

      {/* Panel de historial */}
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
                  <Text style={s.panelItemTitulo} numberOfLines={1}>{item.titulo}</Text>
                  <Text style={s.panelItemFecha}>
                    {new Date(item.fechaActualizacion ?? item.fechaCreacion).toLocaleDateString()}
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
        <Text selectable style={[s.texto, esUsuario && { color: '#fff' }, m.error && { color: colors.danger }]}>
          {m.texto}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700', marginRight: 12 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  headerBtnPrimary: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  headerBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },

  lista: {
    flexGrow: 1, padding: 16, width: '100%',
    maxWidth: MaxContentWidth, alignSelf: 'center',
  },

  fila: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  filaUsuario: { justifyContent: 'flex-end' },
  filaIa: { justifyContent: 'flex-start' },
  avatarIa: {
    width: 30, height: 30, borderRadius: 15, marginRight: 8,
    backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  burbuja: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  burbujaUsuario: { backgroundColor: colors.greenDark, borderBottomRightRadius: 4 },
  burbujaIa: {
    backgroundColor: colors.bgCard, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  burbujaError: { borderColor: colors.danger },
  texto: { color: colors.text, fontSize: 15, lineHeight: 22 },
  sistema: {
    color: colors.textSecondary, fontSize: 12, textAlign: 'center',
    marginBottom: 14, paddingHorizontal: 20,
  },

  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  vacioLogo: {
    width: 64, height: 64, borderRadius: 32, marginBottom: 16,
    backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  vacioTitulo: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  vacioSub: { color: colors.textSecondary, marginTop: 6, textAlign: 'center', maxWidth: 380 },
  chips: { marginTop: 24, gap: 10, width: '100%', maxWidth: 460 },
  chip: {
    padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  chipText: { color: '#cbd5e1', fontSize: 14 },

  inputZona: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, width: '100%',
    maxWidth: MaxContentWidth, alignSelf: 'center',
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: colors.inputBg, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, padding: 8,
  },
  input: {
    flex: 1, color: colors.text, fontSize: 15, maxHeight: 120,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  enviarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
  },
  enviarBtnOff: { opacity: 0.4 },
  aviso: { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 8 },

  panel: {
    position: 'absolute', top: 58, right: 12, width: 300, maxHeight: 360, zIndex: 10,
    backgroundColor: colors.bgSidebar, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, paddingVertical: 8,
  },
  panelTitulo: {
    color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  panelVacio: { color: colors.textSecondary, padding: 14 },
  panelItem: { paddingHorizontal: 14, paddingVertical: 10 },
  panelItemActivo: { backgroundColor: 'rgba(34,197,94,0.15)' },
  panelItemTitulo: { color: colors.text, fontSize: 14 },
  panelItemFecha: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});