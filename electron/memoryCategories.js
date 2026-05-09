import { supabase } from './supabaseClient.js';

// Thin Supabase wrapper for memory_categories. Categories are metadata derived
// from AI runs (or future manual edits), so we don't bother with the full
// offline-first / sync-queue treatment that lives in memoryStore. They're
// refreshed on demand and on memory list reload.

async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export async function listCategories() {
  const userId = await ensureSession();
  const { data, error } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toClient);
}

export async function createCategory({ name, emoji, description, color, parentId }) {
  const userId = await ensureSession();
  const { data, error } = await supabase
    .from('memory_categories')
    .insert({
      user_id: userId,
      name,
      emoji: emoji ?? null,
      description: description ?? null,
      color: color ?? null,
      parent_id: parentId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toClient(data);
}

export async function updateCategory(id, patch) {
  const userId = await ensureSession();
  const next = {};
  if ('name' in patch) next.name = patch.name;
  if ('emoji' in patch) next.emoji = patch.emoji;
  if ('description' in patch) next.description = patch.description;
  if ('color' in patch) next.color = patch.color;
  if ('parentId' in patch) next.parent_id = patch.parentId;
  const { data, error } = await supabase
    .from('memory_categories')
    .update(next)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return toClient(data);
}

export async function deleteCategory(id) {
  const userId = await ensureSession();
  const { error } = await supabase
    .from('memory_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  // Detach memories that pointed at this category
  await supabase
    .from('memories')
    .update({ category_id: null })
    .eq('user_id', userId)
    .eq('category_id', id);
}

export async function assignCategory(memoryId, categoryId) {
  const userId = await ensureSession();
  const { error } = await supabase
    .from('memories')
    .update({ category_id: categoryId ?? null })
    .eq('id', memoryId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Persist an AI-generated category tree in one pass.
 * Tree nodes:
 *   { name, emoji?, description?, color?, children?: [...], memoryIds?: [...] }
 * Returns: { categoriesCreated, assignmentsMade }.
 *
 * The whole vault's existing categorization is wiped first so re-runs converge
 * cleanly — old categories tombstoned, memory.category_id set to the new
 * leaf for each memoryId in the tree.
 */
export async function persistCategoryTree(tree) {
  const userId = await ensureSession();

  // 1. Tombstone existing categories so a re-run doesn't accumulate cruft.
  await supabase
    .from('memory_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('deleted_at', null);

  // 2. Walk the tree, inserting parents before children so parent_id can resolve.
  const assignments = []; // { memoryId, categoryId }
  let created = 0;

  async function insert(node, parentId) {
    const { data, error } = await supabase
      .from('memory_categories')
      .insert({
        user_id: userId,
        parent_id: parentId,
        name: node.name,
        emoji: node.emoji ?? null,
        description: node.description ?? null,
        color: node.color ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    created += 1;
    const id = data.id;

    for (const memoryId of node.memoryIds || []) {
      assignments.push({ memoryId, categoryId: id });
    }
    for (const child of node.children || []) {
      await insert(child, id);
    }
  }

  for (const root of tree) {
    await insert(root, null);
  }

  // 3. Bulk update memories.category_id. Supabase doesn't have a built-in
  //    bulk upsert by id with a different column, so chunk single-id updates.
  //    405 rows × ~30ms ≈ 12s; fine for a one-shot run.
  for (const { memoryId, categoryId } of assignments) {
    await supabase
      .from('memories')
      .update({ category_id: categoryId })
      .eq('id', memoryId)
      .eq('user_id', userId);
  }

  return { categoriesCreated: created, assignmentsMade: assignments.length };
}

function toClient(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    emoji: row.emoji,
    description: row.description,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
