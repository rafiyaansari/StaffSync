import { useMemo, useState } from 'react';
import Icon from '../ui/Icon';
import { getMonthMatrix, monthLabel, startOfMonth } from '../../utils/date';
import { ATTENDED_STATUSES } from '../../utils/selectors';
import { TONE_HEX } from '../../utils/ui';

const LEGEND = [
  { status: 'Present', color: '#0a9468' },
  { status: 'WFH', color: '#2f6fed' },
  { status: 'Late', color: '#c07a12' },
  { status: 'On leave', color: '#7a4ee8' },
  { status: 'Absent', color: '#d43a52' },
];

const CLASS_BY_STATUS = {
  Present: 'present',
  WFH: 'wfh',
  Late: 'late',
  'On leave': 'leave',
  Absent: 'absent',
};

export default function AttendanceCalendar({ recordsByDate = {}, compact = false }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const matrix = useMemo(() => getMonthMatrix(month), [month]);
  const currentMonthStart = startOfMonth(new Date());
  const canNext = month < currentMonthStart;

  const goMonth = (offset) => {
    const next = new Date(month);
    next.setMonth(month.getMonth() + offset);
    setMonth(next);
  };

  return (
    <div className={`att-cal ${compact ? 'att-cal--compact' : ''}`.trim()}>
      <div className="att-cal__head">
        <div>
          <p className="att-cal__month">{monthLabel(month)}</p>
          <p className="att-cal__sub">Your logged days at a glance</p>
        </div>
        <div className="att-cal__nav">
          <button type="button" className="icon-button icon-button--sm" onClick={() => goMonth(-1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            className="icon-button icon-button--sm"
            onClick={() => goMonth(1)}
            disabled={!canNext}
            aria-label="Next month"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      <div className="att-cal__weekdays" aria-hidden="true">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="att-cal__grid">
        {matrix.flat().map((day) => {
          const record = recordsByDate[day.iso];
          const statusClass = record ? CLASS_BY_STATUS[record.status] || 'neutral' : '';
          const title = record
            ? `${day.iso} · ${record.status}${record.checkIn ? ` · in ${record.checkIn}` : ''}${
                record.checkOut ? ` · out ${record.checkOut}` : ''
              }`
            : day.iso;
          return (
            <div
              key={day.iso}
              className={`att-cal__cell ${!day.inMonth ? 'is-outside' : ''} ${
                day.isToday ? 'is-today' : ''
              } ${statusClass ? `is-${statusClass}` : ''}`.trim()}
              title={title}
            >
              <span className="att-cal__day">{day.date.getDate()}</span>
              {record ? <span className="att-cal__dot" /> : null}
            </div>
          );
        })}
      </div>

      <div className="att-cal__legend">
        {LEGEND.map((item) => (
          <span className="att-cal__legend-item" key={item.status}>
            <span className="att-cal__legend-dot" style={{ background: item.color }} />
            {item.status}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AttendedDot() {
  return <span className="att-status-dot" style={{ background: TONE_HEX.green }} />;
}

export { ATTENDED_STATUSES };
