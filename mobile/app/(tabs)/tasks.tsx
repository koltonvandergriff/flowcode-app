import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { fetchTasks, createTask, updateTask, deleteTask, subscribeToTable, Task } from '../../lib/sync';

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  todo: { icon: 'ellipse-outline', label: 'To Do', color: colors.text.muted },
  'in-progress': { icon: 'time-outline', label: 'In Progress', color: colors.accent.amber },
  done: { icon: 'checkmark-circle', label: 'Done', color: colors.accent.green },
};

const STATUS_CYCLE = ['todo', 'in-progress', 'done'] as const;

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    const t = await fetchTasks();
    setTasks(t);
  }, []);

  useEffect(() => {
    load();
    const unsub = subscribeToTable('tasks', () => load());
    return unsub;
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    await createTask(title);
    setNewTitle('');
    await load();
    setCreating(false);
  }, [newTitle, load]);

  const cycleStatus = useCallback(async (task: Task) => {
    const currentIdx = STATUS_CYCLE.indexOf(task.status as any);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    await updateTask(task.id, { status: nextStatus });
    await load();
  }, [load]);

  const handleDelete = useCallback((task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteTask(task.id); await load(); },
      },
    ]);
  }, [load]);

  const filtered = statusFilter
    ? tasks.filter(t => t.status === statusFilter)
    : tasks;

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <View style={s.container}>
      {/* Create Task Input */}
      <View style={s.inputRow}>
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder="Add a task..."
          placeholderTextColor={colors.text.dim}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
          editable={!creating}
        />
        <TouchableOpacity
          style={[s.addButton, (!newTitle.trim() || creating) && s.addButtonDisabled]}
          onPress={handleCreate}
          disabled={!newTitle.trim() || creating}
        >
          <Ionicons name="add" size={20} color={!newTitle.trim() || creating ? colors.text.dim : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterChip, !statusFilter && s.filterChipActive]}
          onPress={() => setStatusFilter(null)}
        >
          <Text style={[s.filterText, !statusFilter && s.filterTextActive]}>All ({counts.all})</Text>
        </TouchableOpacity>
        {STATUS_CYCLE.map(st => (
          <TouchableOpacity
            key={st}
            style={[s.filterChip, statusFilter === st && s.filterChipActive]}
            onPress={() => setStatusFilter(statusFilter === st ? null : st)}
          >
            <Ionicons
              name={STATUS_CONFIG[st].icon as any}
              size={12}
              color={statusFilter === st ? STATUS_CONFIG[st].color : colors.text.muted}
            />
            <Text style={[s.filterText, statusFilter === st && { color: STATUS_CONFIG[st].color }]}>
              {counts[st]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.todo;
          return (
            <View style={s.taskCard}>
              <TouchableOpacity style={s.statusButton} onPress={() => cycleStatus(item)}>
                <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
              </TouchableOpacity>
              <View style={s.taskContent}>
                <Text style={[s.taskTitle, item.status === 'done' && s.taskTitleDone]}>{item.title}</Text>
                <View style={s.taskMeta}>
                  <View style={[s.statusPill, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={s.taskTime}>{timeAgo(item.updated_at)}</Text>
                </View>
              </View>
              <TouchableOpacity style={s.deleteButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color={colors.text.dim} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="checkbox-outline" size={32} color={colors.text.dim} />
            <Text style={s.emptyText}>
              {statusFilter ? `No ${STATUS_CONFIG[statusFilter]?.label.toLowerCase()} tasks` : 'No tasks yet'}
            </Text>
            <Text style={s.emptySubtext}>
              {statusFilter ? 'Try a different filter' : 'Create tasks here or from your desktop'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  input: {
    flex: 1, backgroundColor: colors.bg.surface, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, color: colors.text.primary, fontSize: 14,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  addButton: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: colors.bg.raised },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.subtle,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary + '15', borderColor: colors.accent.primary + '30',
  },
  filterText: { color: colors.text.muted, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: colors.accent.primary },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bg.surface, borderRadius: 10, padding: 12,
    marginHorizontal: 16, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  statusButton: { padding: 2 },
  taskContent: { flex: 1 },
  taskTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  taskTime: { color: colors.text.dim, fontSize: 10 },
  deleteButton: { padding: 6 },
  emptyCard: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 40,
    alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20,
    borderWidth: 1, borderColor: colors.border.subtle, borderStyle: 'dashed',
  },
  emptyText: { color: colors.text.dim, fontSize: 13 },
  emptySubtext: { color: colors.text.dim, fontSize: 11, opacity: 0.7 },
});
