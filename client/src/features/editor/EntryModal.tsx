import { useState } from "react";
import { format } from "date-fns";
import { FiCheck, FiX } from "react-icons/fi";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import type { Dream, Mood } from "../../domain/dreams";
import { isoDate, moodKeys, moodMeta } from "../../domain/dreams";
import getStyle from "../../styles/getStyle";
import { escapeHtml, sanitizeRichHtml } from "../../utils/richText";

function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string, text: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false, horizontalRule: false, strike: false }),
      Placeholder.configure({ placeholder: "I remember…" }),
      CharacterCount.configure({ limit: 6000 }),
    ],
    content: sanitizeRichHtml(initialHtml),
    editorProps: {
      attributes: {
        "aria-label": "Dream entry",
        "aria-multiline": "true",
        role: "textbox",
      },
      handlePaste: (_view, event) =>
        Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/")),
      handleDrop: (_view, event) =>
        Array.from(event.dataTransfer?.files || []).some((file) => file.type.startsWith("image/")),
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeRichHtml(currentEditor.getHTML()), currentEditor.getText());
    },
  });
  const activeFormats = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") || false,
      italic: currentEditor?.isActive("italic") || false,
      underline: currentEditor?.isActive("underline") || false,
      bulletList: currentEditor?.isActive("bulletList") || false,
      orderedList: currentEditor?.isActive("orderedList") || false,
      blockquote: currentEditor?.isActive("blockquote") || false,
    }),
  });
  const tool = (label: string, title: string, active: boolean, run: () => void) => (
    <button
      type="button"
      className={active ? "active" : ""}
      aria-pressed={active}
      title={title}
      aria-label={title}
      disabled={!editor}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        run();
      }}
    >{label}</button>
  );
  return (
    <div className="rich-editor-shell">
      <div className="rich-toolbar" aria-label="Text formatting">
        {tool("B", "Bold (Ctrl/Cmd+B)", activeFormats?.bold || false, () => editor?.chain().focus().toggleBold().run())}
        {tool("I", "Italic (Ctrl/Cmd+I)", activeFormats?.italic || false, () => editor?.chain().focus().toggleItalic().run())}
        {tool("U", "Underline (Ctrl/Cmd+U)", activeFormats?.underline || false, () => editor?.chain().focus().toggleUnderline().run())}
        <span />
        {tool("• List", "Bulleted list", activeFormats?.bulletList || false, () => editor?.chain().focus().toggleBulletList().run())}
        {tool("1. List", "Numbered list", activeFormats?.orderedList || false, () => editor?.chain().focus().toggleOrderedList().run())}
        {tool("“ Quote", "Quote", activeFormats?.blockquote || false, () => editor?.chain().focus().toggleBlockquote().run())}
      </div>
      <EditorContent editor={editor} className="rich-editor" />
    </div>
  );
}

export default function EntryModal({
  date,
  initialDream,
  onClose,
  onSave,
}: {
  date: Date;
  initialDream?: Dream | null;
  onClose: () => void;
  onSave: (dream: Dream) => Promise<void>;
}) {
  const [body, setBody] = useState(initialDream?.body || "");
  const [contentHtml, setContentHtml] = useState(initialDream?.contentHtml || escapeHtml(initialDream?.body || ""));
  const [mood, setMood] = useState<Mood>(initialDream?.mood || "peaceful");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(initialDream);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className={`entry-modal ${getStyle(styles, "entryModal")}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">{format(date, "EEEE, d MMMM")}</p><h2>{editing ? "Edit your dream" : "Capture a dream"}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close editor"><FiX /></button>
        </div>
        <RichTextEditor initialHtml={contentHtml} onChange={(html, text) => {
          setContentHtml(html);
          setBody(text);
        }} />
        <div className="mood-picker">
          <p>How did it feel?</p>
          <div>
            {moodKeys.map((key) => (
              <button key={key} className={mood === key ? "active" : ""} onClick={() => setMood(key)}>
                <i style={{ background: moodMeta[key].color }} />{moodMeta[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <span className={error ? "save-error" : ""}>{error || `${body.length} / 6,000`}</span>
          <button
            className="primary-button"
            disabled={body.trim().length < 10 || saving}
            onClick={async () => {
              setSaving(true);
              setError("");
              try {
                await onSave({
                  id: initialDream?.id || crypto.randomUUID(),
                  date: initialDream?.date || isoDate(date),
                  title: initialDream?.title || body.trim().split(/[.!?]/)[0].split(/\s+/).slice(0, 7).join(" ") || "Untitled dream",
                  body: body.trim(),
                  contentHtml,
                  mood,
                  insight: initialDream && body.trim() === initialDream.body && mood === initialDream.mood ? initialDream.insight : undefined,
                });
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "Could not save this dream.");
                setSaving(false);
              }
            }}
          ><FiCheck /> {saving ? "Saving…" : editing ? "Save changes" : "Save dream"}</button>
        </div>
      </section>
    </div>
  );
}

const styles = {
  entryModal: [
    "w-[min(960px,calc(100vw-48px))]",
    "max-h-[calc(100vh-48px)]",
    "overflow-y-auto",
    "rounded-[32px]",
    "bg-[#fbf5ed]",
    "p-9",
    "shadow-[0_35px_100px_rgba(35,34,51,.28)]",
    "max-[760px]:w-full",
  ],
};
