import { PropTypes } from 'prop-types';
import React, { Component } from 'react';
import { useDrop } from 'react-dnd';
import { CellUnit, DATETIME_FORMAT, DnDTypes, SummaryPos } from '../config/default';
import { getDayCellRangeGeometry } from '../helper/dayCellWindow';
import { getPos } from '../helper/utility';
import AddMore from './AddMore';
import EventItem from './EventItem';
import SelectedArea from './SelectedArea';
import Summary from './Summary';

class ResourceEvents extends Component {
  static propTypes = {
    resourceEvents: PropTypes.object.isRequired,
    schedulerData: PropTypes.object.isRequired,
    dndSource: PropTypes.object.isRequired,
    onSetAddMoreState: PropTypes.func,
    updateEventStart: PropTypes.func,
    updateEventEnd: PropTypes.func,
    moveEvent: PropTypes.func,
    movingEvent: PropTypes.func,
    conflictOccurred: PropTypes.func,
    subtitleGetter: PropTypes.func,
    eventItemClick: PropTypes.func,
    viewEventClick: PropTypes.func,
    viewEventText: PropTypes.string,
    viewEvent2Click: PropTypes.func,
    viewEvent2Text: PropTypes.string,
    newEvent: PropTypes.func,
    eventItemTemplateResolver: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      isSelecting: false,
      left: 0,
      width: 0,
    };
    this.supportTouch = false; // 'ontouchstart' in window;
  }

  componentDidMount() {
    const { schedulerData } = this.props;
    const { config } = schedulerData;
    this.supportTouch = 'ontouchstart' in window;

    if (config.creatable === true) {
      this.supportTouchHelper();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      const { schedulerData } = this.props;
      this.supportTouchHelper('remove');
      if (schedulerData.config.creatable) {
        this.supportTouchHelper();
      }
    }
  }

  supportTouchHelper = (evType = 'add') => {
    const ev = evType === 'add' ? this.eventContainer.addEventListener : this.eventContainer.removeEventListener;
    if (this.supportTouch) {
      // ev('touchstart', this.initDrag, false);
    } else {
      ev('mousedown', this.initDrag, false);
    }
  };

  initDrag = ev => {
    const { isSelecting } = this.state;
    if (isSelecting) return;
    if ((ev.srcElement || ev.target) !== this.eventContainer) return;

    ev.stopPropagation();

    const { resourceEvents } = this.props;
    if (resourceEvents.groupOnly) return;
    const [clientX, toReturn] = this.dragHelper(ev, 'init');

    if (toReturn) {
      return;
    }

    const { schedulerData } = this.props;
    const cellWidth = schedulerData.getContentCellWidth();
    const pos = getPos(this.eventContainer);
    const startX = clientX - pos.x;
    const leftIndex = Math.floor(startX / cellWidth);
    const left = leftIndex * cellWidth;
    const rightIndex = Math.ceil(startX / cellWidth);
    const width = (rightIndex - leftIndex) * cellWidth;

    this.setState({ startX, left, leftIndex, width, rightIndex, isSelecting: true });

    if (this.supportTouch) {
      document.documentElement.addEventListener('touchmove', this.doDrag, false);
      document.documentElement.addEventListener('touchend', this.stopDrag, false);
      document.documentElement.addEventListener('touchcancel', this.cancelDrag, false);
    } else {
      document.documentElement.addEventListener('mousemove', this.doDrag, false);
      document.documentElement.addEventListener('mouseup', this.stopDrag, false);
    }
    document.onselectstart = () => false;
    document.ondragstart = () => false;
  };

  doDrag = ev => {
    ev.stopPropagation();

    const [clientX, toReturn] = this.dragHelper(ev, 'do');

    if (toReturn) {
      return;
    }
    const { startX } = this.state;
    const { schedulerData } = this.props;
    const { headers } = schedulerData;
    const cellWidth = schedulerData.getContentCellWidth();
    const pos = getPos(this.eventContainer);
    const currentX = clientX - pos.x;
    let leftIndex = Math.floor(Math.min(startX, currentX) / cellWidth);
    leftIndex = leftIndex < 0 ? 0 : leftIndex;
    const left = leftIndex * cellWidth;
    let rightIndex = Math.ceil(Math.max(startX, currentX) / cellWidth);
    rightIndex = rightIndex > headers.length ? headers.length : rightIndex;
    const width = (rightIndex - leftIndex) * cellWidth;

    this.setState({ leftIndex, left, rightIndex, width, isSelecting: true });
  };

  dragHelper = (ev, dragType) => {
    let clientX = 0;
    if (this.supportTouch) {
      if (ev.changedTouches.length === 0) return [clientX, true];
      const touch = ev.changedTouches[0];
      clientX = touch.pageX;
    } else if (dragType === 'init') {
      if (ev.buttons !== undefined && ev.buttons !== 1) return [clientX, true];
      clientX = ev.clientX;
    } else {
      clientX = ev.clientX;
    }
    return [clientX, false];
  };

  stopDrag = ev => {
    ev.stopPropagation();

    const { schedulerData, newEvent, resourceEvents } = this.props;
    const { headers, events, config, cellUnit, localeDayjs } = schedulerData;
    const { leftIndex, rightIndex } = this.state;
    if (this.supportTouch) {
      document.documentElement.removeEventListener('touchmove', this.doDrag, false);
      document.documentElement.removeEventListener('touchend', this.stopDrag, false);
      document.documentElement.removeEventListener('touchcancel', this.cancelDrag, false);
    } else {
      document.documentElement.removeEventListener('mousemove', this.doDrag, false);
      document.documentElement.removeEventListener('mouseup', this.stopDrag, false);
    }
    document.onselectstart = null;
    document.ondragstart = null;

    const startTime = headers[leftIndex].time;
    let endTime = resourceEvents.headerItems[rightIndex - 1].end;
    if (cellUnit !== CellUnit.Hour) {
      endTime = localeDayjs(new Date(resourceEvents.headerItems[rightIndex - 1].start))
        .hour(23)
        .minute(59)
        .second(59)
        .format(DATETIME_FORMAT);
    }
    const { slotId } = resourceEvents;
    const { slotName } = resourceEvents;

    this.setState({
      startX: 0,
      leftIndex: 0,
      left: 0,
      rightIndex: 0,
      width: 0,
      isSelecting: false,
    });

    let hasConflict = false;
    if (config.checkConflict) {
      const start = localeDayjs(new Date(startTime));
      const end = localeDayjs(endTime);

      events.forEach(e => {
        if (schedulerData._getEventSlotId(e) === slotId) {
          const eStart = localeDayjs(e.start);
          const eEnd = localeDayjs(e.end);
          if (
            (start >= eStart && start < eEnd) ||
            (end > eStart && end <= eEnd) ||
            (eStart >= start && eStart < end) ||
            (eEnd > start && eEnd <= end)
          )
            hasConflict = true;
        }
      });
    }

    if (hasConflict && !config.allowConflicts) {
      const { conflictOccurred } = this.props;
      if (conflictOccurred !== undefined) {
        conflictOccurred(
          schedulerData,
          'New',
          { id: undefined, start: startTime, end: endTime, slotId, slotName, title: undefined },
          DnDTypes.EVENT,
          slotId,
          slotName,
          startTime,
          endTime
        );
      } else {
        console.log('Conflict occurred, set conflictOccurred func in Scheduler to handle it');
      }
      return;
    }

    if (newEvent !== undefined) newEvent(schedulerData, slotId, slotName, startTime, endTime);

    if (hasConflict && config.allowConflicts) {
      const { conflictOccurred } = this.props;
      if (conflictOccurred !== undefined) {
        conflictOccurred(
          schedulerData,
          'New',
          { id: undefined, start: startTime, end: endTime, slotId, slotName, title: undefined },
          DnDTypes.EVENT,
          slotId,
          slotName,
          startTime,
          endTime
        );
      } else {
        console.log('Conflict occurred, set conflictOccurred func in Scheduler to handle it');
      }
    }
  };

  cancelDrag = ev => {
    ev.stopPropagation();

    const { isSelecting } = this.state;
    if (isSelecting) {
      document.documentElement.removeEventListener('touchmove', this.doDrag, false);
      document.documentElement.removeEventListener('touchend', this.stopDrag, false);
      document.documentElement.removeEventListener('touchcancel', this.cancelDrag, false);
      document.onselectstart = null;
      document.ondragstart = null;
      this.setState({
        startX: 0,
        leftIndex: 0,
        left: 0,
        rightIndex: 0,
        width: 0,
        isSelecting: false,
      });
    }
  };

  onAddMoreClick = headerItem => {
    const { onSetAddMoreState, resourceEvents, schedulerData } = this.props;
    if (onSetAddMoreState) {
      const { config } = schedulerData;
      const cellWidth = schedulerData.getContentCellWidth();
      const index = resourceEvents.headerItems.indexOf(headerItem);
      if (index !== -1) {
        let left = index * (cellWidth - 1);
        const pos = getPos(this.eventContainer);
        left += pos.x;
        const top = pos.y;
        const height = (headerItem.count + 1) * config.eventItemLineHeight + 20;

        onSetAddMoreState({
          headerItem,
          left,
          top,
          height,
        });
      }
    }
  };

  eventContainerRef = element => {
    this.eventContainer = element;
    // Also set the drop ref if it exists
    const { dropRef } = this.props;
    if (dropRef) {
      dropRef(element);
    }
  };

  render() {
    const { resourceEvents, schedulerData, dndSource } = this.props;
    const { cellUnit, startDate, endDate, config, localeDayjs } = schedulerData;
    const { isSelecting, left, width } = this.state;
    const cellWidth = schedulerData.getContentCellWidth();
    const cellMaxEvents = schedulerData.getCellMaxEvents();
    const rowWidth = schedulerData.getContentTableWidth();

    const selectedArea = isSelecting ? <SelectedArea {...this.props} left={left} width={width} /> : <div />;

    const eventList = [];
    resourceEvents.headerItems.forEach((headerItem, index) => {
      if (headerItem.count > 0 || headerItem.summary !== undefined) {
        const isTop =
          config.summaryPos === SummaryPos.TopRight ||
          config.summaryPos === SummaryPos.Top ||
          config.summaryPos === SummaryPos.TopLeft;
        const marginTop = resourceEvents.hasSummary && isTop ? 1 + config.eventItemLineHeight : 1;
        const renderEventsMaxIndex = headerItem.addMore === 0 ? cellMaxEvents : headerItem.addMoreIndex;

        headerItem.events.forEach((evt, idx) => {
          if (idx < renderEventsMaxIndex && evt !== undefined && evt.render) {
            let durationStart = localeDayjs(new Date(startDate));
            let durationEnd = localeDayjs(endDate);
            if (cellUnit === CellUnit.Hour) {
              durationStart = localeDayjs(new Date(startDate)).add(config.dayStartFrom, 'hours');
              durationEnd = localeDayjs(endDate).add(config.dayStopTo + 1, 'hours');
            }
            const eventStart = localeDayjs(evt.eventItem.start);
            const eventEnd = localeDayjs(evt.eventItem.end);
            let isStart = eventStart >= durationStart;
            let isEnd = eventEnd <= durationEnd;
            let left = index * cellWidth + (index > 0 ? 2 : 3);
            let width = evt.span * cellWidth - (index > 0 ? 5 : 6) > 0 ? evt.span * cellWidth - (index > 0 ? 5 : 6) : 0;

            if (cellUnit === CellUnit.Day) {
              // A day cell spans the resource's working hours for that day when
              // behaviors.getDayCellWorkingWindowFunc resolves them, so an event
              // filling those hours fills the cell. Days without a working
              // window keep the full-day scale.
              const geometry = getDayCellRangeGeometry(
                schedulerData,
                resourceEvents,
                index,
                evt.span,
                evt.eventItem.start,
                evt.eventItem.end,
                cellWidth
              );

              left = geometry.left;
              width = geometry.width;
            } else {
              width = evt.span * cellWidth - (index > 0 ? 5 : 6) > 0 ? evt.span * cellWidth - (index > 0 ? 5 : 6) : 0;
            }

            if (config.overflowArrowsEnabled !== false) {
              if (!isStart) {
                const originalLeft = left;
                left = index * cellWidth;
                width += originalLeft - left;
              }
              if (!isEnd) {
                const rightEdge = (index + evt.span) * cellWidth;
                width = rightEdge - left;
              }
            }

            const top = marginTop + idx * config.eventItemLineHeight;
            const eventItem = (
              <EventItem
                {...this.props}
                key={`${evt.eventItem.id}_${headerItem.time}`}
                eventItem={evt.eventItem}
                dndSource={dndSource}
                isStart={isStart}
                isEnd={isEnd}
                isInPopover={false}
                left={left}
                width={width}
                top={top}
                leftIndex={index}
                rightIndex={index + evt.span}
              />
            );
            eventList.push(eventItem);
          }
        });

        if (headerItem.addMore > 0) {
          const left = index * cellWidth + (index > 0 ? 2 : 3);
          const width = cellWidth - (index > 0 ? 5 : 6);
          const top = marginTop + headerItem.addMoreIndex * config.eventItemLineHeight;
          const addMoreItem = (
            <AddMore
              {...this.props}
              key={headerItem.time}
              headerItem={headerItem}
              number={headerItem.addMore}
              left={left}
              width={width}
              top={top}
              clickAction={this.onAddMoreClick}
            />
          );
          eventList.push(addMoreItem);
        }

        if (headerItem.summary !== undefined) {
          const top = isTop ? 1 : resourceEvents.rowHeight - config.eventItemLineHeight + 1;
          const left = index * cellWidth + (index > 0 ? 2 : 3);
          const width = cellWidth - (index > 0 ? 5 : 6);
          const key = `${resourceEvents.slotId}_${headerItem.time}`;
          const summary = (
            <Summary
              key={key}
              schedulerData={schedulerData}
              summary={headerItem.summary}
              left={left}
              width={width}
              top={top}
            />
          );
          eventList.push(summary);
        }
      }
    });

    const { dropPreview } = this.props;
    let dropPreviewElement = null;
    if (dropPreview && config.dropPreviewEnabled !== false) {
      const idx = dropPreview.leftIndex;
      let previewLeft = idx * cellWidth + (idx > 0 ? 2 : 3);
      let previewWidth = dropPreview.cellSpan * cellWidth - (idx > 0 ? 5 : 6);

      if (cellUnit === CellUnit.Day) {
        // Same working-hours scale as the events themselves, so the preview
        // lands where the event will be drawn.
        const geometry = getDayCellRangeGeometry(
          schedulerData,
          resourceEvents,
          idx,
          dropPreview.cellSpan,
          dropPreview.newStart,
          dropPreview.newEnd,
          cellWidth
        );

        previewLeft = geometry.left;
        previewWidth = geometry.width;
      }

      const { eventItemTemplateResolver } = this.props;
      let previewContent = (
        <div
          className="round-all event-item"
          style={{
            height: dropPreview.eventItemHeight,
            backgroundColor: dropPreview.bgColor,
          }}
        >
          <span style={{ marginLeft: '10px', lineHeight: `${dropPreview.eventItemHeight}px` }}>
            {dropPreview.title}
          </span>
        </div>
      );
      if (eventItemTemplateResolver && dropPreview.eventItem) {
        previewContent = eventItemTemplateResolver(
          schedulerData,
          dropPreview.eventItem,
          dropPreview.bgColor,
          true,
          true,
          'event-item',
          dropPreview.eventItemHeight,
          undefined
        );
      }

      dropPreviewElement = (
        <a
          className="timeline-event drop-preview"
          style={{ left: previewLeft, width: Math.max(0, previewWidth), top: 1 }}
        >
          {previewContent}
        </a>
      );
    }

    const eventContainer = (
      <div ref={this.eventContainerRef} className="event-container" style={{ height: resourceEvents.rowHeight }}>
        {selectedArea}
        {dropPreviewElement}
        {eventList}
      </div>
    );
    return (
      <tr>
        <td style={{ width: rowWidth }}>{eventContainer}</td>
      </tr>
    );
  }
}

// Wrapper component to use useDrop hook
const ResourceEventsWithDnD = props => {
  const { schedulerData, dndContext } = props;
  const { config } = schedulerData;
  const componentRef = React.useRef(null);

  // Always call useDrop unconditionally (Rules of Hooks)
  // Disable functionality when drag and drop is not enabled
  const [{ isOver, canDrop, dropPreview }, dropRef] = useDrop(() => {
    // If drag and drop is disabled, return a no-op spec
    if (!config.dragAndDropEnabled || !dndContext) {
      return {
        accept: [],
        collect: () => ({ isOver: false, canDrop: false, dropPreview: null }),
      };
    }

    const spec = dndContext.getDropSpec();
    return {
      accept: [...dndContext.sourceMap.keys()],
      drop: (item, monitor) => spec.drop(props, monitor, componentRef.current),
      hover: (item, monitor) => spec.hover(props, monitor, componentRef.current),
      canDrop: (item, monitor) => spec.canDrop(props, monitor),
      collect: monitor => {
        const over = monitor.isOver();
        const drop = monitor.canDrop();
        let preview = null;
        if (over && drop) {
          // Reading getClientOffset subscribes collect to offset changes during drag
          monitor.getClientOffset();
          const item = monitor.getItem();
          if (item && item._dropPreview && item._dropPreview.slotId === props.resourceEvents.slotId) {
            preview = item._dropPreview;
          }
        }
        return { isOver: over, canDrop: drop, dropPreview: preview };
      },
    };
  }, [props, dndContext, config.dragAndDropEnabled]);

  return (
    <ResourceEvents
      ref={componentRef}
      {...props}
      dropRef={dropRef}
      isOver={isOver}
      canDrop={canDrop}
      dropPreview={dropPreview}
    />
  );
};

ResourceEventsWithDnD.displayName = 'ResourceEventsWithDnD';

export default ResourceEventsWithDnD;
