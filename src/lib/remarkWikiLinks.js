// Custom remark plugin: rewrite `[[Title]]` text into link nodes carrying
// a `data-wiki-target` HTML attribute. The host renderer is responsible
// for resolving the target to a memory and intercepting the click.
//
// Implementation walks the mdast tree directly so we avoid pulling in
// `unist-util-visit` as a runtime dep. We skip into existing `link` and
// `linkReference` subtrees so nested `[[ ]]` inside real links is preserved.

const WIKI_RE = /\[\[([^\[\]\n]+?)\]\]/g;

function splitText(text) {
  const out = [];
  let lastIndex = 0;
  WIKI_RE.lastIndex = 0;
  let m;
  while ((m = WIKI_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    const target = m[1].trim();
    out.push({
      type: 'link',
      url: '#wiki:' + encodeURIComponent(target),
      title: null,
      data: {
        hName: 'a',
        hProperties: { 'data-wiki-target': target },
      },
      children: [{ type: 'text', value: target }],
    });
    lastIndex = m.index + m[0].length;
  }
  if (out.length === 0) return null;
  if (lastIndex < text.length) {
    out.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return out;
}

function walk(node) {
  if (!node || !node.children || node.children.length === 0) return;
  if (node.type === 'link' || node.type === 'linkReference') return;

  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('[[')) {
      const replaced = splitText(child.value);
      if (replaced) {
        next.push(...replaced);
        continue;
      }
    }
    walk(child);
    next.push(child);
  }
  node.children = next;
}

export default function remarkWikiLinks() {
  return (tree) => walk(tree);
}
