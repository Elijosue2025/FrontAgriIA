import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  useWindowDimensions, Platform,
} from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { AgroColors as colors } from '@/constants/theme';

const PRINCIPAL = [
  { ruta: '/chat', icono: 'robot', titulo: 'Chat Agro IA' },
  { ruta: '/diagnostico', icono: 'leaf', titulo: 'Diagnóstico' },
  { ruta: '/cultivos', icono: 'seedling', titulo: 'Cultivos' },
  { ruta: '/plagas', icono: 'bug', titulo: 'Plagas' },
  { ruta: '/biblioteca', icono: 'book', titulo: 'Biblioteca Técnica' },
] as const;

const ANALISIS = [
  { icono: 'chart-line', titulo: 'Reportes' },
  { icono: 'cog', titulo: 'Configuración' },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const ir = (ruta: string) => {
    router.push(ruta as any);
    onNavigate?.();
  };

  return (
    <View style={s.sidebar}>
      <View style={s.logo}>
        <FontAwesome5 name="seedling" size={22} color={colors.green} style={{ marginRight: 10 }} />
        <Text style={s.logoText}>AgroGuía IA</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.menu}>
        <Text style={s.menuTitle}>Principal</Text>
        {PRINCIPAL.map((item) => {
          const activo = pathname === item.ruta;
          return (
            <Pressable
              key={item.ruta}
              onPress={() => ir(item.ruta)}
              style={({ pressed, hovered }: any) => [
                s.item, (pressed || hovered) && s.itemHover, activo && s.itemActivo,
              ]}
            >
              <FontAwesome5 name={item.icono} size={16}
                color={activo ? colors.green : '#cbd5e1'} style={{ width: 20 }} />
              <Text style={[s.itemText, activo && { color: colors.green }]}>{item.titulo}</Text>
            </Pressable>
          );
        })}

        <Text style={s.menuTitle}>Análisis</Text>
        {ANALISIS.map((item) => (
          <Pressable key={item.titulo} style={s.item}>
            <FontAwesome5 name={item.icono} size={16} color="#cbd5e1" style={{ width: 20 }} />
            <Text style={s.itemText}>{item.titulo}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <Pressable onPress={logout} style={s.item}>
          <FontAwesome5 name="sign-out-alt" size={16} color={colors.textSecondary} style={{ width: 20 }} />
          <Text style={[s.itemText, { color: colors.textSecondary }]}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Navbar({ wide, onMenu }: { wide: boolean; onMenu: () => void }) {
  const { nombreCompleto } = useAuth();
  const { width } = useWindowDimensions();

  const iniciales =
    nombreCompleto?.split(' ').filter(Boolean).slice(0, 2)
      .map((p) => p[0].toUpperCase()).join('') || 'U';

  return (
    <View style={[s.navbar, !wide && { paddingHorizontal: 14 }]}>
      <View style={s.navLeft}>
        {!wide && (
          <Pressable onPress={onMenu} style={s.menuBtn}>
            <FontAwesome5 name="bars" size={18} color={colors.text} />
          </Pressable>
        )}
        <View style={s.searchBox}>
          <TextInput
            placeholder="Buscar cultivos, enfermedades o documentos..."
            placeholderTextColor={colors.textSecondary}
            style={[s.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          />
        </View>
      </View>

      <View style={s.status}>
        {width >= 600 && (
          <View style={s.iaStatus}>
            <Text style={s.iaStatusText}>● IA Activa</Text>
          </View>
        )}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{iniciales}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [abierto, setAbierto] = useState(false);

  return (
    <View style={s.wrapper}>
      {wide && <Sidebar />}

      <View style={s.main}>
        <Navbar wide={wide} onMenu={() => setAbierto(true)} />
        <View style={s.content}>
          <View style={s.contentCard}>
            <Slot />
          </View>
        </View>
      </View>

      {!wide && abierto && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={s.backdrop} onPress={() => setAbierto(false)} />
          <View style={s.drawer}>
            <Sidebar onNavigate={() => setAbierto(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, flexDirection: 'row', backgroundColor: colors.bgMain },

  // SIDEBAR
  sidebar: {
    width: 260, backgroundColor: colors.bgSidebar,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  logo: {
    height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logoText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  menu: { padding: 20 },
  menuTitle: {
    color: '#64748b', fontSize: 12, textTransform: 'uppercase',
    marginTop: 20, marginBottom: 10,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, marginBottom: 8,
  },
  itemHover: { backgroundColor: '#102036' },
  itemActivo: { backgroundColor: 'rgba(34,197,94,0.15)' },
  itemText: { color: '#cbd5e1', fontSize: 15 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border },

  // MAIN
  main: { flex: 1 },
  navbar: {
    height: 70, backgroundColor: colors.bgSidebar,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 25,
  },
  navLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { padding: 8 },
  searchBox: {
    flex: 1, maxWidth: 450, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, borderRadius: 15,
    paddingHorizontal: 15, paddingVertical: 10,
  },
  searchInput: { color: colors.text, padding: 0 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 15, marginLeft: 12 },
  iaStatus: {
    backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 15,
    paddingVertical: 8, borderRadius: 20,
  },
  iaStatusText: { color: colors.green, fontSize: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },

  // CONTENT
  content: { flex: 1, padding: 15, backgroundColor: colors.bgMain },
  contentCard: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bgMain },

  // DRAWER (móvil)
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 260, flexDirection: 'row' },
});