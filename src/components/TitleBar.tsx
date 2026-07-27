import { Minus, Square, X } from "lucide-react";
import { useMemo } from "react";
import { notesApi } from "../api/notes";
import { AppLogo } from "./AppLogo";

export function TitleBar() {
  const inTauri = useMemo(() => notesApi.isTauri(), []);

  const withWindow = async (
    fn: (win: {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<void>;
      close: () => Promise<void>;
      hide: () => Promise<void>;
      setFocus: () => Promise<void>;
      show: () => Promise<void>;
      unminimize: () => Promise<void>;
    }) => Promise<void>,
  ) => {
    if (!inTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await fn(getCurrentWindow());
    } catch (err) {
      console.error("window control failed", err);
    }
  };

  return (
    <header className="titlebar flex h-10 shrink-0 items-center border-b border-[var(--border)] bg-[var(--titlebar)]">
      {/* Only this region is draggable — never put drag on the whole bar or buttons break */}
      <div
        className="flex min-w-0 flex-1 items-center gap-2.5 self-stretch pl-3 text-xs font-medium text-[var(--text-secondary)]"
        data-tauri-drag-region
      >
        <span className="logo-wrap pointer-events-none inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-[5px]">
          <AppLogo size={20} />
        </span>
        <span
          className="pointer-events-none select-none text-[13px] font-semibold tracking-tight text-[var(--text-primary)]"
          data-tauri-drag-region
        >
          InkNote
        </span>
        <span
          className="pointer-events-none select-none rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
          data-tauri-drag-region
          title="关闭按钮会隐藏到托盘，右键托盘可退出"
        >
          v1.0.1
        </span>
        {!inTauri ? (
          <span className="pointer-events-none rounded-full bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
            Web
          </span>
        ) : null}
      </div>

      <div className="no-drag flex h-full shrink-0">
        <ChromeBtn
          label="最小化"
          onClick={() =>
            void withWindow(async (w) => {
              await w.minimize();
            })
          }
        >
          <Minus size={14} strokeWidth={1.75} />
        </ChromeBtn>
        <ChromeBtn
          label="最大化"
          onClick={() =>
            void withWindow(async (w) => {
              await w.toggleMaximize();
            })
          }
        >
          <Square size={11} strokeWidth={1.75} />
        </ChromeBtn>
        <ChromeBtn
          label="关闭到托盘"
          danger
          onClick={() =>
            void withWindow(async (w) => {
              // Hide to tray (do not destroy / quit)
              await w.hide();
            })
          }
        >
          <X size={14} strokeWidth={1.75} />
        </ChromeBtn>
      </div>
    </header>
  );
}

function ChromeBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        danger
          ? "chrome-btn chrome-btn-close no-drag flex h-full w-12 items-center justify-center text-[var(--text-secondary)]"
          : "chrome-btn no-drag flex h-full w-12 items-center justify-center text-[var(--text-secondary)]"
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => {
        // Prevent drag-region from swallowing the click
        e.stopPropagation();
      }}
      aria-label={label}
    >
      {children}
    </button>
  );
}
