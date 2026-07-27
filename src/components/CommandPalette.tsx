import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { formatNoteTime } from "../lib/format";
import type { Note } from "../types/note";

interface CommandPaletteProps {
  open: boolean;
  notes: Note[];
  onClose: () => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({
  open,
  notes,
  onClose,
  onSelectNote,
  onCreateNote,
  onToggleTheme,
  onOpenSettings,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes.slice(0, 6);
    return notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [notes, query]);

  const commands = useMemo(
    () => [
      { id: "cmd-new", label: "新建笔记", hint: "Ctrl+N", run: onCreateNote },
      { id: "cmd-theme", label: "切换主题", hint: "Theme", run: onToggleTheme },
      { id: "cmd-settings", label: "打开设置", hint: "Settings", run: onOpenSettings },
    ],
    [onCreateNote, onToggleTheme, onOpenSettings],
  );

  const items = useMemo(
    () => [
      ...filteredNotes.map((n) => ({
        id: n.id,
        label: n.title,
        hint: formatNoteTime(n.updatedAt),
        kind: "note" as const,
      })),
      ...commands.map((c) => ({
        id: c.id,
        label: c.label,
        hint: c.hint,
        kind: "command" as const,
        run: c.run,
      })),
    ],
    [filteredNotes, commands],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const runItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    if (item.kind === "note") onSelectNote(item.id);
    else item.run();
    onClose();
  };

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="overlay-panel w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3.5 text-[var(--text-muted)]">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runItem(activeIndex);
              }
            }}
            placeholder="搜索笔记、命令…"
            className="flex-1 border-none bg-transparent text-[15px] text-[var(--text-primary)] outline-none"
          />
          <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px]">
            Esc
          </kbd>
        </div>

        {filteredNotes.length > 0 ? (
          <>
            <div className="px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              笔记
            </div>
            {filteredNotes.map((note, index) => (
              <button
                key={note.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13.5px] text-[var(--text-primary)] transition-colors duration-150",
                  activeIndex === index && "bg-[var(--accent-muted)]",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(index)}
              >
                <span className="truncate">{note.title}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatNoteTime(note.updatedAt)}
                </span>
              </button>
            ))}
          </>
        ) : (
          <div className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
            没有匹配的笔记
          </div>
        )}

        <div className="px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
          命令
        </div>
        {commands.map((cmd, i) => {
          const index = filteredNotes.length + i;
          return (
            <button
              key={cmd.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13.5px] text-[var(--text-primary)]",
                activeIndex === index && "bg-[var(--accent-muted)]",
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runItem(index)}
            >
              <span>{cmd.label}</span>
              <span className="text-xs text-[var(--text-muted)]">{cmd.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
