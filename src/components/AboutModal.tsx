import { X } from "lucide-react";
import type { AppInfo } from "../types/note";
import { AppLogo } from "./AppLogo";

interface AboutModalProps {
  open: boolean;
  info: AppInfo | null;
  onClose: () => void;
}

const SHORTCUTS = [
  ["Ctrl+K", "命令面板 / 搜索"],
  ["Ctrl+N", "新建笔记"],
  ["Ctrl+S", "立即保存"],
  ["Ctrl+/", "编辑 / 预览 / 分栏"],
  ["Esc", "关闭弹层"],
];

export function AboutModal({ open, info, onClose }: AboutModalProps) {
  if (!open) return null;

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="关于 InkNote"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="overlay-panel w-full max-w-md rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">关于 InkNote</h2>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-4 text-sm">
          <div className="flex items-start gap-3">
            <AppLogo size={40} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-lg font-semibold">
                {info?.name ?? "InkNote"}{" "}
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  v{info?.version ?? "1.0.1"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                本地优先的 Windows Markdown 笔记工具。数据默认保存在本机 SQLite，
                不联网、不上云。支持导出 Markdown、备份恢复与便携模式。
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              快捷键
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]"
                >
                  <span>{desc}</span>
                  <kbd className="rounded border border-[var(--border)] bg-[var(--bg-app)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {info ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--code-bg)] px-3 py-2 text-[11px] break-all text-[var(--text-muted)]">
              模式 {info.mode}
              {info.portable ? " · portable" : ""}
              <br />
              {info.dbPath}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
