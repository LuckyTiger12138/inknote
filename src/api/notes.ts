import { invoke } from "@tauri-apps/api/core";
import type {
  AppBootstrap,
  AppInfo,
  AppSettings,
  CreateNoteInput,
  DataPaths,
  Note,
  NoteFilter,
  Notebook,
  TagCount,
  TransferResult,
  UpdateNoteInput,
} from "../types/note";
import { localApi } from "./storage";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error("not tauri");
  }
  return invoke<T>(cmd, args);
}

export const notesApi = {
  isTauri,

  async bootstrap(): Promise<AppBootstrap> {
    if (!isTauri()) return localApi.bootstrap();
    return call<AppBootstrap>("bootstrap");
  },

  async listNotes(filter: NoteFilter = {}): Promise<Note[]> {
    const normalized: NoteFilter = {
      notebookId: filter.notebookId ?? null,
      tag: filter.tag ?? null,
      favoritesOnly: filter.favoritesOnly ?? false,
      trashOnly: filter.trashOnly ?? false,
      ungroupedOnly: filter.ungroupedOnly ?? false,
      query: filter.query ?? null,
    };
    if (!isTauri()) return localApi.listNotes(normalized);
    return call<Note[]>("list_notes", { filter: normalized });
  },

  async getNote(id: string): Promise<Note> {
    if (!isTauri()) return localApi.getNote(id);
    return call<Note>("get_note", { id });
  },

  async createNote(input: CreateNoteInput = {}): Promise<Note> {
    if (!isTauri()) return localApi.createNote(input);
    return call<Note>("create_note", { input });
  },

  async updateNote(input: UpdateNoteInput): Promise<Note> {
    if (!isTauri()) return localApi.updateNote(input);
    return call<Note>("update_note", { input });
  },

  async softDeleteNote(id: string): Promise<Note> {
    if (!isTauri()) return localApi.softDeleteNote(id);
    return call<Note>("soft_delete_note", { id });
  },

  async restoreNote(id: string): Promise<Note> {
    if (!isTauri()) return localApi.restoreNote(id);
    return call<Note>("restore_note", { id });
  },

  async permanentDeleteNote(id: string): Promise<void> {
    if (!isTauri()) return localApi.permanentDeleteNote(id);
    return call<void>("permanent_delete_note", { id });
  },

  async emptyTrash(): Promise<number> {
    if (!isTauri()) return localApi.emptyTrash();
    return call<number>("empty_trash");
  },

  async listNotebooks(): Promise<Notebook[]> {
    if (!isTauri()) return localApi.listNotebooks();
    return call<Notebook[]>("list_notebooks");
  },

  async createNotebook(name: string): Promise<Notebook> {
    if (!isTauri()) return localApi.createNotebook(name);
    return call<Notebook>("create_notebook", { input: { name } });
  },

  async renameNotebook(id: string, name: string): Promise<Notebook> {
    if (!isTauri()) return localApi.renameNotebook(id, name);
    return call<Notebook>("rename_notebook", { id, name });
  },

  async deleteNotebook(id: string): Promise<void> {
    if (!isTauri()) return localApi.deleteNotebook(id);
    return call<void>("delete_notebook", { id });
  },

  async listTags(): Promise<TagCount[]> {
    if (!isTauri()) return localApi.listTags();
    return call<TagCount[]>("list_tags");
  },

  async getSettings(): Promise<AppSettings> {
    if (!isTauri()) return localApi.getSettings();
    return call<AppSettings>("get_settings");
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    if (!isTauri()) return localApi.saveSettings(settings);
    return call<AppSettings>("save_settings", { settings });
  },

  async getDbPath(): Promise<string> {
    if (!isTauri()) return localApi.getDbPath();
    return call<string>("get_db_path");
  },

  async getDataPaths(): Promise<DataPaths> {
    if (!isTauri()) {
      return {
        dataDir: "localStorage",
        dbPath: "localStorage://inknote",
        portable: false,
        mode: "web",
      };
    }
    return call<DataPaths>("get_data_paths");
  },

  async getAppInfo(): Promise<AppInfo> {
    if (!isTauri()) {
      return {
        name: "InkNote",
        version: "1.0.1-web",
        portable: false,
        mode: "web",
        dbPath: "localStorage://inknote",
        dataDir: "localStorage",
      };
    }
    return call<AppInfo>("get_app_info");
  },

  async exportMarkdown(dir?: string): Promise<TransferResult> {
    if (!isTauri()) return localApi.exportJson();
    if (!dir) throw new Error("export dir required");
    return call<TransferResult>("export_markdown", { dir });
  },

  async importMarkdown(dir?: string): Promise<TransferResult> {
    if (!isTauri()) return localApi.importJson();
    if (!dir) throw new Error("import dir required");
    return call<TransferResult>("import_markdown", { dir });
  },

  async backupDatabase(dest?: string): Promise<TransferResult> {
    if (!isTauri()) return localApi.exportJson();
    if (!dest) throw new Error("backup path required");
    return call<TransferResult>("backup_database", { dest });
  },

  async restoreDatabase(src?: string): Promise<TransferResult> {
    if (!isTauri()) return localApi.importJson();
    if (!src) throw new Error("restore path required");
    return call<TransferResult>("restore_database", { src });
  },

  async enablePortableMode(): Promise<DataPaths> {
    if (!isTauri()) throw new Error("仅桌面端支持便携模式");
    return call<DataPaths>("enable_portable_mode");
  },

  async openDataDir(): Promise<void> {
    if (!isTauri()) throw new Error("仅桌面端支持");
    return call<void>("open_data_dir");
  },
};
