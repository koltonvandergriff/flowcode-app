import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { fetchWorkspaces, fetchActivityEvents, subscribeToTable, Workspace, ActivityEvent } from '../../lib/sync';
import { registerForPushNotifications } from '../../lib/notifications';

const EVENT_ICONS: Record<string, string> = {
  build_success: '✅', build_error: '❌', test_pass: '✅', test_fail: '❌',
  server_start: '🚀', deploy_done: '🚢', install_done: '📦', crash: '💥', exit: '⏹️',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function DashboardScreen() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [ws, ev] = await Promise.all([fetchWorkspaces(), fetchActivityEvents(10)]);
    setWorkspaces(ws);
    setRecentEvents(ev);
  }, []);

  useEffect(() => {
    registerForPushNotifications();
    load();
    const unsub1 = subscribeToTable('workspaces', () => load());
    const unsub2 = subscribeToTable('activity_events', () => load());
    return () => { unsub1(); unsub2(); };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const activeWs = workspaces.find(w => w.is_active);

  return (
    <FlatList
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
      ListHeaderComponent={
        <>
          {/* Connection Status */}
          <View style={s.statusCard}>
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: workspaces.length > 0 ? colors.accent.green : colors.text.dim }]} />
              <Text style={s.statusText}>
                {workspaces.length > 0 ? 'Desktop Connected' : 'Waiting for desktop...'}
              </Text>
            </View>
            {activeWs && (
              <Text style={s.activeWorkspace}>Active: {activeWs.name}</Text>
            )}
          </View>

          {/* Workspace Cards */}
          <Text style={s.sectionTitle}>WORKSPACES ({workspaces.length})</Text>
          {workspaces.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="desktop-outline" size={32} color={colors.text.dim} />
              <Text style={s.emptyText}>No workspaces synced yet</Text>
              <Text style={s.emptySubtext}>Open FlowCode on your desktop to sync</Text>
            </View>
          )}
          {workspaces.map(ws => (
            <View key={ws.id} style={[s.wsCard, ws.is_active && s.wsCardActive]}>
              <View style={s.wsHeader}>
                <Text style={s.wsName}>{ws.name}</Text>
                {ws.is_active && (
                  <View style={s.activeBadge}>
                    <Text style={s.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <View style={s.wsStats}>
                <View style={s.wsStat}>
                  <Ionicons name="terminal-outline" size={12} color={colors.text.muted} />
                  <Text style={s.wsStatText}>{ws.terminal_count} terminal{ws.terminal_count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={s.wsStat}>
                  <Ionicons name="grid-outline" size={12} color={colors.text.muted} />
                  <Text style={s.wsStatText}>{ws.layout}</Text>
                </View>
                <Text style={s.wsTime}>{timeAgo(ws.last_activity_at)}</Text>
              </View>
            </View>
          ))}

          {/* Recent Activity */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>RECENT ACTIVITY</Text>
        </>
      }
      data={recentEvents}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={s.eventCard}>
          <Text style={s.eventIcon}>{EVENT_ICONS[item.event_type] || '📋'}</Text>
          <View style={s.eventContent}>
            <Text style={s.eventTitle}>{item.title}</Text>
            <Text style={s.eventMeta}>
              {item.terminal_label && `Terminal: ${item.terminal_label}`}
              {item.workspace_name && ` · ${item.workspace_name}`}
            </Text>
            {item.snippet && <Text style={s.eventSnippet} numberOfLines={1}>{item.snippet}</Text>}
          </View>
          <Text style={s.eventTime}>{timeAgo(item.created_at)}</Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 24, opacity: 0.3 }}>📋</Text>
          <Text style={s.emptyText}>No activity yet</Text>
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base, paddingHorizontal: 16 },
  statusCard: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  activeWorkspace: { color: colors.accent.primary, fontSize: 12, marginTop: 6, fontWeight: '500' },
  sectionTitle: {
    color: colors.text.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    marginTop: 20, marginBottom: 8, paddingLeft: 2,
  },
  wsCard: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  wsCardActive: { borderColor: colors.accent.primary + '40' },
  wsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wsName: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  activeBadge: {
    backgroundColor: colors.accent.primary + '20', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: { color: colors.accent.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  wsStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  wsStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wsStatText: { color: colors.text.muted, fontSize: 11 },
  wsTime: { color: colors.text.dim, fontSize: 10, marginLeft: 'auto' },
  eventCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.bg.surface, borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  eventIcon: { fontSize: 16, marginTop: 1 },
  eventContent: { flex: 1 },
  eventTitle: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
  eventMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  eventSnippet: {
    color: colors.text.dim, fontSize: 10, marginTop: 4,
    backgroundColor: colors.bg.raised, padding: 4, borderRadius: 4, overflow: 'hidden',
  },
  eventTime: { color: colors.text.dim, fontSize: 9 },
  emptyCard: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 32,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border.subtle,
    borderStyle: 'dashed',
  },
  emptyText: { color: colors.text.dim, fontSize: 13 },
  emptySubtext: { color: colors.text.dim, fontSize: 11, opacity: 0.7 },
});
