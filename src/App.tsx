import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notesApi } from "./api/notes";
import { AboutModal } from "./components/AboutModal";
import { CommandPalette } from "./components/CommandPalette";
import {
  ContextMenu,
  type ContextMenuItem,
  useDisableNativeContextMenu,
} from "./components/ContextMenu";
import { EditorPane } from "./components/EditorPane";
import { GroupDialog } from "./components/GroupDialog";
import { NoteList } from "./components/NoteList";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { useTheme } from "./hooks/useTheme";
import type {
  AppInfo,
  AppSettings,
  DataPaths,
  NavId,
  Note,
  Notebook,
  PreviewMode,
} from "./types/note";

interface MenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const defaultSettings: AppSettings = {
  theme: "dark",
  editorFontSize: 16,
  autoSaveMs: 1000,
  previewMode: "preview",
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashNotes, setTrashNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<Notebook[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [paths, setPaths] = useState<DataPaths | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavId>("all");
  const [listQuery, setListQuery] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("preview");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<MenuState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const draftRef = useRef<Note | null>(null);
  const dirtyRef = useRef(false);
  const persistRef = useRef<() => Promise<void>>(async () => undefined);

  const { mode, resolved, setMode, toggle } = useTheme(settings.theme);
  useDisableNativeContextMenu();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refreshMeta = useCallback(async () => {
    const [nbs, trash, all, favs, ungrouped, dataPaths, info] = await Promise.all([
      notesApi.listNotebooks(),
      notesApi.listNotes({ trashOnly: true }),
      notesApi.listNotes({}),
      notesApi.listNotes({ favoritesOnly: true }),
      notesApi.listNotes({ ungroupedOnly: true }),
      notesApi.getDataPaths(),
      notesApi.getAppInfo(),
    ]);
    setGroups(nbs);
    setTrashNotes(trash);
    setAllCount(all.length);
    setFavoriteCount(favs.length);
    setUngroupedCount(ungrouped.length);
    setPaths(dataPaths);
    setAppInfo(info);
  }, []);

  const loadNotesForNav = useCallback(async (nav: NavId, query = "") => {
    const filter =
      nav === "favorites"
        ? { favoritesOnly: true, query: query || null }
        : nav === "trash"
          ? { trashOnly: true, query: query || null }
          : nav === "ungrouped"
            ? { ungroupedOnly: true, query: query || null }
            : nav === "all"
              ? { query: query || null }
              : { notebookId: nav, query: query || null };

    const list = await notesApi.listNotes(filter);
    setNotes(list);
    return list;
  }, []);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await notesApi.bootstrap();
        if (cancelled) return;
        setNotes(boot.notes);
        setGroups(boot.notebooks);
        setSettings(boot.settings);
        setMode(boot.settings.theme);
        setPreviewMode((boot.settings.previewMode as PreviewMode) || "preview");
        setSelectedId(boot.notes[0]?.id ?? null);
        setAllCount(boot.notes.length);
        setFavoriteCount(boot.notes.filter((n) => n.isFavorite).length);
        setUngroupedCount(boot.notes.filter((n) => !n.notebookId).length);
        await refreshMeta();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setMode, refreshMeta]);

  useEffect(() => {
    if (loading) return;
    const t = window.setTimeout(() => {
      void loadNotesForNav(activeNav, listQuery);
    }, 200);
    return () => window.clearTimeout(t);
  }, [activeNav, listQuery, loading, loadNotesForNav]);

  const selectedNote = useMemo(() => {
    if (draftRef.current && draftRef.current.id === selectedId) {
      return draftRef.current;
    }
    return (
      notes.find((n) => n.id === selectedId) ??
      trashNotes.find((n) => n.id === selectedId) ??
      null
    );
  }, [notes, trashNotes, selectedId, dirty]);

  const listTitle = useMemo(() => {
    if (activeNav === "favorites") return "收藏";
    if (activeNav === "trash") return "回收站";
    if (activeNav === "ungrouped") return "未分组";
    const g = groups.find((n) => n.id === activeNav);
    return g?.name ?? "全部笔记";
  }, [activeNav, groups]);

  const persistDraft = useCallback(async () => {
    const draft = draftRef.current;
    if (!draft || !dirtyRef.current || draft.deletedAt) return;
    setSaving(true);
    try {
      const updated = await notesApi.updateNote({
        id: draft.id,
        title: draft.title,
        content: draft.content,
        tags: [],
        notebookId: draft.notebookId ?? undefined,
        clearNotebook: draft.notebookId == null ? undefined : undefined,
        isPinned: draft.isPinned,
        isFavorite: draft.isFavorite,
      });
      draftRef.current = updated;
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setDirty(false);
      dirtyRef.current = false;
      setSaved(true);
      await refreshMeta();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [refreshMeta]);

  useEffect(() => {
    persistRef.current = persistDraft;
  }, [persistDraft]);

  useEffect(() => {
    if (!dirty) return;
    const ms = settings.autoSaveMs || 1000;
    const timer = window.setTimeout(() => {
      void persistDraft();
    }, ms);
    return () => window.clearTimeout(timer);
  }, [dirty, selectedNote, settings.autoSaveMs, persistDraft]);

  // Flush draft on close-to-tray; do NOT destroy window (Rust hides it)
  useEffect(() => {
    if (!notesApi.isTauri()) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          // Must preventDefault on JS side too, otherwise window may still tear down
          event.preventDefault();
          try {
            await persistRef.current();
          } catch {
            // ignore save errors on hide
          }
        });
      } catch {
        // ignore
      }
    })();
    return () => unlisten?.();
  }, []);

  const patchDraft = useCallback(
    (patch: Partial<Note>) => {
      const base =
        draftRef.current?.id === selectedId
          ? draftRef.current
          : notes.find((n) => n.id === selectedId) ??
            trashNotes.find((n) => n.id === selectedId);
      if (!base || base.deletedAt) return;
      const next = {
        ...base,
        ...patch,
        updatedAt: Date.now(),
        preview:
          patch.content !== undefined
            ? patch.content
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("#"))
                .slice(0, 2)
                .join(" ")
                .slice(0, 80)
            : base.preview,
      };
      draftRef.current = next;
      setNotes((prev) => prev.map((n) => (n.id === next.id ? next : n)));
      setDirty(true);
      dirtyRef.current = true;
      setSaved(false);
    },
    [notes, trashNotes, selectedId],
  );

  /** Immediately persist group change (works in any view mode). */
  const changeGroup = useCallback(
    async (groupId: string | null) => {
      const base =
        draftRef.current?.id === selectedId
          ? draftRef.current
          : notes.find((n) => n.id === selectedId) ??
            trashNotes.find((n) => n.id === selectedId);
      if (!base || base.deletedAt) return;

      const next = { ...base, notebookId: groupId, updatedAt: Date.now() };
      draftRef.current = next;
      setNotes((prev) => prev.map((n) => (n.id === next.id ? next : n)));
      setSaving(true);
      try {
        const updated = await notesApi.updateNote({
          id: next.id,
          title: next.title,
          content: next.content,
          notebookId: groupId ?? undefined,
          clearNotebook: groupId === null,
          tags: [],
          isPinned: next.isPinned,
          isFavorite: next.isFavorite,
        });
        draftRef.current = updated;
        setDirty(false);
        dirtyRef.current = false;
        setSaved(true);

        const gName =
          groupId == null
            ? "未分组"
            : (groups.find((g) => g.id === groupId)?.name ?? "分组");
        showToast(`已移到「${gName}」`);

        // Follow the note into its new group view
        const targetNav: NavId = groupId ?? "ungrouped";
        if (
          activeNav !== "all" &&
          activeNav !== "favorites" &&
          activeNav !== "trash" &&
          activeNav !== targetNav
        ) {
          setActiveNav(targetNav);
          await loadNotesForNav(targetNav, listQuery);
        } else {
          await loadNotesForNav(activeNav, listQuery);
        }
        setSelectedId(updated.id);
        await refreshMeta();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [
      selectedId,
      notes,
      trashNotes,
      groups,
      activeNav,
      listQuery,
      loadNotesForNav,
      refreshMeta,
      showToast,
    ],
  );

  const openCtx = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const createNote = useCallback(async () => {
    await persistDraft();
    const groupId =
      activeNav !== "all" &&
      activeNav !== "favorites" &&
      activeNav !== "trash" &&
      activeNav !== "ungrouped"
        ? activeNav
        : null;
    const note = await notesApi.createNote({
      title: "无标题",
      notebookId: groupId,
      tags: [],
    });
    setActiveNav(groupId ?? "all");
    setListQuery("");
    const list = await loadNotesForNav(groupId ?? "all", "");
    setNotes(list);
    setSelectedId(note.id);
    draftRef.current = note;
    setPreviewMode("edit");
    setDirty(false);
    dirtyRef.current = false;
    setSaved(true);
    await refreshMeta();
  }, [activeNav, loadNotesForNav, persistDraft, refreshMeta]);

  const selectNote = useCallback(
    async (id: string) => {
      if (id === selectedId) return;
      await persistDraft();
      draftRef.current = null;
      setSelectedId(id);
      setDirty(false);
      dirtyRef.current = false;
      setSaved(true);
    },
    [persistDraft, selectedId],
  );

  const noteActions = useCallback(
    (note: Note): ContextMenuItem[] => {
      if (note.deletedAt) {
        return [
          {
            id: "restore",
            label: "恢复",
            onClick: () => {
              void notesApi.restoreNote(note.id).then(async () => {
                await loadNotesForNav(activeNav, listQuery);
                await refreshMeta();
                showToast("已恢复");
              });
            },
          },
          {
            id: "purge",
            label: "彻底删除",
            danger: true,
            onClick: () => {
              if (!window.confirm("彻底删除后不可恢复，确定吗？")) return;
              void notesApi.permanentDeleteNote(note.id).then(async () => {
                if (selectedId === note.id) {
                  draftRef.current = null;
                  setSelectedId(null);
                }
                await loadNotesForNav(activeNav, listQuery);
                await refreshMeta();
              });
            },
          },
        ];
      }

      const moveItems: ContextMenuItem[] = [
        {
          id: "g-none",
          label: note.notebookId ? "移到未分组" : "已在未分组",
          disabled: !note.notebookId,
          onClick: () => {
            void (async () => {
              setSelectedId(note.id);
              draftRef.current = note;
              await changeGroup(null);
            })();
          },
        },
        ...groups.map((g) => ({
          id: `g-${g.id}`,
          label: `移到「${g.name}」`,
          disabled: note.notebookId === g.id,
          onClick: () => {
            void (async () => {
              setSelectedId(note.id);
              draftRef.current = note;
              await changeGroup(g.id);
            })();
          },
        })),
      ];

      return [
        {
          id: "pin",
          label: note.isPinned ? "取消置顶" : "置顶",
          onClick: () => {
            void notesApi
              .updateNote({
                id: note.id,
                isPinned: !note.isPinned,
              })
              .then(async () => {
                await loadNotesForNav(activeNav, listQuery);
                await refreshMeta();
              });
          },
        },
        {
          id: "fav",
          label: note.isFavorite ? "取消收藏" : "收藏",
          onClick: () => {
            void notesApi
              .updateNote({
                id: note.id,
                isFavorite: !note.isFavorite,
              })
              .then(async () => {
                await loadNotesForNav(activeNav, listQuery);
                await refreshMeta();
              });
          },
        },
        { id: "sep1", label: "", separator: true },
        ...moveItems,
        { id: "sep2", label: "", separator: true },
        {
          id: "del",
          label: "移到回收站",
          danger: true,
          onClick: () => {
            void notesApi.softDeleteNote(note.id).then(async () => {
              if (selectedId === note.id) {
                draftRef.current = null;
                setSelectedId(null);
              }
              await loadNotesForNav(activeNav, listQuery);
              await refreshMeta();
              showToast("已移到回收站");
            });
          },
        },
      ];
    },
    [
      groups,
      activeNav,
      listQuery,
      selectedId,
      changeGroup,
      loadNotesForNav,
      refreshMeta,
      showToast,
    ],
  );

  const onNavChange = useCallback(
    async (nav: NavId) => {
      await persistDraft();
      draftRef.current = null;
      setActiveNav(nav);
      setListQuery("");
      const list = await loadNotesForNav(nav, "");
      setSelectedId(list[0]?.id ?? null);
      setDirty(false);
      dirtyRef.current = false;
      setSaved(true);
    },
    [loadNotesForNav, persistDraft],
  );

  const saveSettings = useCallback(
    async (next: AppSettings) => {
      const savedSettings = await notesApi.saveSettings(next);
      setSettings(savedSettings);
      setMode(savedSettings.theme);
      setPreviewMode((savedSettings.previewMode as PreviewMode) || "preview");
    },
    [setMode],
  );

  const runTransfer = useCallback(
    async (label: string, fn: () => Promise<{ message: string }>) => {
      setBusy(label);
      try {
        await persistDraft();
        const result = await fn();
        showToast(result.message);
        await loadNotesForNav(activeNav, listQuery);
        await refreshMeta();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [activeNav, listQuery, loadNotesForNav, persistDraft, refreshMeta, showToast],
  );

  const handleExport = useCallback(async () => {
    if (!notesApi.isTauri()) {
      await runTransfer("导出中…", () => notesApi.exportMarkdown());
      return;
    }
    const { open } = await import("@tauri-apps/plugin-dialog");
    const dir = await open({
      directory: true,
      multiple: false,
      title: "选择导出目录",
    });
    if (!dir || Array.isArray(dir)) return;
    await runTransfer("导出中…", () => notesApi.exportMarkdown(dir));
  }, [runTransfer]);

  const handleImport = useCallback(async () => {
    if (!notesApi.isTauri()) {
      await runTransfer("导入中…", () => notesApi.importMarkdown());
      return;
    }
    const { open } = await import("@tauri-apps/plugin-dialog");
    const dir = await open({
      directory: true,
      multiple: false,
      title: "选择含 Markdown 的目录",
    });
    if (!dir || Array.isArray(dir)) return;
    await runTransfer("导入中…", () => notesApi.importMarkdown(dir));
  }, [runTransfer]);

  const handleBackup = useCallback(async () => {
    if (!notesApi.isTauri()) {
      await runTransfer("备份中…", () => notesApi.backupDatabase());
      return;
    }
    const { save } = await import("@tauri-apps/plugin-dialog");
    const dest = await save({
      title: "备份数据库",
      defaultPath: `inknote-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: "SQLite", extensions: ["db"] }],
    });
    if (!dest) return;
    await runTransfer("备份中…", () => notesApi.backupDatabase(dest));
  }, [runTransfer]);

  const handleRestore = useCallback(async () => {
    if (!notesApi.isTauri()) {
      await runTransfer("恢复中…", () => notesApi.restoreDatabase());
      return;
    }
    if (!window.confirm("恢复将覆盖当前数据库，建议先备份。确定继续？")) return;
    const { open } = await import("@tauri-apps/plugin-dialog");
    const src = await open({
      multiple: false,
      title: "选择备份文件",
      filters: [{ name: "SQLite", extensions: ["db"] }],
    });
    if (!src || Array.isArray(src)) return;
    await runTransfer("恢复中…", () => notesApi.restoreDatabase(src));
    showToast("恢复完成，建议重启应用");
  }, [runTransfer, showToast]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (mod && key === "n") {
        e.preventDefault();
        void createNote();
      }
      if (mod && key === "s") {
        e.preventDefault();
        void persistDraft();
      }
      if (mod && key === "/") {
        e.preventDefault();
        setPreviewMode((m) =>
          m === "edit" ? "preview" : m === "preview" ? "split" : "edit",
        );
      }
      if (mod && key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      if (key === "escape") {
        setPaletteOpen(false);
        setSettingsOpen(false);
        setAboutOpen(false);
        if (!groupSubmitting) setGroupDialogOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createNote, persistDraft]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--bg-app)] text-sm text-[var(--text-muted)]">
        <div className="loading-shimmer h-10 w-10 rounded-xl" />
        <div className="anim-fade-up">正在加载 InkNote…</div>
      </div>
    );
  }

  return (
    <div
      className="anim-fade-in flex h-full flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]"
      onContextMenu={(e) => {
        // Blank chrome only: simple actions, no note ops
        if ((e.target as HTMLElement).closest("[data-has-ctx]")) return;
        openCtx(e, [
          {
            id: "new",
            label: "新建笔记",
            shortcut: "Ctrl+N",
            onClick: () => void createNote(),
          },
          {
            id: "new-group",
            label: "新建分组",
            onClick: () => {
              setGroupError(null);
              setGroupDialogOpen(true);
            },
          },
        ]);
      }}
    >
      <TitleBar />
      {error ? (
        <div className="toast-banner border-b border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-1.5 text-xs text-[var(--danger)]">
          {error}
          <button type="button" className="ml-3 underline" onClick={() => setError(null)}>
            关闭
          </button>
        </div>
      ) : null}
      {toast ? (
        <div className="toast-banner border-b border-[var(--border)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs text-[var(--accent)]">
          {toast}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[220px_300px_1fr] grid-rows-[minmax(0,1fr)] items-stretch">
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
        <Sidebar
          activeNav={activeNav}
          onNavChange={(id) => void onNavChange(id)}
          groups={groups}
          noteCount={allCount}
          favoriteCount={favoriteCount}
          ungroupedCount={ungroupedCount}
          trashCount={trashNotes.length}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onCreateGroup={() => {
            setGroupError(null);
            setGroupDialogOpen(true);
          }}
          onGroupContextMenu={(e, group) =>
            openCtx(e, [
              {
                id: "open-g",
                label: "查看分组",
                onClick: () => void onNavChange(group.id),
              },
              {
                id: "new-in-g",
                label: "在此新建笔记",
                onClick: () => {
                  void (async () => {
                    await persistDraft();
                    const note = await notesApi.createNote({
                      title: "无标题",
                      notebookId: group.id,
                      tags: [],
                    });
                    setActiveNav(group.id);
                    await loadNotesForNav(group.id, "");
                    setSelectedId(note.id);
                    draftRef.current = note;
                    setPreviewMode("edit");
                    await refreshMeta();
                    showToast("已新建笔记");
                  })();
                },
              },
              { id: "sep-g", label: "", separator: true },
              {
                id: "del-g",
                label: "删除分组",
                danger: true,
                onClick: () => {
                  if (
                    !window.confirm(
                      `删除分组「${group.name}」？组内笔记不会删除，会变为未分组。`,
                    )
                  ) {
                    return;
                  }
                  void notesApi.deleteNotebook(group.id).then(async () => {
                    if (activeNav === group.id) {
                      setActiveNav("all");
                      await loadNotesForNav("all", "");
                    }
                    await refreshMeta();
                    showToast("已删除分组");
                  });
                },
              },
            ])
          }
          onSidebarContextMenu={(e) =>
            openCtx(e, [
              {
                id: "new-note",
                label: "新建笔记",
                shortcut: "Ctrl+N",
                onClick: () => void createNote(),
              },
              {
                id: "new-group",
                label: "新建分组",
                onClick: () => {
                  setGroupError(null);
                  setGroupDialogOpen(true);
                },
              },
              {
                id: "search",
                label: "搜索",
                shortcut: "Ctrl+K",
                onClick: () => setPaletteOpen(true),
              },
            ])
          }
        />
        </div>
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
        <NoteList
          notes={notes}
          selectedId={selectedId}
          onSelect={(id) => void selectNote(id)}
          onCreate={() => void createNote()}
          title={listTitle}
          query={listQuery}
          onQueryChange={setListQuery}
          isTrash={activeNav === "trash"}
          onNoteContextMenu={(e, note) => openCtx(e, noteActions(note))}
          onListContextMenu={(e) =>
            openCtx(e, [
              {
                id: "new",
                label: "新建笔记",
                shortcut: "Ctrl+N",
                onClick: () => void createNote(),
              },
            ])
          }
          onEmptyTrash={() => {
            if (!window.confirm("确定清空回收站？此操作不可恢复。")) return;
            void notesApi.emptyTrash().then(async () => {
              draftRef.current = null;
              setSelectedId(null);
              await loadNotesForNav("trash");
              await refreshMeta();
              showToast("回收站已清空");
            });
          }}
          onRestore={(id) => {
            void notesApi.restoreNote(id).then(async () => {
              await loadNotesForNav("trash", listQuery);
              await refreshMeta();
              showToast("已恢复");
            });
          }}
          onPermanentDelete={(id) => {
            if (!window.confirm("彻底删除后不可恢复，确定吗？")) return;
            void notesApi.permanentDeleteNote(id).then(async () => {
              if (selectedId === id) {
                draftRef.current = null;
                setSelectedId(null);
              }
              await loadNotesForNav(activeNav, listQuery);
              await refreshMeta();
            });
          }}
        />
        </div>
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
        <EditorPane
          note={selectedNote}
          mode={previewMode}
          onModeChange={setPreviewMode}
          onChangeTitle={(title) => patchDraft({ title })}
          onChangeContent={(content) => patchDraft({ content })}
          onTogglePin={() =>
            selectedNote && patchDraft({ isPinned: !selectedNote.isPinned })
          }
          onToggleFavorite={() =>
            selectedNote && patchDraft({ isFavorite: !selectedNote.isFavorite })
          }
          onChangeGroup={(groupId) => void changeGroup(groupId)}
          onContextMenu={(e, zone) => {
            // Editor: only edit ops; Preview: only group/delete for current note
            if (zone === "editor") {
              openCtx(e, [
                {
                  id: "copy",
                  label: "复制",
                  shortcut: "Ctrl+C",
                  onClick: () => document.execCommand("copy"),
                },
                {
                  id: "cut",
                  label: "剪切",
                  shortcut: "Ctrl+X",
                  onClick: () => document.execCommand("cut"),
                },
                {
                  id: "paste",
                  label: "粘贴",
                  shortcut: "Ctrl+V",
                  onClick: () => document.execCommand("paste"),
                },
              ]);
              return;
            }
            if (selectedNote) openCtx(e, noteActions(selectedNote));
          }}
          onDelete={() => {
            if (!selectedNote) return;
            if (selectedNote.deletedAt) {
              if (!window.confirm("彻底删除后不可恢复，确定吗？")) return;
              void notesApi.permanentDeleteNote(selectedNote.id).then(async () => {
                draftRef.current = null;
                setSelectedId(null);
                await loadNotesForNav(activeNav, listQuery);
                await refreshMeta();
              });
              return;
            }
            void notesApi.softDeleteNote(selectedNote.id).then(async () => {
              draftRef.current = null;
              await loadNotesForNav(activeNav, listQuery);
              await refreshMeta();
              setSelectedId(null);
              showToast("已移到回收站");
            });
          }}
          onRestore={() => {
            if (!selectedNote) return;
            void notesApi.restoreNote(selectedNote.id).then(async () => {
              await loadNotesForNav("trash", listQuery);
              await refreshMeta();
              showToast("已恢复");
            });
          }}
          groups={groups}
          saved={saved}
          saving={saving}
          dark={resolved === "dark"}
          fontSize={settings.editorFontSize}
        />
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        notes={notes.filter((n) => !n.deletedAt)}
        onClose={() => setPaletteOpen(false)}
        onSelectNote={(id) => void selectNote(id)}
        onCreateNote={() => void createNote()}
        onToggleTheme={() => {
          const next = resolved === "dark" ? "light" : "dark";
          toggle();
          void saveSettings({ ...settings, theme: next });
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={{ ...settings, theme: mode }}
        paths={paths}
        appInfo={appInfo}
        busy={busy}
        onClose={() => setSettingsOpen(false)}
        onChange={(next) => void saveSettings(next)}
        onExport={() => void handleExport()}
        onImport={() => void handleImport()}
        onBackup={() => void handleBackup()}
        onRestore={() => void handleRestore()}
        onOpenDataDir={() => {
          void notesApi.openDataDir().catch((e) =>
            setError(e instanceof Error ? e.message : String(e)),
          );
        }}
        onEnablePortable={() => {
          if (
            !window.confirm(
              "将在程序目录创建 portable.flag 与 data/，下次启动使用便携数据目录。是否继续？",
            )
          ) {
            return;
          }
          void notesApi
            .enablePortableMode()
            .then(async (p) => {
              setPaths(p);
              showToast("已启用便携模式，请重启应用生效");
            })
            .catch((e) => setError(e instanceof Error ? e.message : String(e)));
        }}
        onAbout={() => {
          setSettingsOpen(false);
          setAboutOpen(true);
        }}
      />

      <AboutModal open={aboutOpen} info={appInfo} onClose={() => setAboutOpen(false)} />

      {ctxMenu ? (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      ) : null}

      <GroupDialog
        open={groupDialogOpen}
        submitting={groupSubmitting}
        error={groupError}
        onClose={() => {
          if (groupSubmitting) return;
          setGroupDialogOpen(false);
          setGroupError(null);
        }}
        onSubmit={(name) => {
          const exists = groups.some(
            (g) => g.name.trim().toLowerCase() === name.toLowerCase(),
          );
          if (exists) {
            setGroupError("已有同名分组");
            return;
          }
          setGroupSubmitting(true);
          setGroupError(null);
          void notesApi
            .createNotebook(name)
            .then(async (created) => {
              await refreshMeta();
              setGroupDialogOpen(false);
              showToast(`已创建分组「${created.name}」`);
              setActiveNav(created.id);
              const list = await loadNotesForNav(created.id, "");
              setSelectedId(list[0]?.id ?? null);
            })
            .catch((e) => {
              setGroupError(e instanceof Error ? e.message : String(e));
            })
            .finally(() => setGroupSubmitting(false));
        }}
      />
    </div>
  );
}
