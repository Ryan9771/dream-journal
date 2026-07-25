import { useMemo } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import type { Dream } from "../../domain/dreams";
import { isoDate, moodMeta } from "../../domain/dreams";

const today = new Date();

export default function DreamCalendar({
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
          const dayDreams = dreamMap.get(isoDate(day)) || [];
          const current = isSameDay(day, today);
          const chosen = isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              className={`calendar-day ${!isSameMonth(day, month) ? "outside" : ""} ${current ? "today" : ""} ${chosen ? "selected" : ""}`}
              onClick={() => onSelect(day)}
              aria-label={format(day, "PPPP")}
              aria-current={current ? "date" : undefined}
              aria-pressed={chosen}
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
        <span><i className="legend-selected" /> Selected</span>
        <span><i className="legend-today" /> Today</span>
        <span className="legend-note">Dots reflect how each dream felt</span>
      </div>
    </section>
  );
}
