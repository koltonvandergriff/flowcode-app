import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import {
  fetchMemories, fetchDeletedMemories, createMemory, updateMemory, deleteMemory,
  restoreMemory, subscribeToMemories, getSubscriptionTier, Memory, MemoryType,
} from '../../lib/memory';

const TYPES: { id: MemoryType; label: string; icon: string; color: string }[] = [
  { id: 'fact',      label: 'Fact',      icon: 'pin-outline',          color: '#4af0c0' },
  { id: 'decision',  label: 'Decision',  icon: 'git-branch-outline',   color: '#a78bfa' },
  { id: 'context',   label: 'Context',   icon: 'document-text-outline',color: '#f59e0b' },
  { id: 'reference', label: 'Reference', icon: 'link-outline',         color: '#34d399' },
  { id: 'note',      label: 'Note',      icon: 'create-outline',       color: '#94a3b8' },
];

const TIER_LIMITS: Record<string, number> = { starter: 50, pro: 500, team: 5000 };

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function typeMeta(type: string) {
  return TYPES.find(t => t.id === type) || TYPES[4];
}

export default function MemoryScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [deleted, setDeleted] = useState<Memory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<MemoryType | null>(null);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<'starter' | 'pro' | 'team'>('starter');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'note' as MemoryType, tags: '' });
  const titleRef = useRef<TextInput>(null);

  const limit = TIER_LIMITS[tier] || 50;

  const load = useCallback(async (full = false) => {
    const list = await fetchMemories(full);
    setMemories(list);
  }, []);

  useEffect(() => {
    load(true);
    getSubscriptionTier().then(setTier);
    const unsub = subscribeToMemories(() => load());
    return unsub;
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    await getSubscriptionTier().then(setTier);
    setRefreshing(false);
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', content: '', type: 'note', tags: '' });
    setEditorOpen(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const openEdit = (m: Memory) => {
    setEditingId(m.id);
    setForm({ title: m.title, content: m.content, type: m.type, tags: (m.tags || []).join(', ') });
    setDetailId(null);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    if (!title) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingId) {
      await updateMemory(editingId, { title, content: form.content.trim(), type: form.type, tags });
    } else {
      if (memories.length >= limit) {
        Alert.alert('Limit reached', `${tier} tier allows ${limit} memories. Upgrade to add more.`);
        return;
      }
      await createMemory({ title, content: form.content.trim(), type: form.type, tags });
    }
    setEditorOpen(false);
    await load();
  };

  const handleDelete = (m: Memory) => {
    Alert.alert('Delete memory', `Delete "${m.title}"? Recoverable for 72h.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteMemory(m.id);
          setDetailId(null);
          await load();
        },
      },
    ]);
  };

  const openTrash = async () => {
    const list = await fetchDeletedMemories();
    setDeleted(list);
    setTrashOpen(true);
  };

  const handleRestore = async (id: string) => {
    await restoreMemory(id);
    setDeleted(d => d.filter(m => m.id !== id));
    await load();
  };

  const filtered = memories.filter(m => {
    if (filterType && m.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const detail = detailId ? memories.find(m => m.id === detailId) : null;

  return (
    <View style={s.container}>
      {/* Top bar: count, search, trash */}
      <View style={s.topBar}>
        <View style={s.countPill}>
          <Text style={s.countText}>{memories.length}/{limit}</Text>
        </View>
        <TextInput
          style={s.search}
          placeholder="Search..."
          placeholderTextColor={colors.text.dim}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={s.iconButton} onPress={openTrash}>
          <Ionicons name="trash-outline" size={18} color={colors.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.addButton} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        <TouchableOpacity
          style={[s.filterChip, !filterType && s.filterChipActive]}
          onPress={() => setFilterType(null)}
        >
          <Text style={[s.filterText, !filterType && s.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.filterChip, filterType === t.id && { backgroundColor: t.color + '15', borderColor: t.color + '40' }]}
            onPress={() => setFilterType(filterType === t.id ? null : t.id)}
          >
            <Ionicons name={t.icon as any} size={12} color={filterType === t.id ? t.color : colors.text.muted} />
            <Text style={[s.filterText, filterType === t.id && { color: t.color }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        renderItem={({ item }) => {
          const tm = typeMeta(item.type);
          return (
            <TouchableOpacity style={s.card} onPress={() => setDetailId(item.id)} onLongPress={() => openEdit(item)}>
              <View style={[s.typeDot, { backgroundColor: tm.color }]} />
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                {!!item.content && <Text style={s.cardContent} numberOfLines={2}>{item.content}</Text>}
                <View style={s.cardMeta}>
                  <Text style={[s.typeLabel, { color: tm.color }]}>{tm.label}</Text>
                  <Text style={s.cardTime}>· {timeAgo(item.updatedAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="bulb-outline" size={32} color={colors.text.dim} />
            <Text style={s.emptyText}>{search || filterType ? 'No matches' : 'No memories yet'}</Text>
            <Text style={s.emptySubtext}>
              {search || filterType ? 'Try a different filter' : 'Create memories here or from your desktop'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Detail Modal */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetailId(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            {detail && (
              <>
                <View style={s.modalHeader}>
                  <View style={[s.typeDot, { backgroundColor: typeMeta(detail.type).color }]} />
                  <Text style={s.modalTitle} numberOfLines={2}>{detail.title}</Text>
                  <TouchableOpacity onPress={() => setDetailId(null)}>
                    <Ionicons name="close" size={22} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                  <View style={[s.typePill, { backgroundColor: typeMeta(detail.type).color + '15' }]}>
                    <Text style={[s.typePillText, { color: typeMeta(detail.type).color }]}>{typeMeta(detail.type).label.toUpperCase()}</Text>
                  </View>
                  <Text style={s.modalContent}>{detail.content}</Text>
                  {detail.tags?.length > 0 && (
                    <View style={s.tagRow}>
                      {detail.tags.map(t => (
                        <View key={t} style={s.tagChip}><Text style={s.tagText}>{t}</Text></View>
                      ))}
                    </View>
                  )}
                  <Text style={s.modalMeta}>
                    Created {new Date(detail.createdAt).toLocaleDateString()} · Updated {timeAgo(detail.updatedAt)}
                  </Text>
                </ScrollView>
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(detail)}>
                    <Ionicons name="create-outline" size={16} color={colors.accent.primary} />
                    <Text style={[s.actionText, { color: colors.accent.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(detail)}>
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                    <Text style={[s.actionText, { color: '#f87171' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Editor Modal */}
      <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'Edit memory' : 'New memory'}</Text>
              <TouchableOpacity onPress={() => setEditorOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              <TextInput
                ref={titleRef}
                style={s.formInput}
                placeholder="Title"
                placeholderTextColor={colors.text.dim}
                value={form.title}
                onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
              />
              <TextInput
                style={[s.formInput, { minHeight: 120, textAlignVertical: 'top' }]}
                placeholder="Content (markdown supported)"
                placeholderTextColor={colors.text.dim}
                value={form.content}
                onChangeText={(v) => setForm(f => ({ ...f, content: v }))}
                multiline
              />
              <View style={s.typePicker}>
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.typeOption, form.type === t.id && { backgroundColor: t.color + '15', borderColor: t.color + '40' }]}
                    onPress={() => setForm(f => ({ ...f, type: t.id }))}
                  >
                    <Ionicons name={t.icon as any} size={14} color={form.type === t.id ? t.color : colors.text.muted} />
                    <Text style={[s.typeOptionText, form.type === t.id && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.formInput}
                placeholder="Tags (comma-separated)"
                placeholderTextColor={colors.text.dim}
                value={form.tags}
                onChangeText={(v) => setForm(f => ({ ...f, tags: v }))}
              />
              <TouchableOpacity
                style={[s.saveBtn, !form.title.trim() && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!form.title.trim()}
              >
                <Text style={s.saveBtnText}>{editingId ? 'Update' : 'Save'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Trash Modal */}
      <Modal visible={trashOpen} transparent animationType="slide" onRequestClose={() => setTrashOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Recently deleted</Text>
              <TouchableOpacity onPress={() => setTrashOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.text.dim, fontSize: 11, paddingHorizontal: 16, paddingBottom: 8 }}>
              Recoverable for 72 hours
            </Text>
            <FlatList
              data={deleted}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={s.trashRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.trashTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.trashMeta}>Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : ''}</Text>
                  </View>
                  <TouchableOpacity style={s.restoreBtn} onPress={() => handleRestore(item.id)}>
                    <Text style={s.restoreText}>Restore</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: colors.text.dim, fontSize: 12 }}>No deleted memories.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  countPill: {
    backgroundColor: colors.accent.primary + '15', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 12,
  },
  countText: { color: colors.accent.primary, fontSize: 11, fontWeight: '700' },
  search: {
    flex: 1, backgroundColor: colors.bg.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, color: colors.text.primary, fontSize: 13,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  iconButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  addButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: { paddingVertical: 6, maxHeight: 40 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.subtle,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary + '15', borderColor: colors.accent.primary + '40',
  },
  filterText: { color: colors.text.muted, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: colors.accent.primary },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.bg.surface, borderRadius: 10, padding: 12,
    marginHorizontal: 16, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  cardContent: { color: colors.text.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  typeLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  cardTime: { color: colors.text.dim, fontSize: 10 },
  emptyCard: {
    backgroundColor: colors.bg.surface, borderRadius: 12, padding: 40,
    alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20,
    borderWidth: 1, borderColor: colors.border.subtle, borderStyle: 'dashed',
  },
  emptyText: { color: colors.text.dim, fontSize: 13 },
  emptySubtext: { color: colors.text.dim, fontSize: 11, opacity: 0.7, textAlign: 'center' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg.base, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    height: '85%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderBottomWidth: 1, borderColor: colors.border.subtle,
  },
  modalTitle: { flex: 1, color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  modalContent: { color: colors.text.primary, fontSize: 14, lineHeight: 22, marginTop: 12 },
  modalMeta: { color: colors.text.dim, fontSize: 11, marginTop: 16 },
  modalActions: {
    flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border.subtle,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  typePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tagChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    backgroundColor: colors.accent.primary + '12',
  },
  tagText: { color: colors.accent.primary, fontSize: 10, fontWeight: '600' },
  formInput: {
    backgroundColor: colors.bg.surface, borderRadius: 8, padding: 12,
    color: colors.text.primary, fontSize: 13,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  typePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.subtle,
  },
  typeOptionText: { color: colors.text.muted, fontSize: 11, fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.accent.primary, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  trashRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: colors.border.subtle,
  },
  trashTitle: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
  trashMeta: { color: colors.text.dim, fontSize: 10, marginTop: 2 },
  restoreBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: colors.accent.primary + '15',
  },
  restoreText: { color: colors.accent.primary, fontSize: 11, fontWeight: '700' },
});
