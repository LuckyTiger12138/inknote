import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y, items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("wheel", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("wheel", onScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="anim-scale-in fixed z-[100] min-w-[180px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow)]"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
    >
      {items.map((item) =>
        item.separator ? (
          <div
            key={item.id}
            className="my-1 h-px bg-[var(--border)]"
            role="separator"
          />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={cn(
              "flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-[13px] transition-colors",
              item.danger
                ? "text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
              item.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? (
              <span className="text-[11px] text-[var(--text-muted)]">{item.shortcut}</span>
            ) : null}
          </button>
        ),
      )}
    </div>
  );
}

/** Disable browser/webview default context menu app-wide. */
export function useDisableNativeContextMenu() {
  useEffect(() => {
    const block = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);
}
