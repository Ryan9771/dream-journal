import { useRef } from "react";
import { format, isSameDay } from "date-fns";
import { FiMoon, FiPlus, FiSearch } from "react-icons/fi";
import type { Dream } from "../domain/dreams";
import { isoDate } from "../domain/dreams";
import DreamCalendar from "../features/calendar/DreamCalendar";
import DreamRow from "../features/journal/DreamRow";

const today = new Date();

export default function JournalPage({
  dreams,
  month,
  selected,
  expandedDreamId,
  query,
  onMonth,
  onSelectDate,
  onQuery,
  onExpand,
  onEdit,
  onInsight,
  onNewDream,
}: {
  dreams: Dream[];
  month: Date;
  selected: Date;
  expandedDreamId: string | null;
  query: string;
  onMonth: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onQuery: (query: string) => void;
  onExpand: (id: string | null) => void;
  onEdit: (dream: Dream) => void;
  onInsight: (dream: Dream) => void;
  onNewDream: () => void;
}) {
  const dreamsSectionRef = useRef<HTMLElement>(null);
  const visibleDreams = dreams.filter((dream) => {
    const matchesSearch = `${dream.title} ${dream.body}`.toLowerCase().includes(query.toLowerCase());
    return query.trim() ? matchesSearch : dream.date === isoDate(selected);
  });
  const selectDate = (date: Date) => {
    onSelectDate(date);
    window.setTimeout(() => dreamsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  return (
    <main className="dashboard">
      <section className="welcome-row">
        <div><p className="eyebrow">{format(today, "EEEE, d MMMM")}</p><h2>Your dreams, softly remembered.</h2></div>
        <button className="primary-button" onClick={onNewDream}><FiPlus /> New dream</button>
      </section>
      <DreamCalendar
        month={month}
        selected={selected}
        dreams={dreams}
        onMonth={onMonth}
        onSelect={selectDate}
      />
      <section className="dreams-section" ref={dreamsSectionRef}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{query.trim() ? "Search results" : isSameDay(selected, today) ? "Today" : format(selected, "d MMMM yyyy")}</p>
            <h2>Your dream journal</h2>
          </div>
          <div className="journal-tools">
            {!query.trim() && visibleDreams.length > 0 && (
              <button className="add-dream-button" onClick={onNewDream}>
                <FiPlus /> Add another dream
              </button>
            )}
            <label className="search-box"><FiSearch /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search your dreams" /></label>
          </div>
        </div>
        <div className="dream-list">
          {visibleDreams.length ? visibleDreams.map((dream) => (
            <DreamRow
              key={dream.id}
              dream={dream}
              expanded={expandedDreamId === dream.id}
              onExpand={() => onExpand(expandedDreamId === dream.id ? null : dream.id)}
              onInsight={() => onInsight(dream)}
              onEdit={() => onEdit(dream)}
            />
          )) : (
            <div className="empty-state">
              <FiMoon />
              <h3>{query.trim() ? "No dreams found" : `No dreams for ${format(selected, "d MMMM")}`}</h3>
              <p>{query.trim() ? "Try a different word or phrase." : "A fresh page is waiting for anything you remember."}</p>
              {!query.trim() && <button className="primary-button" onClick={onNewDream}><FiPlus /> Capture a dream</button>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
