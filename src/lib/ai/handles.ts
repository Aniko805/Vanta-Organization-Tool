const TOKEN = /\[\[(note|image|task):([A-Za-z0-9_-]+)\]\]/g;
const STORED_TOKEN = /\[\[(note|image|task):([0-9a-fA-F-]{36})\]\]/g;

export type HandleMaps = {
  note: Map<string, string>;
  image: Map<string, string>;
  task: Map<string, string>;
};

export function rewriteHandles(
  content: string,
  maps: HandleMaps,
  onDrop: (token: string) => void
): string {
  const allowed = new Set<string>([
    ...maps.note.values(),
    ...maps.image.values(),
    ...maps.task.values(),
  ]);

  const rewritten = content.replace(TOKEN, (full, kind: string, handle: string) => {
    const map = kind === "note" ? maps.note : kind === "image" ? maps.image : maps.task;
    const id = map.get(handle);
    if (!id) {
      if (allowed.has(handle)) return `[[${kind}:${handle}]]`;
      onDrop(full);
      return "";
    }
    return `[[${kind}:${id}]]`;
  });

  return rewritten.replace(STORED_TOKEN, (full, kind: string, id: string) => {
    const map = kind === "note" ? maps.note : kind === "image" ? maps.image : maps.task;
    if (![...map.values()].includes(id)) {
      onDrop(full);
      return "";
    }
    return full;
  });
}

export function collectRefs(content: string): { kind: "note" | "task" | "image"; id: string }[] {
  const refs: { kind: "note" | "task" | "image"; id: string }[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(STORED_TOKEN)) {
    const kind = match[1] as "note" | "task" | "image";
    const id = match[2];
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ kind, id });
  }
  return refs;
}

export function tokensToMarkdownLinks(content: string): string {
  return content.replace(STORED_TOKEN, (_full, kind: string, id: string) => {
    return `[${kind}](#vulcan-${kind}-${id})`;
  });
}
