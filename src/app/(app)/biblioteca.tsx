import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { AgroColors as colors } from '@/constants/theme';
import {
  PACKS_DISPONIBLES,
  PackCultivo,
  listarDescargados,
  marcarDescargado,
  quitarDescargado,
} from '@/services/conocimientoService';

export default function BibliotecaScreen() {
  const [descargados, setDescargados] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listarDescargados().then(setDescargados);
    }, [])
  );

  const toggle = async (p: PackCultivo) => {
    setBusy(p.id);
    try {
      if (descargados.includes(p.id)) {
        await quitarDescargado(p.id);
      } else {
        // Aquí irá la descarga real del pack (zip/json del API).
        // Por ahora solo marcamos el pack como disponible offline en el dispositivo.
        await new Promise((r) => setTimeout(r, 600));
        await marcarDescargado(p.id);
      }
      setDescargados(await listarDescargados());
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Biblioteca técnica</Text>
      <Text style={s.sub}>
        Descarga conocimiento por cultivo para usar sin conexión (como “guardar para offline”).
      </Text>

      <FlatList
        data={PACKS_DISPONIBLES}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const ok = descargados.includes(item.id);
          return (
            <View style={s.card}>
              <View style={s.cardIcon}>
                <FontAwesome5 name="book" size={18} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.titulo}</Text>
                <Text style={s.cardDesc}>{item.descripcion}</Text>
                <Text style={s.cardMeta}>{item.tamanoAprox} · {item.cultivo}</Text>
              </View>
              <Pressable
                style={[s.dl, ok && s.dlOk]}
                onPress={() => toggle(item)}
                disabled={busy === item.id}
              >
                {busy === item.id ? (
                  <ActivityIndicator size="small" color={ok ? colors.green : '#fff'} />
                ) : (
                  <>
                    <FontAwesome5
                      name={ok ? 'check' : 'download'}
                      size={12}
                      color={ok ? colors.green : '#fff'}
                    />
                    <Text style={[s.dlText, ok && { color: colors.green }]}>
                      {ok ? 'En el teléfono' : 'Descargar'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16 },
  sub: { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 6, marginBottom: 8, lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  cardDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  cardMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  dl: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.green, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  dlOk: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: colors.green },
  dlText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});