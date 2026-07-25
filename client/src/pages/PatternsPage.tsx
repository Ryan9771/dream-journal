import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FiArrowRight, FiBookOpen, FiEdit3, FiEye, FiMoon, FiPlus, FiStar, FiX } from "react-icons/fi";
import type { Dream } from "../domain/dreams";
import { canonicalTheme, moodKeys, moodMeta } from "../domain/dreams";
import getStyle from "../styles/getStyle";
import { sanitizeRichHtml } from "../utils/richText";

export default function PatternsPage({
  dreams,
  onJournal,
  onEditDream,
}: {
  dreams: Dream[];
  onJournal: () => void;
  onEditDream: (dream: Dream) => void;
}) {
  const [previewDream, setPreviewDream] = useState<Dream | null>(null);
  const patterns = useMemo(() => {
    const moodCounts = moodKeys.map((mood) => ({
      mood,
      count: dreams.filter((dream) => dream.mood === mood).length,
    })).sort((a, b) => b.count - a.count);
    const themeCounts = new Map<string, number>();
    dreams.forEach((dream) => dream.insight?.themes.forEach((rawTheme) => {
      const theme = canonicalTheme(rawTheme);
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
    recentAnalysedDreams.forEach((dream) => dream.insight?.themes.forEach((rawTheme) => {
      const theme = canonicalTheme(rawTheme);
      recentThemeCounts.set(theme, (recentThemeCounts.get(theme) || 0) + 1);
    }));
    const recentThemes = Array.from(recentThemeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const daysRecorded = new Set(dreams.map((dream) => dream.date)).size;
    return { moodCounts, themes, recentThemes, recentWindow: recentAnalysedDreams.length, daysRecorded };
  }, [dreams]);
  const connectedDreams = dreams
    .filter((dream) => dream.insight?.pattern && dream.insight.connectionDreamIds?.some(
      (connectionId) => dreams.some((candidate) => candidate.id === connectionId)
    ))
    .sort((a, b) => b.date.localeCompare(a.date));
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
                    {patterns.themes.map(([theme, count]) => <span key={theme}>{theme}<small>{count}</small></span>)}
                  </div>
                </div>
              )}
              <div className={getStyle(styles, "themeGroup")}>
                <div><strong>Recent themes</strong><small>Latest {patterns.recentWindow || 0} analysed dream{patterns.recentWindow === 1 ? "" : "s"}</small></div>
                {patterns.recentThemes.length ? (
                  <div className={getStyle(styles, "themeChipRow")}>
                    {patterns.recentThemes.map(([theme, count]) => <span key={theme}>{theme}<small>{count}</small></span>)}
                  </div>
                ) : <p>Generate a reflection to begin seeing recent themes.</p>}
              </div>
            </div>
          </section>

          <section className={getStyle(styles, "connectionsCard")}>
            <div className={getStyle(styles, "patternCardHeading")}><span className={getStyle(styles, "patternIconSage")}><FiBookOpen /></span><div><p className="eyebrow">Across your journal</p><h2>Connections between recent dreams</h2></div></div>
            <p className={getStyle(styles, "patternSummary")}>Shown only when a reflection finds a specific overlap with earlier dream context.</p>
            {connectedDreams.length ? (
              <div className={getStyle(styles, "connectionsList")}>
                {connectedDreams.slice(0, 3).map((dream) => {
                  const linkedDreams = (dream.insight?.connectionDreamIds || [])
                    .map((connectionId) => dreams.find((candidate) => candidate.id === connectionId))
                    .filter((candidate): candidate is Dream => Boolean(candidate));
                  return (
                    <article className={getStyle(styles, "connectionItem")} key={dream.id}>
                      <span className={getStyle(styles, "connectionDate")}>{format(new Date(`${dream.date}T12:00:00`), "d MMM")}</span>
                      <div className={getStyle(styles, "connectionCopy")}>
                        <div className={getStyle(styles, "connectionTitleRow")}>
                          <strong>{dream.title}</strong>
                          <button onClick={() => setPreviewDream(dream)}><FiEye /> View</button>
                        </div>
                        <p>{dream.insight?.pattern}</p>
                        <div className={getStyle(styles, "linkedDreams")}>
                          <span>Connected with</span>
                          {linkedDreams.map((linkedDream) => (
                            <button key={linkedDream.id} onClick={() => setPreviewDream(linkedDream)}>
                              <FiBookOpen />
                              <span><strong>{linkedDream.title}</strong><small>{format(new Date(`${linkedDream.date}T12:00:00`), "d MMM yyyy")}</small></span>
                              <FiArrowRight />
                            </button>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <div className="pattern-placeholder"><p>When a reflection finds a specific overlap with an earlier dream, both entries will appear here.</p></div>}
          </section>
        </div>
      ) : (
        <div className="patterns-empty"><FiMoon /><h2>Your patterns begin with one dream.</h2><p>Capture anything you remember. Over time, this space will reflect recurring feelings and themes.</p><button className="primary-button" onClick={onJournal}><FiPlus /> Capture your first dream</button></div>
      )}

      {previewDream && (
        <div className="drawer-backdrop" onMouseDown={() => setPreviewDream(null)}>
          <section
            className={getStyle(styles, "connectionPreview")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="connection-preview-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={getStyle(styles, "connectionPreviewHeading")}>
              <span className="mood-orb" style={{ "--mood": moodMeta[previewDream.mood].color } as React.CSSProperties}><FiMoon /></span>
              <div>
                <p className="eyebrow">{format(new Date(`${previewDream.date}T12:00:00`), "EEEE, d MMMM yyyy")}</p>
                <h2 id="connection-preview-title">{previewDream.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setPreviewDream(null)} aria-label="Close dream preview"><FiX /></button>
            </div>
            <div className={getStyle(styles, "connectionPreviewBody")}>
              {previewDream.contentHtml
                ? <div className="dream-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(previewDream.contentHtml) }} />
                : <p>{previewDream.body}</p>}
            </div>
            <div className={getStyle(styles, "connectionPreviewActions")}>
              <span><i style={{ background: moodMeta[previewDream.mood].color }} />{moodMeta[previewDream.mood].label}</span>
              <button className="primary-button" onClick={() => onEditDream(previewDream)}><FiEdit3 /> Edit in Journal</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const styles = {
  patternsPage: ["animate-[reveal_.35s_ease_both]"],
  patternsHero: ["mb-7", "flex", "items-end", "justify-between", "gap-8", "max-[760px]:items-start", "max-[760px]:gap-4"],
  patternsTitle: ["mb-2", "mt-2", "font-serif", "text-[38px]", "font-normal", "leading-tight", "tracking-[-0.02em]", "max-[760px]:text-[29px]"],
  patternsIntro: ["m-0", "max-w-[620px]", "text-xs", "leading-relaxed", "text-[#73768b]"],
  patternStat: [
    "flex", "shrink-0", "min-h-16", "items-center", "gap-2", "rounded-full", "border",
    "border-[#434260]/10", "bg-[#f9f2ea]/80", "px-4", "py-0", "text-[#73768b]",
    "[&>strong]:font-serif", "[&>strong]:text-2xl", "[&>strong]:font-normal",
    "[&>strong]:leading-none", "[&>strong]:text-[#4a4c76]", "[&>span]:text-[10px]",
    "[&>span]:leading-none", "max-[600px]:hidden",
  ],
  patternsGrid: ["grid", "grid-cols-2", "gap-4", "max-[760px]:grid-cols-1"],
  patternCard: ["rounded-[26px]", "border", "border-[#434260]/10", "bg-[#f9f2ea]/90", "p-6", "shadow-[0_12px_40px_rgba(68,63,84,.07)]", "max-[760px]:p-5"],
  connectionsCard: ["col-span-full", "rounded-[26px]", "border", "border-[#434260]/10", "bg-[#f9f2ea]/90", "p-6", "shadow-[0_12px_40px_rgba(68,63,84,.07)]", "max-[760px]:p-5"],
  patternCardHeading: ["mb-3", "flex", "items-center", "gap-3", "[&_h2]:m-0", "[&_h2]:mt-1", "[&_h2]:font-serif", "[&_h2]:text-xl", "[&_h2]:font-normal"],
  patternIconIndigo: ["grid", "h-10", "w-10", "shrink-0", "place-items-center", "rounded-[13px]", "bg-[#e8e5ed]", "text-[#4a4c76]"],
  patternIconPeach: ["grid", "h-10", "w-10", "shrink-0", "place-items-center", "rounded-[13px]", "bg-[#f3d8c8]", "text-[#4a4c76]"],
  patternIconSage: ["grid", "h-10", "w-10", "shrink-0", "place-items-center", "rounded-[13px]", "bg-[#dce7df]", "text-[#637e75]"],
  patternSummary: ["mb-5", "mt-0", "max-w-[520px]", "text-[11px]", "leading-relaxed", "text-[#73768b]"],
  moodOverview: ["grid", "grid-cols-[130px_1fr]", "items-center", "gap-7", "max-[480px]:grid-cols-1", "max-[480px]:justify-items-center"],
  moodDonut: ["relative", "grid", "h-[126px]", "w-[126px]", "shrink-0", "place-items-center", "rounded-full", "after:absolute", "after:inset-[17px]", "after:rounded-full", "after:bg-[#f9f2ea]", "after:content-['']"],
  moodDonutCenter: ["relative", "z-10", "flex", "flex-col", "items-center", "leading-none", "[&>strong]:font-serif", "[&>strong]:text-3xl", "[&>strong]:font-normal", "[&>small]:mt-1", "[&>small]:text-[8px]", "[&>small]:uppercase", "[&>small]:tracking-wider", "[&>small]:text-[#8c8998]"],
  moodLegend: ["m-0", "grid", "w-full", "list-none", "gap-2", "p-0", "[&>li]:flex", "[&>li]:items-center", "[&>li]:justify-between", "[&>li]:gap-4", "[&>li]:text-[10px]", "[&_li>span]:flex", "[&_li>span]:items-center", "[&_li>span]:gap-2", "[&_li_i]:h-2", "[&_li_i]:w-2", "[&_li_i]:rounded-full", "[&_li_strong]:font-medium", "[&_li_strong]:text-[#73768b]"],
  themeBreakdown: ["grid", "gap-4"],
  themeGroup: ["grid", "grid-cols-[145px_minmax(0,1fr)]", "items-center", "gap-4", "border-t", "border-[#434260]/10", "pt-4", "max-[520px]:grid-cols-1", "max-[520px]:gap-2", "[&>div:first-child]:flex", "[&>div:first-child]:flex-col", "[&>div:first-child>strong]:text-xs", "[&>div:first-child>small]:mt-1", "[&>div:first-child>small]:text-[8px]", "[&>div:first-child>small]:leading-relaxed", "[&>div:first-child>small]:text-[#8c8998]", "[&>p]:m-0", "[&>p]:text-[10px]", "[&>p]:text-[#8c8998]"],
  themeChipRow: ["flex", "flex-wrap", "gap-2", "[&>span]:flex", "[&>span]:items-center", "[&>span]:gap-2", "[&>span]:rounded-full", "[&>span]:border", "[&>span]:border-[#85676d]/10", "[&>span]:bg-[#faeee7]", "[&>span]:px-3", "[&>span]:py-2", "[&>span]:text-[11px]", "[&>span]:capitalize", "[&>span]:text-[#765f6a]", "[&_span>small]:grid", "[&_span>small]:h-5", "[&_span>small]:w-5", "[&_span>small]:place-items-center", "[&_span>small]:rounded-full", "[&_span>small]:bg-[#4a4c76]/10", "[&_span>small]:text-[8px]"],
  connectionsList: ["grid", "gap-2"],
  connectionItem: ["grid", "grid-cols-[76px_minmax(0,1fr)]", "items-start", "gap-4", "rounded-2xl", "bg-white/30", "px-4", "py-3.5", "max-[520px]:grid-cols-1", "max-[520px]:gap-2"],
  connectionDate: ["w-fit", "rounded-full", "bg-[#e7efec]", "px-2.5", "py-1.5", "text-[9px]", "font-semibold", "uppercase", "tracking-wider", "text-[#637e75]"],
  connectionCopy: ["min-w-0", "[&>p]:mb-0", "[&>p]:mt-1.5", "[&>p]:text-xs", "[&>p]:leading-relaxed", "[&>p]:text-[#73768b]"],
  connectionTitleRow: ["flex", "items-center", "justify-between", "gap-3", "[&>strong]:font-serif", "[&>strong]:text-base", "[&>strong]:font-normal", "[&>button]:flex", "[&>button]:shrink-0", "[&>button]:items-center", "[&>button]:gap-1.5", "[&>button]:rounded-full", "[&>button]:px-2.5", "[&>button]:py-1.5", "[&>button]:text-[10px]", "[&>button]:font-semibold", "[&>button]:text-[#4a4c76]", "[&>button]:transition-colors", "[&>button:hover]:bg-[#4a4c76]/10"],
  linkedDreams: ["mt-3", "border-t", "border-[#434260]/10", "pt-3", "[&>span]:mb-2", "[&>span]:block", "[&>span]:text-[9px]", "[&>span]:font-semibold", "[&>span]:uppercase", "[&>span]:tracking-[.14em]", "[&>span]:text-[#92838d]", "[&>button]:flex", "[&>button]:w-full", "[&>button]:items-center", "[&>button]:gap-2.5", "[&>button]:rounded-xl", "[&>button]:border", "[&>button]:border-[#637e75]/10", "[&>button]:bg-[#e7efec]/70", "[&>button]:px-3", "[&>button]:py-2.5", "[&>button]:text-left", "[&>button]:text-[#4a4c76]", "[&>button]:transition-all", "[&>button:hover]:translate-x-0.5", "[&>button:hover]:bg-[#dce8e3]", "[&_button>span]:min-w-0", "[&_button>span]:flex-1", "[&_button_strong]:block", "[&_button_strong]:truncate", "[&_button_strong]:text-[11px]", "[&_button_small]:mt-0.5", "[&_button_small]:block", "[&_button_small]:text-[9px]", "[&_button_small]:text-[#73768b]", "[&_button>svg:last-child]:shrink-0"],
  connectionPreview: ["w-[min(620px,calc(100vw-40px))]", "max-h-[min(720px,calc(100vh-40px))]", "overflow-y-auto", "rounded-[28px]", "border", "border-white/70", "bg-[#fbf5ed]", "p-7", "shadow-[0_30px_90px_rgba(35,34,51,.28)]", "animate-[reveal_.22s_ease_both]", "max-[600px]:w-[calc(100vw-24px)]", "max-[600px]:mb-[76px]", "max-[600px]:max-h-[calc(100vh-100px)]", "max-[600px]:rounded-[24px]", "max-[600px]:p-5"],
  connectionPreviewHeading: ["grid", "grid-cols-[auto_minmax(0,1fr)_auto]", "items-center", "gap-3", "[&_h2]:m-0", "[&_h2]:font-serif", "[&_h2]:text-[25px]", "[&_h2]:font-normal", "[&_p]:mb-1", "[&_p]:mt-0", "max-[600px]:[&_h2]:text-[21px]"],
  connectionPreviewBody: ["my-5", "max-h-[46vh]", "overflow-y-auto", "rounded-2xl", "border", "border-[#434260]/10", "bg-white/35", "p-5", "text-[15px]", "leading-7", "text-[#4f5268]", "[&>p]:m-0"],
  connectionPreviewActions: ["flex", "items-center", "justify-between", "gap-3", "[&>span]:flex", "[&>span]:items-center", "[&>span]:gap-2", "[&>span]:text-xs", "[&>span]:text-[#73768b]", "[&_span>i]:h-2", "[&_span>i]:w-2", "[&_span>i]:rounded-full", "max-[460px]:items-stretch", "max-[460px]:flex-col", "max-[460px]:[&>button]:justify-center"],
};
