import { Layers, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

interface GroupDialogProps {
  open: boolean;
  title?: string;
  confirmLabel?: string;
  initialName?: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function GroupDialog({
  open,
  title = "新建分组",
  confirmLabel = "创建",
  initialName = "",
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}: GroupDialogProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(t);
  }, [open, initialName]);

  if (!open) return null;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${inputId}-title`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="overlay-panel w-full max-w-[400px] overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
            <Layers size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={`${inputId}-title`}
              className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
              用分组整理笔记，例如「工作」「学习」「灵感」。
            </p>
          </div>
          <button
            type="button"
            className="ui-pressable -mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            disabled={submitting}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <label htmlFor={inputId} className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              分组名称
            </span>
            <input
              ref={inputRef}
              id={inputId}
              value={name}
              maxLength={40}
              placeholder="例如：工作"
              disabled={submitting}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  if (!submitting) onClose();
                }
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-muted)] focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] focus:shadow-[0_0_0_3px_var(--accent-muted)] disabled:opacity-60"
            />
          </label>

          <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
            <span>{trimmed.length}/40</span>
            {error ? <span className="text-[var(--danger)]">{error}</span> : <span />}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-sidebar)_65%,transparent)] px-4 py-3">
          <button
            type="button"
            className="ui-pressable rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="button"
            className="ui-pressable rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(91,141,239,0.28)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:brightness-100"
            onClick={submit}
            disabled={!canSubmit}
          >
            {submitting ? "创建中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
