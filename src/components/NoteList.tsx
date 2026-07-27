import { ListFilter, Plus, Pin, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { formatNoteTime, groupLabel } from "../lib/format";
import type { Note } from "../types/note";

const ROW_HEIGHT = 88;
const GROUP_HEIGHT = 28;

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  title?: string;
  query: string;
  onQueryChange: (q: string) => void;
  isTrash?: boolean;
  onEmptyTrash?: () => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onNoteContextMenu?: (e: React.MouseEvent, note: Note) => void;
  onListContextMenu?: (e: React.MouseEvent) => void;
}

type FlatItem =
  | { type: "group"; label: string; key: string }
  | { type: "note"; note: Note; key: string };

export function NoteList({
  notes,
  selectedId,
  onSelect,
  onCreate,
  title = "全部笔记",
  query,
  onQueryChange,
  isTrash,
  onEmptyTrash,
  onRestore,
  onPermanentDelete,
  onNoteContextMenu,
  onListContextMenu,
}: NoteListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  const flat = useMemo(() => flattenNotes(notes), [notes]);
  const totalHeight = useMemo(
    () =>
      flat.reduce(
        (sum, item) => sum + (item.type === "group" ? GROUP_HEIGHT : ROW_HEIGHT),
        0,
      ),
    [flat],
  );

  const positions = useMemo(() => {
    const map = new Map<string, number>();
    let y = 0;
    for (const item of flat) {
      map.set(item.key, y);
      y += item.type === "group" ? GROUP_HEIGHT : ROW_HEIGHT;
    }
    return map;
  }, [flat]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const startY = Math.max(0, scrollTop - ROW_HEIGHT * 3);
  const endY = scrollTop + viewportH + ROW_HEIGHT * 3;
  const visible = flat.filter((item) => {
    const y = positions.get(item.key) ?? 0;
    const h = item.type === "group" ? GROUP_HEIGHT : ROW_HEIGHT;
    return y + h >= startY && y <= endY;
  });

  return (
    <section
      className="flex min-w-0 flex-col border-r border-[var(--border)] bg-[var(--bg-list)]"
      data-has-ctx
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border)] px-3.5">
        <h2 className="text-[13px] font-semibold">
          {title}
          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
            {notes.length}
          </span>
        </h2>
        <div className="flex gap-0.5">
          {isTrash ? (
            <IconButton label="清空回收站" onClick={onEmptyTrash}>
              <Trash2 size={15} />
            </IconButton>
          ) : (
            <>
              <IconButton label="按更新时间">
                <ListFilter size={16} />
              </IconButton>
              <IconButton label="新建笔记" onClick={onCreate}>
                <Plus size={16} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      <div className="border-b border-[var(--border)] px-3 py-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="筛选 / 全文搜索…"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:shadow-[0_0_0_2px_var(--accent-muted)]"
        />
      </div>

      <div
        ref={scrollerRef}
        className="scroll-auto-hide scroll-thin min-h-0 flex-1 overflow-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        onContextMenu={(e) => onListContextMenu?.(e)}
      >
        {flat.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-[var(--text-muted)]">
            {query ? "没有匹配结果" : isTrash ? "回收站为空" : "暂无笔记"}
            {!isTrash && !query ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onCreate}
                  className="rounded-md bg-[var(--accent-muted)] px-3 py-1.5 text-[var(--accent)] transition-colors hover:opacity-90"
                >
                  新建笔记
                </button>
              </div>
            ) : null}
            {query ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  className="text-[var(--accent)] hover:underline"
                >
                  清除筛选
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            {visible.map((item) => {
              const top = positions.get(item.key) ?? 0;
              if (item.type === "group") {
                return (
                  <div
                    key={item.key}
                    className="px-3.5 pt-3 pb-1 text-[11px] font-semibold text-[var(--text-muted)]"
                    style={{ position: "absolute", top, left: 0, right: 0, height: GROUP_HEIGHT }}
                  >
                    {item.label}
                  </div>
                );
              }
              const note = item.note;
              return (
                <div
                  key={item.key}
                  className="group"
                  style={{ position: "absolute", top, left: 0, right: 0, height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(note.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onNoteContextMenu?.(e, note);
                    }}
                    className={cn(
                      "note-row block h-full w-full border-l-2 border-transparent px-3.5 pt-2.5 pb-2 text-left",
                      selectedId === note.id && "is-selected",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      {note.isPinned ? (
                        <Pin size={12} className="text-[var(--accent)]" fill="currentColor" />
                      ) : null}
                      <span className="truncate text-[13.5px] font-semibold text-[var(--text-primary)]">
                        {note.title || "无标题"}
                      </span>
                    </div>
                    <div className="mb-2 truncate text-[12.5px] text-[var(--text-secondary)]">
                      {note.preview || "…"}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                        {formatNoteTime(note.updatedAt)}
                      </span>
                    </div>
                  </button>
                  {isTrash ? (
                    <div className="absolute top-2 right-2 hidden gap-1 group-hover:flex">
                      <MiniBtn label="恢复" onClick={() => onRestore?.(note.id)}>
                        <RotateCcw size={12} />
                      </MiniBtn>
                      <MiniBtn
                        label="彻底删除"
                        onClick={() => onPermanentDelete?.(note.id)}
                      >
                        <Trash2 size={12} />
                      </MiniBtn>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}

function MiniBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}

function flattenNotes(notes: Note[]): FlatItem[] {
  const items: FlatItem[] = [];
  let last = "";
  for (const note of notes) {
    const label = groupLabel(note.updatedAt);
    if (label !== last) {
      items.push({ type: "group", label, key: `g-${label}-${note.id}` });
      last = label;
    }
    items.push({ type: "note", note, key: `n-${note.id}` });
  }
  return items;
}
