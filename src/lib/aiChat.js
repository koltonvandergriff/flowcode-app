/**
 * aiChat.js — Lightweight API chat adapter for multi-provider AI streaming.
 *
 * Yields objects of shape:
 *   { type: 'text', content: '...' }
 *   { type: 'error', content: '...' }
 *   { type: 'done' }
 */

// ---------------------------------------------------------------------------
// ChatGPT (OpenAI Chat Completions)
// ---------------------------------------------------------------------------

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

function toOpenAIContent(msg) {
  if (!msg.images?.length) return msg.content;
  const parts = [];
  if (msg.content) parts.push({ type: 'text', text: msg.content });
  for (const img of msg.images) {
    parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
  }
  return parts;
}

function toAnthropicContent(msg) {
  if (!msg.images?.length) return msg.content;
  const parts = [];
  for (const img of msg.images) {
    const match = img.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      parts.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
    }
  }
  if (msg.content) parts.push({ type: 'text', text: msg.content });
  return parts;
}

async function* streamChatGPT(messages, apiKeyGetter) {
  const apiKey = await apiKeyGetter('OPENAI_API_KEY');
  if (!apiKey) {
    yield { type: 'error', content: 'Missing OPENAI_API_KEY — set it in Settings to use ChatGPT.' };
    yield { type: 'done' };
    return;
  }

  const inputTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  const body = {
    model: 'gpt-4o',
    messages: messages.map((m) => ({ role: m.role, content: toOpenAIContent(m) })),
    stream: true,
  };

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    yield { type: 'error', content: `Network error: ${err.message}` };
    yield { type: 'done' };
    return;
  }

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    yield { type: 'error', content: `OpenAI API ${response.status}: ${detail || response.statusText}` };
    yield { type: 'done' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let outputText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {
          const outputTokens = estimateTokens(outputText);
          yield { type: 'usage', model: 'gpt-4o', input: inputTokens, output: outputTokens };
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            outputText += delta;
            yield { type: 'text', content: delta };
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }

  const outputTokens = estimateTokens(outputText);
  yield { type: 'usage', model: 'gpt-4o', input: inputTokens, output: outputTokens };
  yield { type: 'done' };
}

// ---------------------------------------------------------------------------
// Anthropic (Claude API — direct streaming)
// ---------------------------------------------------------------------------

async function* streamAnthropic(messages, apiKeyGetter) {
  const apiKey = await apiKeyGetter('ANTHROPIC_API_KEY');
  if (!apiKey) {
    yield { type: 'error', content: 'Missing ANTHROPIC_API_KEY — set it in Settings to use Claude.' };
    yield { type: 'done' };
    return;
  }

  const body = {
    model: 'claude-sonnet-4-6',
    messages: messages.map((m) => ({ role: m.role, content: toAnthropicContent(m) })),
    max_tokens: 8192,
    stream: true,
  };

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    yield { type: 'error', content: `Network error: ${err.message}` };
    yield { type: 'done' };
    return;
  }

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    yield { type: 'error', content: `Anthropic API ${response.status}: ${detail || response.statusText}` };
    yield { type: 'done' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = null;

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          // Empty line resets event state (end of SSE block)
          currentEvent = null;
          continue;
        }

        if (trimmed.startsWith('event: ')) {
          currentEvent = trimmed.slice(7);
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6);
          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          if (currentEvent === 'message_start') {
            inputTokens = parsed.message?.usage?.input_tokens || 0;
          } else if (currentEvent === 'content_block_delta') {
            const text = parsed.delta?.text;
            if (text) {
              yield { type: 'text', content: text };
            }
          } else if (currentEvent === 'message_delta') {
            outputTokens = parsed.usage?.output_tokens || 0;
          } else if (currentEvent === 'message_stop') {
            yield { type: 'usage', model: 'claude-sonnet-4-6', input: inputTokens, output: outputTokens };
            yield { type: 'done' };
            return;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // If stream ended without message_stop, still emit usage + done
  yield { type: 'usage', model: 'claude-sonnet-4-6', input: inputTokens, output: outputTokens };
  yield { type: 'done' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const PROVIDER_STREAMS = {
  chatgpt: streamChatGPT,
  'claude-api': streamAnthropic,
};

/**
 * Stream a chat completion from the given provider.
 *
 * @param {string} provider        Provider id (e.g. 'chatgpt', 'claude-api')
 * @param {Array}  messages        Array of { role, content } messages
 * @param {Function} apiKeyGetter  async (keyName) => string | null
 * @yields {{ type: 'text'|'error'|'done', content?: string }}
 */
export async function* streamChat(provider, messages, apiKeyGetter) {
  const streamFn = PROVIDER_STREAMS[provider];
  if (!streamFn) {
    yield { type: 'error', content: `Unknown API provider: ${provider}` };
    yield { type: 'done' };
    return;
  }
  yield* streamFn(messages, apiKeyGetter);
}
