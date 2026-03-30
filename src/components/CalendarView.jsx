import { useState } from "react";

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const TODAY_KEY = toDateKey(new Date());
const DOW       = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * CalendarView
 *
 * ownSessions   – sessions belonging to the current user → yellow dots
 * otherSessions – sessions from other trainers          → blue dots
 * sessions      – backward-compat alias for ownSessions
 */
export default function CalendarView({
  sessions      = [],   // backward-compat
  ownSessions,          // yellow dots
  otherSessions = [],   // blue dots
  onDayClick,
  selectedDay,
}) {
  const own   = ownSessions ?? sessions;   // resolve backward-compat

  const [monthRef, setMonthRef] = useState(() => {
    const base = selectedDay ? new Date(selectedDay + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year  = monthRef.getFullYear();
  const month = monthRef.getMonth();

  // Build sets for O(1) day lookups
  const ownDays   = new Set(own.map((s) => s.date));
  const otherDays = new Set(otherSessions.map((s) => s.date));

  const firstDow    = new Date(year, month, 1).getDay();
  const offset      = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < offset; i++)    cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const title = monthRef.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="calendar-card">
      <div className="cal-header">
        <button className="week-btn" onClick={() => setMonthRef(new Date(year, month - 1, 1))}>‹</button>
        <span className="cal-title">{title}</span>
        <button className="week-btn" onClick={() => setMonthRef(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}

        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const key        = toDateKey(day);
          const isToday    = key === TODAY_KEY;
          const isSelected = selectedDay && key === selectedDay && key !== TODAY_KEY;
          const hasOwn     = ownDays.has(key);
          const hasOther   = otherDays.has(key);

          return (
            <div
              key={key}
              className={`cal-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
              onClick={() => onDayClick?.(day)}
            >
              <span className="cal-day-num">{day.getDate()}</span>

              {/* Two-color dot row — yellow for own, blue for others */}
              {(hasOwn || hasOther) && (
                <div className="cal-dots">
                  {hasOwn   && <span className="cal-dot" />}
                  {hasOther && <span className="cal-dot blue" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
