import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { colors } from '../../lib/theme';
import { fetchActivityEvents, subscribeToTable, ActivityEvent } from '../../lib/sync';

const EVENT_ICONS: Record<string, string> = {
  build_success: '✅', build_error: '❌', test_pass: '✅', test_fail: '❌',
  server_start: '🚀', deploy_done: '🚢', install_done: '📦', crash: '💥', exit: '⏹️',
};

const FILTERS = ['All', 'Builds', 'Tests', 'Deploys', 'Errors'] as const;
type Filter = typeof FILTERS[number];

const FILTER_TYPES: Record<Filter, string[]> = {
  All: [],
  Builds: ['build_success', 'build_error'],
  Tests: ['test_pass', 'test_fail'],
  Deploys: ['deploy_done', 'server_start'],
  Errors: ['build_error', 'test_fail', 'crash'],
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ActivityScreen() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const ev = await fetchActivityEvents(100);
    setEvents(ev);
  }, []);

  useEffect(() => {
    load();
    const unsub = subscribeToTable('activity_events', () => load());
    return unsub;
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = filter === 'All'
    ? events
    : events.filter(e => FILTER_TYPES[filter].includes(e.event_type));

  const grouped: { title: string; data: ActivityEvent[] }[] = [];
  let currentDate = '';
  for (const ev of filtered) {
    const date = formatDate(ev.created_at);
    if (date !== currentDate) {
      currentDate = date;
      grouped.push({ title: date, data: [] });
    }
    grouped[grouped.length - 1].data.push(ev);
  }

  const flatData: (string | ActivityEvent)[] = [];
  for (const g of grouped) {
    flatData.push(g.title);
    flatData.push(...g.data);
  }

  return (
    <View style={s.container}>
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, i) => typeof item === 'string' ? `header-${i}` : item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        renderItem={({ item }) => {
          if (typeof item === 'string') {
            return <Text style={s.dateHeader}>{item}</Text>;
          }
          return (
            <View style={s.eventCard}>
              <Text style={s.eventIcon}>{EVENT_ICONS[item.event_type] || '📋'}</Text>
              <View style={s.eventContent}>
                <Text style={s.eventTitle}>{item.title}</Text>
                <Text style={s.eventMeta}>
                  {item.terminal_label && `Terminal: ${item.terminal_label}`}
                  {item.workspace_name && ` · ${item.workspace_name}`}
                </Text>
                {item.snippet && (
                  <View style={s.snippetBox}>
                    <Text style={s.eventSnippet} numberOfLines={3}>{item.snippet}</Text>
                  </View>
                )}
              </View>
              <Text style={s.eventTime}>{formatTime(item.created_at)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, opacity: 0.3 }}>📋</Text>
            <Text style={s.emptyText}>No activity events</Text>
            <Text style={s.emptySubtext}>Events from your desktop will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.subtle,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary + '20', borderColor: colors.accent.primary + '40',
  },
  filterText: { color: colors.text.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.accent.primary },
  dateHeader: {
    color: colors.text.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  eventCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.bg.surface, borderRadius: 10, padding: 12,
    marginHorizontal: 16, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  eventIcon: { fontSize: 16, marginTop: 1 },
  eventContent: { flex: 1 },
  eventTitle: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
  eventMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  snippetBox: {
    backgroundColor: colors.bg.raised, borderRadius: 6, padding: 8, marginTop: 6,
  },
  eventSnippet: { color: colors.text.dim, fontSize: 10, fontFamily: 'monospace' },
  eventTime: { color: colors.text.dim, fontSize: 10 },
  emptyCard: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 40,
    alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20,
    borderWidth: 1, borderColor: colors.border.subtle, borderStyle: 'dashed',
  },
  emptyText: { color: colors.text.dim, fontSize: 13 },
  emptySubtext: { color: colors.text.dim, fontSize: 11, opacity: 0.7 },
});
