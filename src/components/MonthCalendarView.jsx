import { Popover } from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import React, { useMemo } from 'react';
import '../css/month-calendar.css';

dayjs.extend(isoWeek);

const DEFAULT_BG_COLOR = '#80C5F6';

function buildMonthGrid(date, weekStartsOn) {
  const current = dayjs(date);
  const firstOfMonth = current.startOf('month');
  const lastOfMonth = current.endOf('month');

  // Find the start of the grid (first day of the week containing the 1st)
  let gridStart;
  if (weekStartsOn === 1) {
    // Monday start
    gridStart = firstOfMonth.startOf('isoWeek');
  } else {
    // Sunday start
    const day = firstOfMonth.day();
    gridStart = day === 0 ? firstOfMonth : firstOfMonth.subtract(day, 'days');
  }

  // Build weeks until we pass the end of the month
  const weeks = [];
  let cursor = gridStart;

  while (cursor.isBefore(lastOfMonth) || cursor.isSame(lastOfMonth, 'day') || weeks.length === 0) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: cursor,
        isCurrentMonth: cursor.month() === current.month() && cursor.year() === current.year(),
        isToday: cursor.isSame(dayjs(), 'day'),
      });
      cursor = cursor.add(1, 'day');
    }
    weeks.push(week);
    // Stop if we've filled weeks beyond the month
    if (cursor.month() !== current.month() && weeks.length >= 4) {
      // Check if we need one more week
      if (cursor.isAfter(lastOfMonth)) break;
    }
  }

  return weeks;
}

function getEventsForDay(events, day) {
  const dayStart = day.startOf('day');
  const dayEnd = day.endOf('day');

  return events.filter(event => {
    const eventStart = dayjs(event.start);
    const eventEnd = dayjs(event.end);
    return eventStart.isBefore(dayEnd) && eventEnd.isAfter(dayStart);
  });
}

function getDayHeaderLabels(weekStartsOn, headerFormat) {
  const base = weekStartsOn === 1 ? dayjs().startOf('isoWeek') : dayjs().day(0);
  const labels = [];
  for (let i = 0; i < 7; i++) {
    labels.push(base.add(i, 'day').format(headerFormat));
  }
  return labels;
}

function EventPill({ event, eventItemPopoverEnabled, eventItemPopoverTrigger, CustomEventPopover, onEventClick }) {
  const bgColor = event.bgColor || DEFAULT_BG_COLOR;
  const startTime = dayjs(event.start);
  const endTime = dayjs(event.end);

  const pill = (
    <span
      className="rbs-month-calendar-event"
      style={{ backgroundColor: bgColor }}
      onClick={e => {
        if (onEventClick) {
          e.stopPropagation();
          onEventClick(event);
        }
      }}
      title={event.title}
    >
      {event.title}
    </span>
  );

  if (!eventItemPopoverEnabled) {
    return pill;
  }

  const popoverContent = CustomEventPopover ? (
    CustomEventPopover(event, event.title, startTime, endTime, bgColor)
  ) : (
    <div style={{ width: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: bgColor,
            marginRight: 8,
            flexShrink: 0,
          }}
        />
        <span
          style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {event.title}
        </span>
      </div>
      <div style={{ color: '#666', fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>{startTime.format('HH:mm')}</span>
        <span style={{ margin: '0 6px', color: '#999' }}>{startTime.format('MMM D')}</span>
        <span style={{ margin: '0 4px' }}>-</span>
        <span style={{ fontWeight: 500 }}>{endTime.format('HH:mm')}</span>
        <span style={{ margin: '0 6px', color: '#999' }}>{endTime.format('MMM D')}</span>
      </div>
    </div>
  );

  return (
    <Popover content={popoverContent} trigger={eventItemPopoverTrigger} placement="bottomLeft">
      {pill}
    </Popover>
  );
}

EventPill.propTypes = {
  event: PropTypes.object.isRequired,
  eventItemPopoverEnabled: PropTypes.bool,
  eventItemPopoverTrigger: PropTypes.string,
  CustomEventPopover: PropTypes.func,
  onEventClick: PropTypes.func,
};

function MonthCalendarView({
  events = [],
  date,
  onEventClick,
  CustomEventPopover,
  eventItemPopoverEnabled = true,
  eventItemPopoverTrigger = 'hover',
  maxEventsPerCell = 3,
  onMoreClick,
  weekStartsOn = 1,
  headerFormat = 'ddd',
  className,
}) {
  const currentDate = date ? dayjs(date) : dayjs();

  const weeks = useMemo(() => buildMonthGrid(currentDate, weekStartsOn), [currentDate.format('YYYY-MM'), weekStartsOn]);

  const dayHeaders = useMemo(() => getDayHeaderLabels(weekStartsOn, headerFormat), [weekStartsOn, headerFormat]);

  const rootClassName = ['rbs-month-calendar', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {dayHeaders.map((label, i) => (
        <div key={`header-${i}`} className="rbs-month-calendar-header-cell">
          {label}
        </div>
      ))}

      {weeks.map((week, wi) =>
        week.map((day, di) => {
          const dayEvents = getEventsForDay(events, day.date);
          const visibleEvents = dayEvents.slice(0, maxEventsPerCell);
          const overflowCount = dayEvents.length - maxEventsPerCell;

          const cellClasses = [
            'rbs-month-calendar-cell',
            !day.isCurrentMonth && 'rbs-month-calendar-cell--outside',
            day.isToday && 'rbs-month-calendar-cell--today',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={`${wi}-${di}`} className={cellClasses}>
              <div className="rbs-month-calendar-day-number">{day.date.date()}</div>
              <div className="rbs-month-calendar-events">
                {visibleEvents.map(event => (
                  <EventPill
                    key={event.id}
                    event={event}
                    eventItemPopoverEnabled={eventItemPopoverEnabled}
                    eventItemPopoverTrigger={eventItemPopoverTrigger}
                    CustomEventPopover={CustomEventPopover}
                    onEventClick={onEventClick}
                  />
                ))}
                {overflowCount > 0 && (
                  <button
                    className="rbs-month-calendar-more"
                    type="button"
                    onClick={() => {
                      if (onMoreClick) onMoreClick(day.date, dayEvents);
                    }}
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

MonthCalendarView.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      start: PropTypes.string.isRequired,
      end: PropTypes.string.isRequired,
      bgColor: PropTypes.string,
    })
  ),
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onEventClick: PropTypes.func,
  CustomEventPopover: PropTypes.func,
  eventItemPopoverEnabled: PropTypes.bool,
  eventItemPopoverTrigger: PropTypes.string,
  maxEventsPerCell: PropTypes.number,
  onMoreClick: PropTypes.func,
  weekStartsOn: PropTypes.oneOf([0, 1]),
  headerFormat: PropTypes.string,
  className: PropTypes.string,
};

export default MonthCalendarView;
