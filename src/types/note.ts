export type PreviewMode = "edit" | "preview" | "split";
export type ThemeMode = "dark" | "light" | "system";
export type NavId = "all" | "favorites" | "ungrouped" | "trash" | string;

export interface Note {
  id: string;
  title: string;
  content: string;
  preview: string;
  tags: string[];
  notebookId?: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface Notebook {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
  count: number;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface AppSettings {
  theme: ThemeMode | string;
  editorFontSize: number;
  autoSaveMs: number;
  previewMode: PreviewMode | string;
}

export interface NoteFilter {
  notebookId?: string | null;
  tag?: string | null;
  favoritesOnly?: boolean;
  trashOnly?: boolean;
  ungroupedOnly?: boolean;
  query?: string | null;
}

export interface CreateNoteInput {
  title?: string;
  content?: string;
  notebookId?: string | null;
  tags?: string[];
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  notebookId?: string | null;
  /** true = clear group (ungrouped) */
  clearNotebook?: boolean;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface AppBootstrap {
  notes: Note[];
  notebooks: Notebook[];
  tags: TagCount[];
  settings: AppSettings;
}

export interface TransferResult {
  exported: number;
  imported: number;
  path: string;
  message: string;
}

export interface DataPaths {
  dataDir: string;
  dbPath: string;
  portable: boolean;
  mode: string;
}

export interface AppInfo {
  name: string;
  version: string;
  portable: boolean;
  mode: string;
  dbPath: string;
  dataDir: string;
}

export interface NavItem {
  id: NavId;
  label: string;
  count?: number;
}
