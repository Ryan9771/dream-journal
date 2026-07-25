import { useState } from "react";
import { format } from "date-fns";
import { FiLoader, FiMoon, FiStar, FiX } from "react-icons/fi";
import type { Dream } from "../../domain/dreams";
import { moodMeta, normalizeMood } from "../../domain/dreams";
import getStyle from "../../styles/getStyle";

export default function InsightPanel({
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
                <span className={getStyle(styles, "toneChip")}>{moodMeta[normalizeMood(insight.emotionalTone || dream.mood)].label}</span>
              </div>
              <div className={getStyle(styles, "themesGroup")}>
                <span className={getStyle(styles, "metaLabel")}>Themes noticed</span>
                <div className={getStyle(styles, "themeList")}>
                  {insight.themes.map((theme) => <span className={getStyle(styles, "themeChip")} key={theme}>{theme}</span>)}
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
          {loading ? <FiLoader className={getStyle(styles, "loadingWheel")} /> : <FiStar />}
          <h3>{loading ? "Reflecting on your dream…" : "Ready when you are"}</h3>
          <p aria-live="polite">
            {loading
              ? "Looking gently at its feelings, themes, and connections. This may take a moment."
              : "Get a thoughtful reflection on this dream"}
          </p>
          {error && <p className="form-error">{error}</p>}
          <button
            className={`primary-button ${loading ? getStyle(styles, "loadingButton") : ""}`}
            disabled={loading}
            aria-busy={loading}
            onClick={async () => {
            setLoading(true);
            setError("");
            try {
              await onGenerate();
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Could not create this reflection.");
            } finally {
              setLoading(false);
            }
          }}>
            {loading && <FiLoader className={getStyle(styles, "buttonSpinner")} />}
            {loading ? "Creating reflection…" : "Generate insight"}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  insightMeta: [
    "col-span-full", "grid", "grid-cols-[minmax(125px,auto)_minmax(0,1fr)]",
    "items-start", "gap-x-7", "gap-y-4", "border-t", "border-[#4a4c76]/10",
    "pt-3", "max-[430px]:grid-cols-1",
  ],
  metaGroup: ["grid", "gap-1.5"],
  themesGroup: ["grid", "min-w-0", "gap-1.5"],
  metaLabel: ["text-[8px]", "font-bold", "uppercase", "tracking-[0.1em]", "text-[#94848d]"],
  toneChip: [
    "w-fit", "rounded-full", "bg-[#e7efec]", "px-3", "py-1.5", "text-[10px]",
    "font-semibold", "capitalize", "text-[#57756d]",
  ],
  themeList: ["flex", "flex-wrap", "gap-1.5"],
  themeChip: [
    "rounded-full", "bg-[#faeee7]", "px-2.5", "py-1.5", "text-[10px]",
    "capitalize", "text-[#76616d]",
  ],
  loadingWheel: ["animate-spin"],
  loadingButton: ["!cursor-wait", "!opacity-100"],
  buttonSpinner: ["h-4", "w-4", "animate-spin"],
};
