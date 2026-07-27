import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { useMemo } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  dark?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  fontSize = 14,
  dark = true,
}: MarkdownEditorProps) {
  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          fontSize: `${fontSize}px`,
          height: "100%",
        },
        ".cm-scroller": {
          fontFamily: "var(--font-mono)",
          lineHeight: "1.65",
        },
        ".cm-content": {
          paddingBottom: "48px",
        },
        "&.cm-focused": {
          outline: "none",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          border: "none",
          color: "var(--text-muted)",
        },
      }),
    ],
    [fontSize],
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={dark ? oneDark : "light"}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
        autocompletion: false,
      }}
      onChange={onChange}
      className="h-full overflow-hidden rounded-md border border-[var(--border)]"
    />
  );
}
