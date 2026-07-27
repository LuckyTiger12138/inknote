import {
  Bold,
  Italic,
  Heading,
  List,
  Code2,
  Pin,
  Bookmark,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "../lib/cn";
import { countWords, formatNoteTime } from "../lib/format";
import { renderMarkdown } from "../lib/markdown";
import type { Note, Notebook, PreviewMode } from "../types/note";
import { MarkdownEditor } from "./MarkdownEditor";

interface EditorPaneProps {
  note: Note | null;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: string) => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onChangeGroup: (groupId: string | null) => void;
  onDelete: () => void;
  onRestore: () => void;
  onContextMenu?: (e: React.MouseEvent, zone: "editor" | "preview") => void;
  groups: Notebook[];
  saved: boolean;
  saving: boolean;
  dark: boolean;
  fontSize: number;
}

export function EditorPane({
  note,
  mode,
  onModeChange,
  onChangeTitle,
  onChangeContent,
  onTogglePin,
  onToggleFavorite,
  onChangeGroup,
  onDelete,
  onRestore,
  onContextMenu,
  groups,
  saved,
  saving,
  dark,
  fontSize,
}: EditorPaneProps) {
  const html = useMemo(
    () => (note ? renderMarkdown(note.content) : ""),
    [note?.content, note?.id],
  );

  if (!note) {
    return (
      <section className="flex min-w-0 flex-1 flex-col bg-[var(--bg-editor)]">
        <div className="anim-fade-up flex flex-1 flex-col items-center justify-center gap-2 text-[13px] text-[var(--text-muted)]">
          <div className="mb-1 h-10 w-10 rounded-xl bg-[var(--accent-muted)] shadow-[inset_0_0_0_1px_var(--border)]" />
          <div className="font-medium text-[var(--text-secondary)]">还没有打开笔记</div>
          <div>选择左侧列表，或按 Ctrl+N 新建</div>
        </div>
      </section>
    );
  }

  const words = countWords(note.content);
  const showSource = mode === "edit" || mode === "split";
  const showPreview = mode === "preview" || mode === "split";
  const inTrash = Boolean(note.deletedAt);
  const groupName =
    groups.find((g) => g.id === note.notebookId)?.name ?? null;

  const wrapSelection = (prefix: string, suffix = prefix) => {
    onChangeContent(`${note.content}${prefix}文本${suffix}`);
  };

  return (
    <section
      className="anim-fade-in flex min-w-0 flex-1 flex-col bg-[var(--bg-editor)]"
      key={note.id}
      data-has-ctx
    >
      {/* Always-visible meta bar: group switch works in any mode */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border)] px-3">
        {!inTrash ? (
          <>
            <ToolBtn label="加粗" onClick={() => wrapSelection("**")}>
              <Bold size={15} />
            </ToolBtn>
            <ToolBtn label="斜体" onClick={() => wrapSelection("*")}>
              <Italic size={15} />
            </ToolBtn>
            <ToolBtn
              label="标题"
              onClick={() => onChangeContent(`${note.content}\n## 标题\n`)}
            >
              <Heading size={15} />
            </ToolBtn>
            <ToolBtn
              label="列表"
              onClick={() => onChangeContent(`${note.content}\n- 列表项\n`)}
            >
              <List size={15} />
            </ToolBtn>
            <ToolBtn label="代码" onClick={() => wrapSelection("`")}>
              <Code2 size={15} />
            </ToolBtn>
            <span className="mx-1 h-[18px] w-px bg-[var(--border)]" />
            <ToolBtn label="置顶" active={note.isPinned} onClick={onTogglePin}>
              <Pin size={15} />
            </ToolBtn>
            <ToolBtn
              label="收藏"
              active={note.isFavorite}
              onClick={onToggleFavorite}
            >
              <Bookmark size={15} />
            </ToolBtn>
            <ToolBtn label="删除" onClick={onDelete}>
              <Trash2 size={15} />
            </ToolBtn>
          </>
        ) : (
          <>
            <ToolBtn label="恢复" onClick={onRestore}>
              <RotateCcw size={15} />
            </ToolBtn>
            <ToolBtn label="彻底删除" onClick={onDelete}>
              <Trash2 size={15} />
            </ToolBtn>
          </>
        )}

        <label className="ml-2 hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:inline-flex">
          <span>分组</span>
          <select
            className="no-drag max-w-[140px] rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[var(--text-secondary)] outline-none transition-colors focus:shadow-[0_0_0_2px_var(--accent-muted)] disabled:opacity-60"
            value={note.notebookId ?? ""}
            onChange={(e) =>
              onChangeGroup(e.target.value ? e.target.value : null)
            }
            disabled={inTrash}
            aria-label="选择分组"
          >
            <option value="">未分组</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5">
          {(["edit", "preview", "split"] as PreviewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                "mode-chip rounded px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]",
                mode === m && "is-active",
              )}
            >
              {m === "edit" ? "编辑" : m === "preview" ? "预览" : "分栏"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          mode === "split" ? "grid grid-cols-2" : "flex flex-col",
        )}
      >
        {showSource ? (
          <div
            className={cn(
              "flex min-h-0 flex-col",
              mode === "split"
                ? "border-r border-[var(--border)] bg-[var(--bg-list)]"
                : "flex-1",
            )}
            onContextMenu={(e) => onContextMenu?.(e, "editor")}
          >
            <div className="space-y-2 px-6 pt-5 pb-2">
              <input
                className="w-full rounded border-none bg-transparent text-[28px] font-bold text-[var(--text-primary)] outline-none focus:shadow-[0_0_0_2px_var(--accent-muted)] disabled:opacity-70"
                value={note.title}
                onChange={(e) => onChangeTitle(e.target.value)}
                placeholder="无标题"
                aria-label="笔记标题"
                disabled={inTrash}
              />
              {/* Mobile / compact: group also under title */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] sm:hidden">
                <span>分组</span>
                <select
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[var(--text-secondary)] outline-none disabled:opacity-60"
                  value={note.notebookId ?? ""}
                  onChange={(e) =>
                    onChangeGroup(e.target.value ? e.target.value : null)
                  }
                  disabled={inTrash}
                >
                  <option value="">未分组</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="min-h-0 flex-1 px-4 pb-4">
              {inTrash ? (
                <pre className="scroll-thin h-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--code-bg)] p-3 font-mono text-sm leading-[1.65] whitespace-pre-wrap text-[var(--text-secondary)]">
                  {note.content}
                </pre>
              ) : (
                <MarkdownEditor
                  value={note.content}
                  onChange={onChangeContent}
                  fontSize={fontSize}
                  dark={dark}
                />
              )}
            </div>
          </div>
        ) : null}

        {showPreview ? (
          <div
            className={cn(
              "scroll-auto-hide scroll-thin min-h-0 overflow-auto",
              mode === "split"
                ? "p-7"
                : "mx-auto w-full max-w-[760px] flex-1 px-10 py-7",
            )}
            onContextMenu={(e) => onContextMenu?.(e, "preview")}
          >
            {mode === "preview" ? (
              <>
                <h1 className="mb-2 text-[28px] font-bold leading-tight">
                  {note.title || "无标题"}
                </h1>
                <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-4 text-xs text-[var(--text-muted)]">
                  {groupName ? (
                    <span className="rounded-full bg-[var(--tag-bg)] px-1.5 py-0.5 font-medium text-[var(--tag-text)]">
                      {groupName}
                    </span>
                  ) : (
                    <span>未分组</span>
                  )}
                  <span>更新于 {formatNoteTime(note.updatedAt)}</span>
                </div>
              </>
            ) : null}
            <div
              className="md-preview"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        ) : null}
      </div>

      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)] px-3.5 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center">
          <i
            className={cn(
              "status-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
              saving
                ? "bg-[var(--warning)]"
                : saved
                  ? "is-idle bg-[var(--success)]"
                  : "bg-[var(--warning)]",
            )}
          />
          {saving ? "保存中…" : saved ? "已保存" : "未保存"}
        </span>
        <span className="tabular-nums">{words.toLocaleString()} 字</span>
        <span className="ml-auto">
          Markdown · {inTrash ? "回收站" : "本地存储"}
        </span>
      </footer>
    </section>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "ui-pressable inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        active &&
          "bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent-muted)]",
      )}
    >
      {children}
    </button>
  );
}
