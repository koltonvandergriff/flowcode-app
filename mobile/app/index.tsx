import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../lib/theme';
import {
  registerForPushNotifications,
  addNotificationListener,
  addNotificationResponseListener,
} from '../lib/notifications';
import * as Notifications from 'expo-notifications';

interface NotificationEvent {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  data?: {
    type: string;
    terminalId?: string;
    snippet?: string;
    exitCode?: number;
    runtime?: number;
  };
}

export default function HomeScreen() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    loadEvents();

    registerForPushNotifications().then(token => {
      if (token) {
        setPushToken(token);
        setConnected(true);
      }
    });

    notificationListener.current = addNotificationListener(notification => {
      const { title, body, data } = notification.request.content;
      const event: NotificationEvent = {
        id: notification.request.identifier,
        title: title || 'FlowCode',
        body: body || '',
        timestamp: Date.now(),
        data: data as any,
      };
      setEvents(prev => {
        const updated = [event, ...prev].slice(0, 100);
        saveEvents(updated);
        return updated;
      });
    });

    responseListener.current = addNotificationResponseListener(response => {
      // Handle notification tap
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const loadEvents = async () => {
    try {
      const raw = await AsyncStorage.getItem('flowcode_events');
      if (raw) setEvents(JSON.parse(raw));
    } catch {}
  };

  const saveEvents = async (evts: NotificationEvent[]) => {
    try {
      await AsyncStorage.setItem('flowcode_events', JSON.stringify(evts));
    } catch {}
  };

  const clearEvents = () => {
    Alert.alert('Clear History', 'Remove all notification history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setEvents([]); saveEvents([]); } },
    ]);
  };

  const copyToken = () => {
    if (pushToken) {
      Alert.alert(
        'Push Token',
        'Add this token to your FlowCode desktop app:\n\nSettings → Notifications → Paste token\n\n' + pushToken,
        [{ text: 'OK' }]
      );
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const getEventColor = (type?: string) => {
    switch (type) {
      case 'build_success':
      case 'test_pass':
      case 'deploy_done':
      case 'install_done':
        return colors.accent.green;
      case 'build_error':
      case 'test_fail':
      case 'crash':
        return colors.accent.red;
      case 'server_start':
        return colors.accent.cyan;
      default:
        return colors.accent.primary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FlowCode</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? colors.accent.green : colors.accent.red }]} />
            <Text style={styles.statusText}>
              {connected ? 'Notifications active' : 'Not connected'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={copyToken} style={styles.headerBtn}>
            <Ionicons name="qr-code-outline" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearEvents} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Token pairing notice */}
      {pushToken && !events.length && (
        <View style={styles.pairingCard}>
          <Ionicons name="link-outline" size={24} color={colors.accent.primary} />
          <Text style={styles.pairingTitle}>Pair with Desktop</Text>
          <Text style={styles.pairingText}>
            Open FlowCode desktop → Settings → Notifications{'\n'}
            Tap the QR icon above to get your push token
          </Text>
        </View>
      )}

      {/* Event list */}
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !pushToken ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.text.dim} />
              <Text style={styles.emptyText}>Enable notifications to receive terminal events</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={[styles.eventAccent, { backgroundColor: getEventColor(item.data?.type) }]} />
            <View style={styles.eventContent}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventTime}>{formatTime(item.timestamp)}</Text>
              </View>
              <Text style={styles.eventBody}>{item.body}</Text>
              {item.data?.snippet && (
                <View style={styles.snippetContainer}>
                  <Text style={styles.snippet} numberOfLines={2}>{item.data.snippet}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, color: colors.text.muted },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.bg.raised, alignItems: 'center', justifyContent: 'center' },
  pairingCard: {
    margin: 16, padding: 20, borderRadius: 12, alignItems: 'center', gap: 8,
    backgroundColor: colors.bg.raised, borderWidth: 1, borderColor: colors.accent.primary + '30',
  },
  pairingTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  pairingText: { fontSize: 12, color: colors.text.muted, textAlign: 'center', lineHeight: 18 },
  listContent: { padding: 12, gap: 8 },
  eventCard: {
    flexDirection: 'row', borderRadius: 10, overflow: 'hidden',
    backgroundColor: colors.bg.raised, marginBottom: 8,
  },
  eventAccent: { width: 3 },
  eventContent: { flex: 1, padding: 12, gap: 4 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  eventTime: { fontSize: 10, color: colors.text.dim },
  eventBody: { fontSize: 12, color: colors.text.secondary, lineHeight: 16 },
  snippetContainer: {
    marginTop: 6, padding: 8, borderRadius: 6, backgroundColor: colors.bg.surface,
  },
  snippet: { fontSize: 11, color: colors.text.muted, fontFamily: 'monospace' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 13, color: colors.text.dim, textAlign: 'center' },
});
