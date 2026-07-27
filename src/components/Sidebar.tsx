import {
  FilePenLine,
  Bookmark,
  Layers,
  Inbox,
  Trash2,
  Settings,
  Search,
  Plus,
} from "lucide-react";
import { cn } from "../lib/cn";
import type { NavId, Notebook } from "../types/note";

/** Fixed height of bottom dock (trash + settings + padding + border) */
const FOOTER_H = 88;

interface SidebarProps {
  activeNav: NavId;
  onNavChange: (id: NavId) => void;
  groups: Notebook[];
  noteCount: number;
  favoriteCount: number;
  ungroupedCount: number;
  trashCount: number;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  onCreateGroup: () => void;
  onGroupContextMenu?: (e: React.MouseEvent, group: Notebook) => void;
  onSidebarContextMenu?: (e: React.MouseEvent) => void;
}

export function Sidebar({
  activeNav,
  onNavChange,
  groups,
  noteCount,
  favoriteCount,
  ungroupedCount,
  trashCount,
  onOpenPalette,
  onOpenSettings,
  onCreateGroup,
  onGroupContextMenu,
  onSidebarContextMenu,
}: SidebarProps) {
  return (
    <aside
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-sidebar)]"
      data-has-ctx
      onContextMenu={(e) => onSidebarContextMenu?.(e)}
    >
      {/* ===== scrollable body (leaves room for absolute footer) ===== */}
      <div
        className="sidebar-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
        style={{ paddingBottom: FOOTER_H }}
      >
        <div className="p-3">
          <button
            type="button"
            onClick={onOpenPalette}
            className="search-trigger flex w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 text-left text-[13px] text-[var(--text-muted)]"
          >
            <Search size={14} className="opacity-80" />
            <span className="flex-1">搜索笔记...</span>
            <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-2" aria-label="主导航">
          <NavButton
            active={activeNav === "all"}
            onClick={() => onNavChange("all")}
            icon={<FilePenLine size={16} />}
            label="全部笔记"
            count={noteCount}
          />
          <NavButton
            active={activeNav === "favorites"}
            onClick={() => onNavChange("favorites")}
            icon={<Bookmark size={16} />}
            label="收藏"
            count={favoriteCount}
          />
          <NavButton
            active={activeNav === "ungrouped"}
            onClick={() => onNavChange("ungrouped")}
            icon={<Inbox size={16} />}
            label="未分组"
            count={ungroupedCount}
          />
        </nav>

        <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
          <span className="text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
            分组
          </span>
          <button
            type="button"
            className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            title="新建分组"
            aria-label="新建分组"
            onClick={onCreateGroup}
          >
            <Plus size={14} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 pb-2" aria-label="分组">
          {groups.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-[var(--text-muted)]">暂无分组</div>
          ) : (
            groups.map((g) => (
              <NavButton
                key={g.id}
                active={activeNav === g.id}
                onClick={() => onNavChange(g.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onGroupContextMenu?.(e, g);
                }}
                icon={<Layers size={16} />}
                label={g.name}
                count={g.count}
              />
            ))
          )}
        </nav>
      </div>

      {/* ===== absolute footer: NEVER moves with content ===== */}
      <div
        className="pointer-events-auto absolute right-0 bottom-0 left-0 z-20 border-t border-[var(--border)] bg-[var(--bg-sidebar)] p-2 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
        style={{ height: FOOTER_H }}
      >
        <nav className="flex h-full flex-col justify-center gap-0.5" aria-label="底部">
          <NavButton
            active={activeNav === "trash"}
            onClick={() => onNavChange("trash")}
            icon={<Trash2 size={16} />}
            label="回收站"
            count={trashCount}
          />
          <NavButton
            active={false}
            onClick={onOpenSettings}
            icon={<Settings size={16} />}
            label="设置"
          />
        </nav>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  onClick,
  onContextMenu,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "nav-item-btn relative flex h-9 w-full shrink-0 items-center gap-2.5 rounded-md px-2.5 text-left text-[var(--text-secondary)]",
        active && "active-indicator bg-[var(--accent-muted)] text-[var(--text-primary)]",
      )}
    >
      {active ? (
        <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
      ) : null}
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center opacity-80",
          active && "opacity-100",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
      <span className="w-8 shrink-0 text-right text-xs text-[var(--text-muted)] tabular-nums">
        {typeof count === "number" ? count : ""}
      </span>
    </button>
  );
}
