import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiCloud,
  FiEdit3,
  FiLogOut,
  FiMoon,
  FiPlus,
  FiSearch,
  FiStar,
  FiX,
} from "react-icons/fi";
import type { User } from "firebase/auth";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { firebaseConfigured, signInWithGoogle, signOutUser, watchAuth } from "./services/firebase";
import { dreamApi } from "./services/api";
import getStyle from "./util/Styles";
import "./index.css";

type Mood = "peaceful" | "joyful" | "curious" | "uneasy" | "heavy";
type Insight = {
  summary?: string;
  analysis?: string[];
  themes: string[];
  reflection: string;
  pattern?: string;
  emotionalTone?: "peaceful" | "joyful" | "curious" | "uneasy" | "heavy" | "mixed";
  intensity?: number;
};
type Dream = {
  id: string;
  date: string;
  title: string;
  body: string;
  contentHtml?: string;
  mood: Mood;
  insight?: Insight;
};

const today = new Date();
const iso = (date: Date) => format(date, "yyyy-MM-dd");
const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\n/g, "<br>");
const sanitizeRichHtml = (value: string) => {
  const documentNode = new DOMParser().parseFromString(value, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "BLOCKQUOTE"]);
  const clean = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    if (!(node instanceof HTMLElement) || !allowed.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => fragment.appendChild(clean(child)));
      return fragment;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    Array.from(node.childNodes).forEach((child) => element.appendChild(clean(child)));
    return element;
  };
  const wrapper = document.createElement("div");
  Array.from(documentNode.body.childNodes).forEach((node) => wrapper.appendChild(clean(node)));
  return wrapper.innerHTML;
};
const moodMeta: Record<Mood, { label: string; color: string }> = {
  peaceful: { label: "Peaceful", color: "#80a99d" },
  joyful: { label: "Joyful", color: "#dda65e" },
  curious: { label: "Curious", color: "#9486b0" },
  uneasy: { label: "Uneasy", color: "#c47f73" },
  heavy: { label: "Heavy", color: "#687796" },
};

const seedDreams: Dream[] = [
  {
    id: "moonlit-train",
    date: iso(today),
    title: "The moonlit train",
    body: "I was sitting on a quiet train moving through a deep blue landscape. I knew I was going somewhere important, but I didn’t feel rushed. Outside, the moon kept appearing between the trees.",
    mood: "peaceful",
    insight: {
      analysis: [
        "The strongest feeling in this dream is movement without urgency. You are travelling somewhere important, yet the journey does not seem to demand control or speed. That combination may reflect a part of waking life that is already changing, while another part of you is beginning to trust that progress can happen without constant pressure.",
        "The train offers a useful image because its route is established: you are participating in the journey, but you are not responsible for steering every turn. The moon repeatedly appearing between the trees could be read as a steady point of orientation—something familiar that remains visible even as the surrounding landscape changes. These are possibilities rather than fixed symbols; your own associations with trains, night, and the moon matter most.",
        "Taken together, the dream may be inviting you to notice where you are already moving forward, even if the destination is not fully clear. The calm tone suggests that uncertainty is not necessarily being experienced as danger here. It may be worth asking whether there is an area of life where you can allow the next stage to unfold instead of trying to resolve the entire route at once.",
      ],
      themes: ["transition", "trust", "direction"],
      reflection: "Where in your life are you already making progress, even if the destination is not fully clear?",
      pattern: "Quiet journeys have appeared in 2 of your recent dreams.",
    },
  },
  {
    id: "blue-house",
    date: iso(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 3))),
    title: "A house painted blue",
    body: "I found an old house near the sea. Every room was painted a different shade of blue, and one door opened straight onto the water.",
    mood: "curious",
  },
  {
    id: "summer-market",
    date: iso(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 7))),
    title: "The endless summer market",
    body: "I wandered through a warm market full of fruit, flowers, and people I almost recognised.",
    mood: "joyful",
  },
  {
    id: "late-lift",
    date: iso(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 11))),
    title: "The lift that skipped my floor",
    body: "The lift kept moving past the floor I needed. I was frustrated, but everyone else seemed calm.",
    mood: "uneasy",
  },
];

function CloudBackdrop() {
  return (
    <div className="clouds" aria-hidden="true">
      <span className="cloud cloud-one" />
      <span className="cloud cloud-two" />
      <span className="cloud cloud-three" />
      <FiCloud className={getStyle(styles, "cloudIconOne")} />
      <FiCloud className={getStyle(styles, "cloudIconTwo")} />
      <FiCloud className={getStyle(styles, "cloudIconThree")} />
      <FiCloud className={getStyle(styles, "cloudIconFour")} />
      <FiCloud className={getStyle(styles, "cloudIconFive")} />
      <FiCloud className={getStyle(styles, "cloudIconSix")} />
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><FiMoon /></span>
      <span>Recall</span>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const signIn = async () => {
    setLoading(true);
    try {
      await onLogin();
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page">
      <CloudBackdrop />
      <section className="login-card">
        <Brand />
        <div className="login-illustration">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <FiMoon />
        </div>
        <p className="eyebrow">Your private dream space</p>
        <h1>Wake up to what<br />your mind remembers.</h1>
        <p className="login-copy">
          Capture your dreams before they fade, then discover gentle patterns over time.
        </p>
        <button className="google-button" onClick={signIn} disabled={loading}>
          <span className="google-g">G</span>
          {loading ? "Opening your journal…" : "Continue with Google"}
        </button>
        <p className="privacy-note">Private by design. Your dreams belong to you.</p>
        {!firebaseConfigured && <p className="demo-note">Preview mode · add Firebase settings to enable real Google sign-in</p>}
      </section>
      <p className="login-footer">A calm place for the stories you tell yourself at night.</p>
    </main>
  );
}

function Calendar({
  month,
  selected,
  dreams,
  onMonth,
  onSelect,
}: {
  month: Date;
  selected: Date;
  dreams: Dream[];
  onMonth: (date: Date) => void;
  onSelect: (date: Date) => void;
}) {
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month]
  );
  const dreamMap = useMemo(() => {
    const map = new Map<string, Dream[]>();
    dreams.forEach((dream) => map.set(dream.date, [...(map.get(dream.date) || []), dream]));
    return map;
  }, [dreams]);

  return (
    <section className="calendar-card">
      <div className="calendar-head">
        <div>
          <p className="eyebrow">Dream calendar</p>
          <h1>{format(month, "MMMM")} <span>{format(month, "yyyy")}</span></h1>
        </div>
        <div className="month-controls">
          <button onClick={() => onMonth(today)}>Today</button>
          <button aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))}><FiArrowLeft /></button>
          <button aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))}><FiArrowRight /></button>
        </div>
      </div>
      <div className="weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const dayDreams = dreamMap.get(iso(day)) || [];
          const current = isSameDay(day, today);
          const chosen = isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              className={`calendar-day ${!isSameMonth(day, month) ? "outside" : ""} ${current ? "today" : ""} ${chosen ? "selected" : ""}`}
              onClick={() => onSelect(day)}
              aria-label={format(day, "PPPP")}
            >
              <span className="date-number">{format(day, "d")}</span>
              <span className="mood-dots">
                {dayDreams.slice(0, 3).map((dream) => (
                  <i key={dream.id} style={{ background: moodMeta[dream.mood].color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="legend-filled" /> Dream captured</span>
        <span><i className="legend-today" /> Today</span>
        <span className="legend-note">Dots reflect how each dream felt</span>
      </div>
    </section>
  );
}

function InsightPanel({
  dream,
  onClose,
  onGenerate,
}: {
  dream: Dream;
  onClose: () => void;
  onGenerate: () => Promise<void>;
}) {
  const insight = dream.insight;
  const paragraphs = insight?.analysis?.length
    ? insight.analysis
    : (insight?.summary || "").split(/\n\s*\n/).filter(Boolean);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="insight-panel">
      <div className="drawer-handle" />
      <div className="insight-heading">
        <div className="insight-icon"><FiStar /></div>
        <div><p className="eyebrow">A gentle reflection</p><h2>Dream insight</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close insight"><FiX /></button>
      </div>
      {insight ? (
        <div className="insight-content">
          <div className="insight-dream-label">
            <span className="mood-orb" style={{ "--mood": moodMeta[dream.mood].color } as React.CSSProperties}><FiMoon /></span>
            <div className="insight-dream-copy"><p>{format(new Date(`${dream.date}T12:00:00`), "d MMMM yyyy")}</p><strong>{dream.title}</strong></div>
            <div className={getStyle(styles, "insightMeta")}>
              <div className={getStyle(styles, "metaGroup")}>
                <span className={getStyle(styles, "metaLabel")}>Emotional tone</span>
                <span className={getStyle(styles, "toneChip")}>{insight.emotionalTone || moodMeta[dream.mood].label}</span>
              </div>
              <div className={getStyle(styles, "themesGroup")}>
                <span className={getStyle(styles, "metaLabel")}>Themes noticed</span>
                <div className={getStyle(styles, "themeList")}>
                  {insight.themes.map((theme) => (
                    <span className={getStyle(styles, "themeChip")} key={theme}>{theme}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <section className="insight-section">
            <p className="eyebrow">A second perspective</p>
            <div className="insight-summary">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          </section>
          {insight.pattern && <div className="pattern-note"><span><FiStar /></span><div><p className="eyebrow">A recurring echo</p><p>{insight.pattern}</p></div></div>}
          <div className="reflection-card">
            <span className="reflection-mark">“</span>
            <div><p className="eyebrow">Something to sit with</p><p>{insight.reflection}</p></div>
          </div>
          <p className="insight-disclaimer">A reflective interpretation, not a diagnosis or statement of fact.</p>
        </div>
      ) : (
        <div className="empty-insight">
          <FiStar />
          <h3>Ready when you are</h3>
          <p>Save this dream first, then ask for one thoughtful reflection. We’ll reuse it unless your entry changes.</p>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading} onClick={async () => {
            setLoading(true);
            setError("");
            try { await onGenerate(); }
            catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create this reflection."); }
            finally { setLoading(false); }
          }}>{loading ? "Reflecting…" : "Generate insight"}</button>
        </div>
      )}
    </div>
  );
}

function DreamRow({
  dream,
  expanded,
  onExpand,
  onInsight,
  onEdit,
}: {
  dream: Dream;
  expanded: boolean;
  onExpand: () => void;
  onInsight: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={`dream-row ${expanded ? "expanded" : ""}`}>
      <button className="dream-row-main" onClick={onExpand}>
        <span className="mood-orb" style={{ "--mood": moodMeta[dream.mood].color } as React.CSSProperties}>
          <FiMoon />
        </span>
        <span className="dream-details">
          <span className="dream-date">{format(new Date(`${dream.date}T12:00:00`), "EEEE, d MMMM")}</span>
          <strong>{dream.title}</strong>
          {!expanded && <span className="dream-preview">{dream.body}</span>}
        </span>
        <span className="dream-actions">
          <span className="mood-label"><i style={{ background: moodMeta[dream.mood].color }} />{moodMeta[dream.mood].label}</span>
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </span>
      </button>
      {expanded && (
        <div className="dream-expanded">
          {dream.contentHtml
            ? <div className="dream-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(dream.contentHtml) }} />
            : <p>{dream.body}</p>}
          <div className="row-buttons">
            <button onClick={onEdit}><FiEdit3 /> Edit dream</button>
            <button className="insight-button" onClick={onInsight}><FiStar /> {dream.insight ? "View insight" : "Get insight"}</button>
          </div>
        </div>
      )}
    </article>
  );
}

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
      onMouseDown={(event) => {
        event.preventDefault();
      }}
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

function EntryModal({
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
            {(Object.keys(moodMeta) as Mood[]).map((key) => (
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
                  date: initialDream?.date || iso(date),
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

function PatternsView({ dreams, onJournal }: { dreams: Dream[]; onJournal: () => void }) {
  const patterns = useMemo(() => {
    const moodCounts = (Object.keys(moodMeta) as Mood[]).map((mood) => ({
      mood,
      count: dreams.filter((dream) => dream.mood === mood).length,
    })).sort((a, b) => b.count - a.count);
    const themeCounts = new Map<string, number>();
    dreams.forEach((dream) => dream.insight?.themes.forEach((theme) => {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }));
    const themes = Array.from(themeCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const recentAnalysedDreams = [...dreams]
      .filter((dream) => dream.insight)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
    const recentThemeCounts = new Map<string, number>();
    recentAnalysedDreams.forEach((dream) => dream.insight?.themes.forEach((theme) => {
      recentThemeCounts.set(theme, (recentThemeCounts.get(theme) || 0) + 1);
    }));
    const recentThemes = Array.from(recentThemeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const daysRecorded = new Set(dreams.map((dream) => dream.date)).size;
    return { moodCounts, themes, recentThemes, recentWindow: recentAnalysedDreams.length, daysRecorded };
  }, [dreams]);
  const insightDreams = dreams.filter((dream) => dream.insight);
  const moodTotal = patterns.moodCounts.reduce((total, item) => total + item.count, 0);
  let moodCursor = 0;
  const moodGradient = moodTotal
    ? `conic-gradient(${patterns.moodCounts.filter(({ count }) => count > 0).map(({ mood, count }) => {
        const start = moodCursor;
        moodCursor += (count / moodTotal) * 100;
        return `${moodMeta[mood].color} ${start}% ${moodCursor}%`;
      }).join(", ")})`
    : "conic-gradient(#e5dedb 0 100%)";
  const leadingMood = patterns.moodCounts[0];
  const tiedLead = leadingMood && patterns.moodCounts.filter(({ count }) => count === leadingMood.count).length > 1;
  const moodSummary = tiedLead
    ? "Your recent dreams hold a varied emotional mix."
    : `${moodMeta[leadingMood?.mood || "curious"].label} is the feeling you’ve recorded most often.`;

  return (
    <main className={`dashboard ${getStyle(styles, "patternsPage")}`}>
      <section className={getStyle(styles, "patternsHero")}>
        <div>
          <p className="eyebrow">Your dream patterns</p>
          <h1 className={getStyle(styles, "patternsTitle")}>A clearer view of what returns.</h1>
          <p className={getStyle(styles, "patternsIntro")}>A simple overview of feelings and themes across your journal—not a diagnosis or fixed meaning.</p>
        </div>
        <div className={getStyle(styles, "patternStat")}>
          <strong>{dreams.length}</strong>
          <span>dream{dreams.length === 1 ? "" : "s"} · {patterns.daysRecorded} night{patterns.daysRecorded === 1 ? "" : "s"}</span>
        </div>
      </section>

      {dreams.length ? (
        <div className={getStyle(styles, "patternsGrid")}>
          <section className={getStyle(styles, "patternCard")}>
            <div className={getStyle(styles, "patternCardHeading")}><span className={getStyle(styles, "patternIconIndigo")}><FiMoon /></span><div><p className="eyebrow">Emotional mix</p><h2>How your dreams have felt</h2></div></div>
            <p className={getStyle(styles, "patternSummary")}>{moodSummary}</p>
            <div className={getStyle(styles, "moodOverview")}>
              <div
                className={getStyle(styles, "moodDonut")}
                style={{ background: moodGradient }}
                role="img"
                aria-label={`Emotional mix across ${moodTotal} dreams. ${patterns.moodCounts.map(({ mood, count }) => `${moodMeta[mood].label}: ${count}`).join(", ")}.`}
              >
                <span className={getStyle(styles, "moodDonutCenter")}><strong>{moodTotal}</strong><small>dreams</small></span>
              </div>
              <ul className={getStyle(styles, "moodLegend")}>
                {patterns.moodCounts.map(({ mood, count }) => (
                  <li key={mood}>
                    <span><i style={{ background: moodMeta[mood].color }} />{moodMeta[mood].label}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={getStyle(styles, "patternCard")}>
            <div className={getStyle(styles, "patternCardHeading")}><span className={getStyle(styles, "patternIconPeach")}><FiStar /></span><div><p className="eyebrow">Themes noticed</p><h2>Ideas that appear in reflections</h2></div></div>
            <p className={getStyle(styles, "patternSummary")}>
              {patterns.themes.length
                ? "A balance of longer-term repetition and what has been present lately. Numbers show how many reflections mention each theme."
                : "Themes currently appearing in your latest reflections. Numbers show how many reflections mention each theme."}
            </p>
            <div className={getStyle(styles, "themeBreakdown")}>
              {patterns.themes.length > 0 && (
                <div className={getStyle(styles, "themeGroup")}>
                  <div><strong>Most recurring</strong><small>Across your journal · shown after 2 mentions</small></div>
                  <div className={getStyle(styles, "themeChipRow")}>
                    {patterns.themes.map(([theme, count]) => (
                      <span key={theme}>{theme}<small>{count}</small></span>
                    ))}
                  </div>
                </div>
              )}
              <div className={getStyle(styles, "themeGroup")}>
                <div><strong>Recent themes</strong><small>Latest {patterns.recentWindow || 0} analysed dream{patterns.recentWindow === 1 ? "" : "s"}</small></div>
                {patterns.recentThemes.length ? (
                  <div className={getStyle(styles, "themeChipRow")}>
                    {patterns.recentThemes.map(([theme, count]) => (
                      <span key={theme}>{theme}<small>{count}</small></span>
                    ))}
                  </div>
                ) : (
                  <p>Generate a reflection to begin seeing recent themes.</p>
                )}
              </div>
            </div>
          </section>

          <section className={getStyle(styles, "connectionsCard")}>
            <div className={getStyle(styles, "patternCardHeading")}><span className={getStyle(styles, "patternIconSage")}><FiBookOpen /></span><div><p className="eyebrow">Across your journal</p><h2>Connections between recent dreams</h2></div></div>
            <p className={getStyle(styles, "patternSummary")}>Shown only when a reflection finds a specific overlap with earlier dream context.</p>
            {insightDreams.length ? (
              <div className={getStyle(styles, "connectionsList")}>
                {insightDreams.slice(0, 3).map((dream) => (
                  <article className={getStyle(styles, "connectionItem")} key={dream.id}>
                    <span className={getStyle(styles, "connectionDate")}>{format(new Date(`${dream.date}T12:00:00`), "d MMM")}</span>
                    <div className={getStyle(styles, "connectionCopy")}><strong>{dream.title}</strong><p>{dream.insight?.pattern || dream.insight?.summary}</p></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="pattern-placeholder"><p>Generate an insight from a dream and its connections will appear here.</p></div>
            )}
          </section>
        </div>
      ) : (
        <div className="patterns-empty"><FiMoon /><h2>Your patterns begin with one dream.</h2><p>Capture anything you remember. Over time, this space will reflect recurring feelings and themes.</p><button className="primary-button" onClick={onJournal}><FiPlus /> Capture your first dream</button></div>
      )}
    </main>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [dreams, setDreams] = useState<Dream[]>(seedDreams);
  const [expanded, setExpanded] = useState<string | null>(seedDreams[0].id);
  const [insightDream, setInsightDream] = useState<Dream | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<Dream | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"journal" | "patterns">("journal");
  const dreamsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => watchAuth((nextUser) => { setUser(nextUser); setAuthReady(true); }), []);
  useEffect(() => {
    if (!user || !firebaseConfigured) return;
    dreamApi.list().then(({ dreams: storedDreams }) => setDreams(storedDreams as Dream[])).catch(console.error);
  }, [user]);

  if (!authReady) return <main className="auth-loading"><Brand /><span /></main>;
  if (!user) return <Login onLogin={async () => { await signInWithGoogle(); if (!firebaseConfigured) setUser({ uid: "demo", displayName: "Dreamer" } as User); }} />;
  const visibleDreams = dreams.filter((dream) => {
    const matchesSearch = `${dream.title} ${dream.body}`.toLowerCase().includes(query.toLowerCase());
    return query.trim() ? matchesSearch : dream.date === iso(selected);
  });
  const selectCalendarDate = (date: Date) => {
    setSelected(date);
    setQuery("");
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date));
    window.setTimeout(() => dreamsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const openNewDream = () => {
    setEditingDream(null);
    setEntryOpen(true);
  };
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const accountName = user.displayName?.trim() || user.email?.split("@")[0] || "";
  const firstName = accountName.split(/\s+/)[0];
  const profileInitial = (accountName || "R").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <CloudBackdrop />
      <header className="topbar">
        <Brand />
        <nav>
          <button className={view === "journal" ? "active" : ""} onClick={() => setView("journal")}><FiBookOpen /> Journal</button>
          <button className={view === "patterns" ? "active" : ""} onClick={() => setView("patterns")}><FiStar /> Patterns</button>
        </nav>
        <div className={getStyle(styles, "profile")}>
          <span className={getStyle(styles, "avatar")}>
            {user.photoURL
              ? <img className={getStyle(styles, "avatarImage")} src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              : profileInitial}
          </span>
          <span className={getStyle(styles, "profileCopy")}>
            <strong>{greeting}</strong>
            {firstName && <small className={getStyle(styles, "profileName")}>{firstName}</small>}
          </span>
          <button className="icon-button" onClick={async () => { await signOutUser(); setUser(null); }} aria-label="Sign out"><FiLogOut /></button>
        </div>
      </header>
      {view === "patterns" ? <PatternsView dreams={dreams} onJournal={() => { setView("journal"); openNewDream(); }} /> : <main className="dashboard">
        <section className="welcome-row">
          <div><p className="eyebrow">{format(today, "EEEE, d MMMM")}</p><h2>Your dreams, softly remembered.</h2></div>
          <button className="primary-button" onClick={openNewDream}><FiPlus /> New dream</button>
        </section>
        <Calendar
          month={month}
          selected={selected}
          dreams={dreams}
          onMonth={(date) => { setMonth(startOfMonth(date)); if (isSameDay(date, today)) setSelected(today); }}
          onSelect={selectCalendarDate}
        />
        <section className="dreams-section" ref={dreamsSectionRef}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{query.trim() ? "Search results" : isSameDay(selected, today) ? "Today" : format(selected, "d MMMM yyyy")}</p>
              <h2>Your dream journal</h2>
            </div>
            <div className="journal-tools">
              {!query.trim() && visibleDreams.length > 0 && (
                <button className="add-dream-button" onClick={openNewDream}>
                  <FiPlus /> Add another dream
                </button>
              )}
              <label className="search-box"><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your dreams" /></label>
            </div>
          </div>
          <div className="dream-list">
            {visibleDreams.length ? visibleDreams.map((dream) => (
              <DreamRow
                key={dream.id}
                dream={dream}
                expanded={expanded === dream.id}
                onExpand={() => setExpanded(expanded === dream.id ? null : dream.id)}
                onInsight={() => setInsightDream(dream)}
                onEdit={() => { setEditingDream(dream); setEntryOpen(true); }}
              />
            )) : (
              <div className="empty-state">
                <FiMoon />
                <h3>{query.trim() ? "No dreams found" : `No dreams for ${format(selected, "d MMMM")}`}</h3>
                <p>{query.trim() ? "Try a different word or phrase." : "A fresh page is waiting for anything you remember."}</p>
                {!query.trim() && <button className="primary-button" onClick={openNewDream}><FiPlus /> Capture a dream</button>}
              </div>
            )}
          </div>
        </section>
      </main>}
      {entryOpen && <EntryModal date={editingDream ? new Date(`${editingDream.date}T12:00:00`) : selected} initialDream={editingDream} onClose={() => { setEntryOpen(false); setEditingDream(null); }} onSave={async (dream) => {
        let saved = dream;
        if (firebaseConfigured) {
          const response = editingDream
            ? await dreamApi.update(dream.id, { body: dream.body, contentHtml: dream.contentHtml, mood: dream.mood, title: dream.title })
            : await dreamApi.create(dream);
          saved = response.dream as Dream;
        }
        setDreams((currentDreams) => editingDream
          ? currentDreams.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...currentDreams]);
        setExpanded(saved.id);
        setEntryOpen(false);
        setEditingDream(null);
      }} />}
      {insightDream && <div className="drawer-backdrop" onMouseDown={() => setInsightDream(null)}><div onMouseDown={(event) => event.stopPropagation()}><InsightPanel
        dream={insightDream}
        onClose={() => setInsightDream(null)}
        onGenerate={async () => {
          if (!firebaseConfigured) {
            const previewInsight: Insight = {
              analysis: [
                "The clearest quality in this dream is the way curiosity and movement appear together. Rather than pointing to one fixed meaning, the imagery may be giving shape to something that feels open, unfinished, or quietly important in waking life.",
                "Notice which image carries the most feeling for you, and what personal association arrives before you try to interpret it. That first association is often more useful than a universal symbol dictionary because it keeps the reflection grounded in your own experience.",
                "The dream might be offering a private space to rehearse uncertainty without needing to solve it. Consider whether something in daily life currently has the same emotional texture, and whether the dream changes how you want to approach it.",
              ],
              themes: ["curiosity", "movement", "possibility"],
              reflection: "What part of this dream still feels emotionally vivid now that you are awake?",
            };
            const updated = { ...insightDream, insight: previewInsight };
            setDreams(dreams.map((item) => item.id === updated.id ? updated : item));
            setInsightDream(updated);
            return;
          }
          const response = await dreamApi.insight(insightDream.id);
          const updated = { ...insightDream, title: response.title || insightDream.title, insight: response.insight as Insight };
          setDreams(dreams.map((item) => item.id === updated.id ? updated : item));
          setInsightDream(updated);
        }}
      /></div></div>}
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
  cloudIconOne: [
    "fixed",
    "right-[2%]",
    "top-[18%]",
    "h-9",
    "w-9",
    "text-[#8f91ae]/15",
    "animate-[cloudDrift_11s_ease-in-out_infinite]",
    "max-[760px]:right-3",
    "max-[760px]:top-[15%]",
    "max-[760px]:h-7",
    "max-[760px]:w-7",
    "max-[760px]:text-[#8f91ae]/10",
  ],
  cloudIconTwo: [
    "fixed",
    "left-[1.5%]",
    "top-[52%]",
    "h-8",
    "w-8",
    "text-[#8f91ae]/10",
    "animate-[cloudDrift_15s_ease-in-out_infinite_reverse]",
    "max-[760px]:left-2",
    "max-[760px]:top-[58%]",
    "max-[760px]:h-6",
    "max-[760px]:w-6",
  ],
  cloudIconThree: [
    "fixed",
    "bottom-[10%]",
    "right-[2.5%]",
    "h-7",
    "w-7",
    "text-[#8f91ae]/10",
    "animate-[cloudDrift_13s_ease-in-out_infinite]",
    "max-[760px]:hidden",
  ],
  cloudIconFour: [
    "fixed",
    "left-[14%]",
    "top-[14%]",
    "h-6",
    "w-6",
    "text-[#8f91ae]/10",
    "animate-[cloudDrift_17s_ease-in-out_infinite_reverse]",
    "max-[760px]:hidden",
  ],
  cloudIconFive: [
    "fixed",
    "right-[17%]",
    "top-[61%]",
    "h-8",
    "w-8",
    "text-[#8f91ae]/10",
    "animate-[cloudDrift_14s_ease-in-out_infinite]",
    "max-[760px]:right-2",
    "max-[760px]:top-[72%]",
    "max-[760px]:h-6",
    "max-[760px]:w-6",
    "max-[760px]:text-[#8f91ae]/8",
  ],
  cloudIconSix: [
    "fixed",
    "bottom-[13%]",
    "left-[8%]",
    "h-7",
    "w-7",
    "text-[#8f91ae]/10",
    "animate-[cloudDrift_19s_ease-in-out_infinite_reverse]",
    "max-[760px]:hidden",
  ],
  profile: [
    "flex",
    "items-center",
    "gap-2.5",
  ],
  avatar: [
    "grid",
    "h-9",
    "w-9",
    "shrink-0",
    "place-items-center",
    "overflow-hidden",
    "rounded-full",
    "bg-[#f3d8c8]",
    "font-serif",
    "text-[#4a4c76]",
    "ring-2",
    "ring-white/70",
  ],
  avatarImage: [
    "block",
    "h-full",
    "w-full",
    "object-cover",
  ],
  profileCopy: [
    "flex",
    "flex-col",
    "whitespace-nowrap",
    "text-xs",
    "leading-tight",
    "max-[980px]:hidden",
  ],
  profileName: [
    "mt-1",
    "text-[#73768b]",
  ],
  insightMeta: [
    "col-span-full",
    "grid",
    "grid-cols-[minmax(125px,auto)_minmax(0,1fr)]",
    "items-start",
    "gap-x-7",
    "gap-y-4",
    "border-t",
    "border-[#4a4c76]/10",
    "pt-3",
    "max-[430px]:grid-cols-1",
  ],
  metaGroup: [
    "grid",
    "gap-1.5",
  ],
  themesGroup: [
    "grid",
    "min-w-0",
    "gap-1.5",
  ],
  metaLabel: [
    "text-[8px]",
    "font-bold",
    "uppercase",
    "tracking-[0.1em]",
    "text-[#94848d]",
  ],
  toneChip: [
    "w-fit",
    "rounded-full",
    "bg-[#e7efec]",
    "px-3",
    "py-1.5",
    "text-[10px]",
    "font-semibold",
    "capitalize",
    "text-[#57756d]",
  ],
  themeList: [
    "flex",
    "flex-wrap",
    "gap-1.5",
  ],
  themeChip: [
    "rounded-full",
    "bg-[#faeee7]",
    "px-2.5",
    "py-1.5",
    "text-[10px]",
    "capitalize",
    "text-[#76616d]",
  ],
  patternsPage: [
    "animate-[reveal_.35s_ease_both]",
  ],
  patternsHero: [
    "mb-7",
    "flex",
    "items-end",
    "justify-between",
    "gap-8",
    "max-[760px]:items-start",
    "max-[760px]:gap-4",
  ],
  patternsTitle: [
    "mb-2",
    "mt-2",
    "font-serif",
    "text-[38px]",
    "font-normal",
    "leading-tight",
    "tracking-[-0.02em]",
    "max-[760px]:text-[29px]",
  ],
  patternsIntro: [
    "m-0",
    "max-w-[620px]",
    "text-xs",
    "leading-relaxed",
    "text-[#73768b]",
  ],
  patternStat: [
    "flex",
    "shrink-0",
    "items-baseline",
    "gap-2",
    "rounded-full",
    "border",
    "border-[#434260]/10",
    "bg-[#f9f2ea]/80",
    "px-4",
    "py-2",
    "text-[#73768b]",
    "[&>strong]:font-serif",
    "[&>strong]:text-2xl",
    "[&>strong]:font-normal",
    "[&>strong]:text-[#4a4c76]",
    "[&>span]:text-[10px]",
    "max-[600px]:hidden",
  ],
  patternsGrid: [
    "grid",
    "grid-cols-2",
    "gap-4",
    "max-[760px]:grid-cols-1",
  ],
  patternCard: [
    "rounded-[26px]",
    "border",
    "border-[#434260]/10",
    "bg-[#f9f2ea]/90",
    "p-6",
    "shadow-[0_12px_40px_rgba(68,63,84,.07)]",
    "max-[760px]:p-5",
  ],
  connectionsCard: [
    "col-span-full",
    "rounded-[26px]",
    "border",
    "border-[#434260]/10",
    "bg-[#f9f2ea]/90",
    "p-6",
    "shadow-[0_12px_40px_rgba(68,63,84,.07)]",
    "max-[760px]:p-5",
  ],
  patternCardHeading: [
    "mb-3",
    "flex",
    "items-center",
    "gap-3",
    "[&_h2]:m-0",
    "[&_h2]:mt-1",
    "[&_h2]:font-serif",
    "[&_h2]:text-xl",
    "[&_h2]:font-normal",
  ],
  patternIconIndigo: [
    "grid",
    "h-10",
    "w-10",
    "shrink-0",
    "place-items-center",
    "rounded-[13px]",
    "bg-[#e8e5ed]",
    "text-[#4a4c76]",
  ],
  patternIconPeach: [
    "grid",
    "h-10",
    "w-10",
    "shrink-0",
    "place-items-center",
    "rounded-[13px]",
    "bg-[#f3d8c8]",
    "text-[#4a4c76]",
  ],
  patternIconSage: [
    "grid",
    "h-10",
    "w-10",
    "shrink-0",
    "place-items-center",
    "rounded-[13px]",
    "bg-[#dce7df]",
    "text-[#637e75]",
  ],
  patternSummary: [
    "mb-5",
    "mt-0",
    "max-w-[520px]",
    "text-[11px]",
    "leading-relaxed",
    "text-[#73768b]",
  ],
  moodOverview: [
    "grid",
    "grid-cols-[130px_1fr]",
    "items-center",
    "gap-7",
    "max-[480px]:grid-cols-1",
    "max-[480px]:justify-items-center",
  ],
  moodDonut: [
    "relative",
    "grid",
    "h-[126px]",
    "w-[126px]",
    "shrink-0",
    "place-items-center",
    "rounded-full",
    "after:absolute",
    "after:inset-[17px]",
    "after:rounded-full",
    "after:bg-[#f9f2ea]",
    "after:content-['']",
  ],
  moodDonutCenter: [
    "relative",
    "z-10",
    "flex",
    "flex-col",
    "items-center",
    "leading-none",
    "[&>strong]:font-serif",
    "[&>strong]:text-3xl",
    "[&>strong]:font-normal",
    "[&>small]:mt-1",
    "[&>small]:text-[8px]",
    "[&>small]:uppercase",
    "[&>small]:tracking-wider",
    "[&>small]:text-[#8c8998]",
  ],
  moodLegend: [
    "m-0",
    "grid",
    "w-full",
    "list-none",
    "gap-2",
    "p-0",
    "[&>li]:flex",
    "[&>li]:items-center",
    "[&>li]:justify-between",
    "[&>li]:gap-4",
    "[&>li]:text-[10px]",
    "[&_li>span]:flex",
    "[&_li>span]:items-center",
    "[&_li>span]:gap-2",
    "[&_li_i]:h-2",
    "[&_li_i]:w-2",
    "[&_li_i]:rounded-full",
    "[&_li_strong]:font-medium",
    "[&_li_strong]:text-[#73768b]",
  ],
  themeBreakdown: [
    "grid",
    "gap-4",
  ],
  themeGroup: [
    "grid",
    "grid-cols-[145px_minmax(0,1fr)]",
    "items-center",
    "gap-4",
    "border-t",
    "border-[#434260]/10",
    "pt-4",
    "max-[520px]:grid-cols-1",
    "max-[520px]:gap-2",
    "[&>div:first-child]:flex",
    "[&>div:first-child]:flex-col",
    "[&>div:first-child>strong]:text-xs",
    "[&>div:first-child>small]:mt-1",
    "[&>div:first-child>small]:text-[8px]",
    "[&>div:first-child>small]:leading-relaxed",
    "[&>div:first-child>small]:text-[#8c8998]",
    "[&>p]:m-0",
    "[&>p]:text-[10px]",
    "[&>p]:text-[#8c8998]",
  ],
  themeChipRow: [
    "flex",
    "flex-wrap",
    "gap-2",
    "[&>span]:flex",
    "[&>span]:items-center",
    "[&>span]:gap-2",
    "[&>span]:rounded-full",
    "[&>span]:border",
    "[&>span]:border-[#85676d]/10",
    "[&>span]:bg-[#faeee7]",
    "[&>span]:px-3",
    "[&>span]:py-2",
    "[&>span]:text-[11px]",
    "[&>span]:capitalize",
    "[&>span]:text-[#765f6a]",
    "[&_span>small]:grid",
    "[&_span>small]:h-5",
    "[&_span>small]:w-5",
    "[&_span>small]:place-items-center",
    "[&_span>small]:rounded-full",
    "[&_span>small]:bg-[#4a4c76]/10",
    "[&_span>small]:text-[8px]",
  ],
  connectionsList: [
    "grid",
    "gap-2",
  ],
  connectionItem: [
    "grid",
    "grid-cols-[76px_minmax(0,1fr)]",
    "items-start",
    "gap-4",
    "rounded-2xl",
    "bg-white/30",
    "px-4",
    "py-3.5",
    "max-[520px]:grid-cols-1",
    "max-[520px]:gap-2",
  ],
  connectionDate: [
    "w-fit",
    "rounded-full",
    "bg-[#e7efec]",
    "px-2.5",
    "py-1.5",
    "text-[9px]",
    "font-semibold",
    "uppercase",
    "tracking-wider",
    "text-[#637e75]",
  ],
  connectionCopy: [
    "min-w-0",
    "[&>strong]:font-serif",
    "[&>strong]:text-base",
    "[&>strong]:font-normal",
    "[&>p]:mb-0",
    "[&>p]:mt-1",
    "[&>p]:text-xs",
    "[&>p]:leading-relaxed",
    "[&>p]:text-[#73768b]",
  ],
};

export default App;
