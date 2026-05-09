import { supabase } from './supabaseClient.js';
import { persistCategoryTree, listCategories, assignCategory, createCategory } from './memoryCategories.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const MODEL_ID = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

const SYSTEM_PROMPT = `You organize a developer's personal memory vault into a navigable hierarchy.

Goal: Produce a 2-3 level deep tree of categories that mirrors how the user actually thinks about their work — projects, then phases or domains, then specific topics. Each leaf category groups closely related memories.

Hard rules:
- Every memory id passed to you MUST be assigned to exactly one leaf category. No memory left out, no memory in two leaves.
- Prefer 5-15 top-level categories, 2-5 children per parent. Total leaf categories under 50.
- Category names: short, concrete nouns (e.g. "FlowADE", "Database Schema", "Stripe Integration"). No filler words.
- Emoji: pick one that matches the category. Single character, no skin-tone modifiers.
- Description: one short sentence explaining what belongs here, used as a hover tooltip.
- Use the call_categorize_memories tool. Do not respond with prose.`;

const TOOL_DEF = {
  name: 'call_categorize_memories',
  description: 'Submit the final category hierarchy and memory assignments.',
  input_schema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        description: 'Top-level category nodes. Each may contain children (recursive) or memoryIds (leaf).',
        items: { $ref: '#/$defs/node' },
      },
    },
    required: ['categories'],
    $defs: {
      node: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          emoji: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string', description: 'Optional hex color like #4af0c0.' },
          children: { type: 'array', items: { $ref: '#/$defs/node' } },
          memoryIds: {
            type: 'array',
            description: 'Memory ids that live in this leaf category. Only present on leaves.',
            items: { type: 'string' },
          },
        },
        required: ['name'],
      },
    },
  },
};

function snippet(text, max = 240) {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max) + '…' : flat;
}

function buildUserMessage(memories) {
  const lines = memories.map((m) => {
    const tags = (m.tags || []).filter(Boolean).join(', ');
    return JSON.stringify({
      id: m.id,
      title: m.title || '',
      type: m.type || 'note',
      tags: tags || null,
      snippet: snippet(m.content),
    });
  });
  return [
    `Categorize these ${memories.length} memories.`,
    'Each line is one memory record as JSON.',
    '',
    lines.join('\n'),
    '',
    'Return the hierarchy via the call_categorize_memories tool.',
  ].join('\n');
}

async function fetchMemoriesForUser(userId) {
  const { data, error } = await supabase
    .from('memories')
    .select('id, title, content, type, tags')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

function findToolUseBlock(content) {
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (block?.type === 'tool_use' && block?.name === 'call_categorize_memories') {
      return block.input;
    }
  }
  return null;
}

function validateTree(tree, expectedIds) {
  const seen = new Set();
  function walk(nodes, depth) {
    if (!Array.isArray(nodes)) throw new Error('categories must be an array');
    for (const n of nodes) {
      if (!n || typeof n.name !== 'string' || !n.name.trim()) {
        throw new Error('every node needs a non-empty name');
      }
      const hasChildren = Array.isArray(n.children) && n.children.length > 0;
      const hasIds = Array.isArray(n.memoryIds) && n.memoryIds.length > 0;
      if (hasChildren && hasIds) {
        // Treat as parent — drop ids, log a warning. Should rarely happen.
        n.memoryIds = [];
      }
      if (hasIds) {
        for (const id of n.memoryIds) {
          if (seen.has(id)) throw new Error(`memory ${id} assigned to multiple categories`);
          seen.add(id);
        }
      }
      if (hasChildren) walk(n.children, depth + 1);
    }
  }
  walk(tree, 0);

  const missing = [];
  for (const id of expectedIds) if (!seen.has(id)) missing.push(id);
  return { missing, assigned: seen };
}

// ---------------------------------------------------------------------------
// Single-memory auto-categorization — used to slot a freshly-created memory
// into the existing category tree without re-classifying the whole vault.
// ---------------------------------------------------------------------------

const SINGLE_TOOL_DEF = {
  name: 'place_memory',
  description: 'Pick the best leaf category for this memory, or signal that a new leaf is needed.',
  input_schema: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'Id of the existing leaf category that best fits. Use null if no leaf is a good fit.',
      },
      newCategory: {
        type: 'object',
        description: 'Only set if no existing leaf fits. Caller will create this leaf and assign the memory to it.',
        properties: {
          parentId: { type: 'string', description: 'Parent category id, or null for a new top-level leaf.' },
          name: { type: 'string' },
          emoji: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
};

const SINGLE_SYSTEM_PROMPT = `You are slotting one new memory into an existing category tree.

Inputs you'll receive:
- The full list of leaf categories (id, full path, description).
- One memory (title, content snippet, tags, type).

Decide:
- If an existing leaf clearly fits, return { categoryId }.
- If no existing leaf fits, return { newCategory } with parentId set to the most relevant existing top-level / mid-level category (or null for a brand-new top-level leaf). Pick a short concrete name + an emoji.

Always use the place_memory tool. Do not respond with prose.`;

function buildLeafList(categories) {
  const byId = new Map(categories.map(c => [c.id, c]));
  const childCount = new Map();
  for (const c of categories) {
    if (c.parentId) childCount.set(c.parentId, (childCount.get(c.parentId) || 0) + 1);
  }
  const path = (c) => {
    const parts = [c.name];
    let cur = c;
    while (cur.parentId && byId.has(cur.parentId)) {
      cur = byId.get(cur.parentId);
      parts.unshift(cur.name);
    }
    return parts.join(' / ');
  };
  return categories
    .filter(c => !childCount.has(c.id)) // only leaves
    .map(c => ({
      id: c.id,
      path: path(c),
      description: c.description || null,
    }));
}

/**
 * Pick a category for a single memory. Returns the chosen categoryId without
 * touching cloud rows — the caller is responsible for persisting the choice
 * (typically via the local memory store, which queues a cloud upsert).
 *
 * Required: { memory: { id, title, content, type, tags }, apiKey }.
 */
export async function runAutoCategorizeOne({ memory, apiKey, model = 'haiku' } = {}) {
  if (!apiKey || !memory?.id) return { ok: false, reason: 'missing input' };
  const modelId = MODEL_ID[model] || MODEL_ID.haiku;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { ok: false, reason: 'no session' };

  const categories = await listCategories();
  if (categories.length === 0) {
    return { ok: false, reason: 'no categories yet' };
  }

  const leaves = buildLeafList(categories);
  const userMessage = [
    'Existing leaf categories:',
    JSON.stringify(leaves, null, 2),
    '',
    'Memory to place:',
    JSON.stringify({
      title: memory.title || '',
      type: memory.type || 'note',
      tags: (memory.tags || []).filter(Boolean),
      snippet: snippet(memory.content),
    }, null, 2),
  ].join('\n');

  const body = {
    model: modelId,
    max_tokens: 600,
    temperature: 0,
    system: SINGLE_SYSTEM_PROMPT,
    tools: [SINGLE_TOOL_DEF],
    tool_choice: { type: 'tool', name: 'place_memory' },
    messages: [{ role: 'user', content: userMessage }],
  };

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, reason: `anthropic ${response.status}`, detail: text };
  }
  const json = await response.json();
  const out = (Array.isArray(json.content) ? json.content : [])
    .find(b => b?.type === 'tool_use' && b.name === 'place_memory')?.input;
  if (!out) return { ok: false, reason: 'no tool_use returned' };

  let targetId = null;
  if (out.categoryId && categories.some(c => c.id === out.categoryId)) {
    targetId = out.categoryId;
  } else if (out.newCategory && out.newCategory.name) {
    const created = await createCategory({
      name: out.newCategory.name,
      emoji: out.newCategory.emoji,
      description: out.newCategory.description,
      parentId: out.newCategory.parentId && categories.some(c => c.id === out.newCategory.parentId)
        ? out.newCategory.parentId
        : null,
    });
    targetId = created.id;
  } else {
    return { ok: false, reason: 'model declined to place' };
  }

  return { ok: true, categoryId: targetId, usage: json.usage || null };
}

export async function runAiCategorize({ apiKey, model = 'haiku', onProgress } = {}) {
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY — set it in Settings.');
  }
  const modelId = MODEL_ID[model] || MODEL_ID.haiku;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  onProgress?.({ phase: 'load', message: 'Loading memories…' });
  const memories = await fetchMemoriesForUser(userId);
  if (memories.length === 0) {
    return { ok: true, categoriesCreated: 0, assignmentsMade: 0, totalMemories: 0 };
  }

  onProgress?.({ phase: 'prompt', message: `Sending ${memories.length} memories to ${modelId}…`, count: memories.length });
  const userMessage = buildUserMessage(memories);

  const body = {
    model: modelId,
    max_tokens: 8000,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    tools: [TOOL_DEF],
    tool_choice: { type: 'tool', name: 'call_categorize_memories' },
    messages: [{ role: 'user', content: userMessage }],
  };

  let response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        // Required for direct browser-style calls; harmless from main process.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Anthropic request failed: ${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Anthropic ${response.status}: ${text || response.statusText}`);
  }

  const json = await response.json();
  const toolInput = findToolUseBlock(json.content);
  if (!toolInput || !Array.isArray(toolInput.categories)) {
    throw new Error('Model did not return a category tree.');
  }

  onProgress?.({ phase: 'validate', message: 'Validating category tree…' });
  const expectedIds = memories.map(m => m.id);
  const { missing } = validateTree(toolInput.categories, expectedIds);
  if (missing.length > 0) {
    // Bucket any unassigned memories under a fallback so users don't lose them.
    toolInput.categories.push({
      name: 'Uncategorized',
      emoji: '📦',
      description: 'Memories the categorizer did not place into a category.',
      memoryIds: missing,
    });
  }

  onProgress?.({ phase: 'persist', message: 'Saving categories…' });
  const result = await persistCategoryTree(toolInput.categories);

  return {
    ok: true,
    totalMemories: memories.length,
    unassignedFallback: missing.length,
    ...result,
    usage: json.usage || null,
  };
}
