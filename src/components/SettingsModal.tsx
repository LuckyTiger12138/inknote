import { FolderOpen, X } from "lucide-react";
import type { AppInfo, AppSettings, DataPaths, PreviewMode, ThemeMode } from "../types/note";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  paths: DataPaths | null;
  appInfo: AppInfo | null;
  busy?: string | null;
  onClose: () => void;
  onChange: (next: AppSettings) => void;
  onExport: () => void;
  onImport: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onOpenDataDir: () => void;
  onEnablePortable: () => void;
  onAbout: () => void;
}

export function SettingsModal({
  open,
  settings,
  paths,
  appInfo,
  busy,
  onClose,
  onChange,
  onExport,
  onImport,
  onBackup,
  onRestore,
  onOpenDataDir,
  onEnablePortable,
  onAbout,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="overlay-panel scroll-thin max-h-[85vh] w-full max-w-xl overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
          <h2 className="text-sm font-semibold">设置</h2>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6 p-4 text-sm">
          <Section title="外观与编辑">
            <Field label="主题">
              <select
                className="field"
                value={settings.theme}
                onChange={(e) =>
                  onChange({ ...settings, theme: e.target.value as ThemeMode })
                }
              >
                <option value="dark">深色</option>
                <option value="light">浅色</option>
                <option value="system">跟随系统</option>
              </select>
            </Field>

            <Field label="默认预览模式">
              <select
                className="field"
                value={settings.previewMode}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    previewMode: e.target.value as PreviewMode,
                  })
                }
              >
                <option value="edit">编辑</option>
                <option value="preview">预览</option>
                <option value="split">分栏</option>
              </select>
            </Field>

            <Field label={`编辑器字号（${settings.editorFontSize}px）`}>
              <input
                className="w-full accent-[var(--accent)]"
                type="range"
                min={12}
                max={22}
                value={settings.editorFontSize}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    editorFontSize: Number(e.target.value),
                  })
                }
              />
            </Field>

            <Field label={`自动保存（${settings.autoSaveMs} ms）`}>
              <input
                className="w-full accent-[var(--accent)]"
                type="range"
                min={400}
                max={3000}
                step={100}
                value={settings.autoSaveMs}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    autoSaveMs: Number(e.target.value),
                  })
                }
              />
            </Field>
          </Section>

          <Section title="数据与备份">
            <Field label="数据位置">
              <code className="mb-2 block break-all rounded-md border border-[var(--border)] bg-[var(--code-bg)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                {paths?.dbPath ?? "…"}
              </code>
              <div className="text-xs text-[var(--text-muted)]">
                模式：{paths?.mode ?? "…"}
                {paths?.portable ? " · 便携" : " · 标准安装"}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <ActionBtn onClick={onExport} disabled={!!busy}>
                导出 Markdown
              </ActionBtn>
              <ActionBtn onClick={onImport} disabled={!!busy}>
                导入 Markdown
              </ActionBtn>
              <ActionBtn onClick={onBackup} disabled={!!busy}>
                备份数据库
              </ActionBtn>
              <ActionBtn onClick={onRestore} disabled={!!busy}>
                恢复数据库
              </ActionBtn>
              <ActionBtn onClick={onOpenDataDir} disabled={!!busy}>
                <FolderOpen size={14} /> 打开数据目录
              </ActionBtn>
              <ActionBtn onClick={onEnablePortable} disabled={!!busy || !!paths?.portable}>
                启用便携模式
              </ActionBtn>
            </div>
            {busy ? (
              <div className="text-xs text-[var(--accent)]">{busy}</div>
            ) : null}
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              便携模式会在程序目录创建 <code>portable.flag</code> 与 <code>data/</code>
              ，之后数据存本地目录。恢复数据库后需重启应用。
            </p>
          </Section>

          <Section title="关于">
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <div className="font-medium text-[var(--text-primary)]">
                {appInfo?.name ?? "InkNote"} {appInfo?.version ?? "1.0.1"}
              </div>
              <div className="mt-1">本地优先 · 隐私默认 · Windows Markdown 笔记</div>
            </div>
            <ActionBtn onClick={onAbout}>查看关于与快捷键</ActionBtn>
          </Section>
        </div>
      </div>

      <style>{`
        .field {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--bg-app);
          color: var(--text-primary);
          border-radius: 6px;
          padding: 8px 10px;
          outline: none;
        }
        .field:focus {
          box-shadow: 0 0 0 2px var(--accent-muted);
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="ui-pressable inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--bg-app)] disabled:active:transform-none"
    >
      {children}
    </button>
  );
}
