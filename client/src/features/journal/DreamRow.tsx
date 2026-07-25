import { format } from "date-fns";
import { FiChevronDown, FiChevronUp, FiEdit3, FiMoon, FiStar } from "react-icons/fi";
import type { Dream } from "../../domain/dreams";
import { moodMeta } from "../../domain/dreams";
import { sanitizeRichHtml } from "../../utils/richText";

export default function DreamRow({
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
