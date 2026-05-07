import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { fetchPreferences, updatePreferences, subscribeToTable, UserPreferences } from '../../lib/sync';
import { supabase } from '../../lib/supabase';

const PALETTES = [
  { id: 'flowade', label: 'FlowADE', color: '#00d4ff' },
  { id: 'aurora', label: 'Aurora', color: '#7c6aff' },
  { id: 'ember', label: 'Ember', color: '#f97316' },
  { id: 'abyss', label: 'Abyss', color: '#0ea5e9' },
  { id: 'nord', label: 'Nord', color: '#88c0d0' },
  { id: 'dracula', label: 'Dracula', color: '#bd93f9' },
  { id: 'tokyo', label: 'Tokyo Night', color: '#7aa2f7' },
  { id: 'synthwave', label: 'Synthwave', color: '#f72585' },
  { id: 'catppuccin', label: 'Catppuccin', color: '#cba6f7' },
  { id: 'rosepine', label: 'Rosé Pine', color: '#ebbcba' },
  { id: 'gruvbox', label: 'Gruvbox', color: '#fabd2f' },
  { id: 'onedark', label: 'One Dark', color: '#61afef' },
];

const DEFAULT_PREFS: UserPreferences = {
  theme: 'dark',
  palette: 'flowade',
  font_size: 14,
  default_shell: 'bash',
  notify_builds: true,
  notify_tests: true,
  notify_deploys: true,
  notify_crashes: true,
};

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const load = useCallback(async () => {
    const p = await fetchPreferences();
    if (p) {
      setPrefs(p);
      setSynced(true);
    }
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data?.user?.email || null);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = subscribeToTable('user_preferences', () => load());
    return unsub;
  }, [load]);

  const update = useCallback(async (key: keyof UserPreferences, value: any) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await updatePreferences({ [key]: value });
  }, [prefs]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Sign out of FlowADE?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          if (supabase) await supabase.auth.signOut();
        },
      },
    ]);
  }, []);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Account */}
      <Text style={s.sectionTitle}>ACCOUNT</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.avatarCircle}>
            <Ionicons name="person" size={20} color={colors.accent.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{userEmail || 'Not signed in'}</Text>
            <Text style={s.sublabel}>
              {synced ? 'Preferences synced' : 'Local only'}
            </Text>
          </View>
        </View>
      </View>

      {/* Theme Palette */}
      <Text style={s.sectionTitle}>THEME PALETTE</Text>
      <View style={s.card}>
        <Text style={s.cardHint}>Changes sync to your desktop app</Text>
        <View style={s.paletteGrid}>
          {PALETTES.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.paletteItem, prefs.palette === p.id && s.paletteItemActive]}
              onPress={() => update('palette', p.id)}
            >
              <View style={[s.paletteCircle, { backgroundColor: p.color }]} />
              <Text style={[s.paletteLabel, prefs.palette === p.id && { color: p.color }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <Text style={s.sectionTitle}>NOTIFICATIONS</Text>
      <View style={s.card}>
        {([
          { key: 'notify_builds' as const, label: 'Build Events', icon: 'hammer-outline' },
          { key: 'notify_tests' as const, label: 'Test Results', icon: 'flask-outline' },
          { key: 'notify_deploys' as const, label: 'Deployments', icon: 'rocket-outline' },
          { key: 'notify_crashes' as const, label: 'Crashes & Errors', icon: 'warning-outline' },
        ]).map((item, i, arr) => (
          <View key={item.key} style={[s.settingRow, i < arr.length - 1 && s.settingRowBorder]}>
            <Ionicons name={item.icon as any} size={18} color={colors.text.muted} />
            <Text style={s.settingLabel}>{item.label}</Text>
            <Switch
              value={prefs[item.key]}
              onValueChange={v => update(item.key, v)}
              trackColor={{ false: colors.bg.raised, true: colors.accent.primary + '40' }}
              thumbColor={prefs[item.key] ? colors.accent.primary : colors.text.dim}
            />
          </View>
        ))}
      </View>

      {/* Editor */}
      <Text style={s.sectionTitle}>EDITOR</Text>
      <View style={s.card}>
        <View style={s.settingRow}>
          <Ionicons name="text-outline" size={18} color={colors.text.muted} />
          <Text style={s.settingLabel}>Font Size</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              style={s.stepperBtn}
              onPress={() => prefs.font_size > 10 && update('font_size', prefs.font_size - 1)}
            >
              <Ionicons name="remove" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={s.stepperValue}>{prefs.font_size}</Text>
            <TouchableOpacity
              style={s.stepperBtn}
              onPress={() => prefs.font_size < 24 && update('font_size', prefs.font_size + 1)}
            >
              <Ionicons name="add" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      {userEmail && (
        <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.accent.red} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

      <Text style={s.version}>FlowADE Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    color: colors.text.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    marginTop: 20, marginBottom: 8, paddingLeft: 2,
  },
  card: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  cardHint: {
    color: colors.text.dim, fontSize: 10, marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  sublabel: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  paletteGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  paletteItem: {
    width: '30%', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: colors.bg.raised,
  },
  paletteItemActive: {
    borderWidth: 1, borderColor: colors.accent.primary + '40',
  },
  paletteCircle: { width: 12, height: 12, borderRadius: 6 },
  paletteLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '600', flexShrink: 1 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
  },
  settingRowBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  settingLabel: { color: colors.text.primary, fontSize: 13, fontWeight: '500', flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: colors.bg.raised,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { color: colors.text.primary, fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24, paddingVertical: 14, borderRadius: 10,
    backgroundColor: colors.accent.red + '10', borderWidth: 1, borderColor: colors.accent.red + '20',
  },
  signOutText: { color: colors.accent.red, fontSize: 14, fontWeight: '600' },
  version: {
    color: colors.text.dim, fontSize: 10, textAlign: 'center', marginTop: 20, opacity: 0.5,
  },
});
