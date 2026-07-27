export function formatNoteTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (timestamp >= startOfYesterday) {
    return "昨天";
  }
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function groupLabel(timestamp: number): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) return "今天";
  if (timestamp >= startOfYesterday) return "昨天";
  if (timestamp >= startOfWeek) return "本周";
  return "更早";
}

export function makePreview(content: string): string {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 80);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const cjk = trimmed.match(/[\u4e00-\u9fff]/g)?.join("").length ?? 0;
  const latin = trimmed
    .replace(/[\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latin;
}

export function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}
