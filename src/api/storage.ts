import type {
  AppBootstrap,
  AppSettings,
  CreateNoteInput,
  Note,
  NoteFilter,
  Notebook,
  TagCount,
  TransferResult,
  UpdateNoteInput,
} from "../types/note";
import { makePreview } from "../lib/format";

const NOTES_KEY = "inknote.local.notes";
const NOTEBOOKS_KEY = "inknote.local.notebooks";
const SETTINGS_KEY = "inknote.local.settings";

function uid(): string {
  return crypto.randomUUID();
}

function now(): number {
  return Date.now();
}

function defaultSettings(): AppSettings {
  return {
    theme: "dark",
    editorFontSize: 16,
    autoSaveMs: 1000,
    previewMode: "preview",
  };
}

function seedNotes(): Note[] {
  const t = now();
  return [
    {
      id: uid(),
      title: "欢迎使用 InkNote",
      content:
        "# 欢迎使用 InkNote\n\n这是浏览器本地模式（localStorage）。运行 `npm run tauri dev` 可使用 SQLite 持久化。\n\n- `Ctrl+K` 命令面板\n- `Ctrl+N` 新建\n- `Ctrl+/` 预览模式\n",
      preview: "这是浏览器本地模式（localStorage）",
      tags: [],
      notebookId: "work",
      isPinned: true,
      isFavorite: true,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    },
  ];
}

function seedNotebooks(): Notebook[] {
  return [
    { id: "work", name: "工作", parentId: null, sortOrder: 0, count: 0 },
    { id: "life", name: "生活", parentId: null, sortOrder: 1, count: 0 },
  ];
}

function readNotes(): Note[] {
  const raw = localStorage.getItem(NOTES_KEY);
  if (!raw) {
    const notes = seedNotes();
    writeNotes(notes);
    return notes;
  }
  return JSON.parse(raw) as Note[];
}

function writeNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function readNotebooks(): Notebook[] {
  const raw = localStorage.getItem(NOTEBOOKS_KEY);
  if (!raw) {
    const nbs = seedNotebooks();
    localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(nbs));
    return nbs;
  }
  return JSON.parse(raw) as Notebook[];
}

function writeNotebooks(notebooks: Notebook[]) {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

function withCounts(notebooks: Notebook[], notes: Note[]): Notebook[] {
  return notebooks.map((nb) => ({
    ...nb,
    count: notes.filter((n) => n.notebookId === nb.id && !n.deletedAt).length,
  }));
}

function collectTags(notes: Note[]): TagCount[] {
  const map = new Map<string, number>();
  for (const note of notes.filter((n) => !n.deletedAt)) {
    for (const tag of note.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function matchesFilter(note: Note, filter: NoteFilter): boolean {
  if (filter.trashOnly) {
    if (!note.deletedAt) return false;
  } else if (note.deletedAt) {
    return false;
  }
  if (filter.favoritesOnly && !note.isFavorite) return false;
  if (filter.ungroupedOnly && note.notebookId) return false;
  if (filter.notebookId && note.notebookId !== filter.notebookId) return false;
  if (filter.tag && !note.tags.includes(filter.tag)) return false;
  if (filter.query?.trim()) {
    const q = filter.query.trim().toLowerCase();
    const hit =
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.tags.some((t) => t.toLowerCase().includes(q));
    if (!hit) return false;
  }
  return true;
}

export const localApi = {
  async bootstrap(): Promise<AppBootstrap> {
    const notes = readNotes();
    const notebooks = withCounts(readNotebooks(), notes);
    return {
      notes: notes
        .filter((n) => !n.deletedAt)
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt),
      notebooks,
      tags: collectTags(notes),
      settings: this.getSettingsSync(),
    };
  },

  getSettingsSync(): AppSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings(), ...(JSON.parse(raw) as AppSettings) } : defaultSettings();
  },

  async listNotes(filter: NoteFilter = {}): Promise<Note[]> {
    return readNotes()
      .filter((n) => matchesFilter(n, filter))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt);
  },

  async getNote(id: string): Promise<Note> {
    const note = readNotes().find((n) => n.id === id);
    if (!note) throw new Error(`not found: ${id}`);
    return note;
  },

  async createNote(input: CreateNoteInput = {}): Promise<Note> {
    const title = (input.title ?? "无标题").trim() || "无标题";
    const content = input.content ?? `# ${title}\n\n`;
    const note: Note = {
      id: uid(),
      title,
      content,
      preview: makePreview(content),
      tags: input.tags ?? [],
      notebookId: input.notebookId ?? null,
      isPinned: false,
      isFavorite: false,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    const notes = readNotes();
    notes.unshift(note);
    writeNotes(notes);
    return note;
  },

  async updateNote(input: UpdateNoteInput): Promise<Note> {
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === input.id);
    if (idx < 0) throw new Error(`not found: ${input.id}`);
    const prev = notes[idx];
    const content = input.content ?? prev.content;
    const next: Note = {
      ...prev,
      title: input.title ?? prev.title,
      content,
      preview: makePreview(content),
      notebookId: input.clearNotebook
        ? null
        : input.notebookId !== undefined
          ? input.notebookId
          : prev.notebookId,
      tags: input.tags ?? prev.tags,
      isPinned: input.isPinned ?? prev.isPinned,
      isFavorite: input.isFavorite ?? prev.isFavorite,
      updatedAt: now(),
    };
    notes[idx] = next;
    writeNotes(notes);
    return next;
  },

  async softDeleteNote(id: string): Promise<Note> {
    return this.updateNoteFields(id, { deletedAt: now() });
  },

  async restoreNote(id: string): Promise<Note> {
    return this.updateNoteFields(id, { deletedAt: null });
  },

  async permanentDeleteNote(id: string): Promise<void> {
    writeNotes(readNotes().filter((n) => n.id !== id));
  },

  async emptyTrash(): Promise<number> {
    const notes = readNotes();
    const next = notes.filter((n) => !n.deletedAt);
    const removed = notes.length - next.length;
    writeNotes(next);
    return removed;
  },

  async listNotebooks(): Promise<Notebook[]> {
    return withCounts(readNotebooks(), readNotes());
  },

  async createNotebook(name: string): Promise<Notebook> {
    const notebooks = readNotebooks();
    const nb: Notebook = {
      id: uid(),
      name: name.trim(),
      parentId: null,
      sortOrder: notebooks.length,
      count: 0,
    };
    notebooks.push(nb);
    writeNotebooks(notebooks);
    return nb;
  },

  async renameNotebook(id: string, name: string): Promise<Notebook> {
    const notebooks = readNotebooks();
    const idx = notebooks.findIndex((n) => n.id === id);
    if (idx < 0) throw new Error(`not found: ${id}`);
    notebooks[idx] = { ...notebooks[idx], name: name.trim() };
    writeNotebooks(notebooks);
    return withCounts(notebooks, readNotes())[idx];
  },

  async deleteNotebook(id: string): Promise<void> {
    writeNotebooks(readNotebooks().filter((n) => n.id !== id));
    writeNotes(
      readNotes().map((n) => (n.notebookId === id ? { ...n, notebookId: null } : n)),
    );
  },

  async listTags(): Promise<TagCount[]> {
    return collectTags(readNotes());
  },

  async getSettings(): Promise<AppSettings> {
    return this.getSettingsSync();
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  },

  async getDbPath(): Promise<string> {
    return "localStorage://inknote";
  },

  async updateNoteFields(id: string, patch: Partial<Note>): Promise<Note> {
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx < 0) throw new Error(`not found: ${id}`);
    notes[idx] = { ...notes[idx], ...patch, updatedAt: now() };
    writeNotes(notes);
    return notes[idx];
  },

  async exportJson(): Promise<TransferResult> {
    const payload = {
      version: 1,
      exportedAt: now(),
      notes: readNotes().filter((n) => !n.deletedAt),
      notebooks: readNotebooks(),
      settings: this.getSettingsSync(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inknote-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return {
      exported: payload.notes.length,
      imported: 0,
      path: a.download,
      message: `已导出 ${payload.notes.length} 篇笔记（JSON）`,
    };
  },

  async importJson(): Promise<TransferResult> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error("未选择文件"));
          return;
        }
        try {
          const text = await file.text();
          const data = JSON.parse(text) as {
            notes?: Note[];
            notebooks?: Notebook[];
            settings?: AppSettings;
          };
          if (data.notebooks?.length) writeNotebooks(data.notebooks);
          if (data.notes?.length) {
            const existing = readNotes();
            const map = new Map(existing.map((n) => [n.id, n]));
            for (const n of data.notes) map.set(n.id, n);
            writeNotes(Array.from(map.values()));
          }
          if (data.settings) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
          }
          resolve({
            exported: 0,
            imported: data.notes?.length ?? 0,
            path: file.name,
            message: `已导入 ${data.notes?.length ?? 0} 篇笔记`,
          });
        } catch (e) {
          reject(e);
        }
      };
      input.click();
    });
  },
};
