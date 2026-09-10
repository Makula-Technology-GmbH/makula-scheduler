import { CellUnit } from '../config/default';

/** Minutes in a full day — the scale a day cell falls back to. */
export const DAY_MINUTES = 1440;

/**
 * Smallest width (px) an event keeps in a day cell. Events that sit outside the
 * cell's working window collapse onto its edge, and a zero-width box would be
 * neither visible nor clickable.
 */
export const MIN_DAY_CELL_EVENT_WIDTH = 4;

const clamp01 = value => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/** Gap the cell leaves on its left, so events don't sit on the grid line. */
const cellLead = index => (index > 0 ? 2 : 3);

/** Width available inside a cell once both gaps are taken off. */
const cellInnerWidth = (cellWidth, index) => Math.max(0, cellWidth - (index > 0 ? 5 : 6));

/**
 * Resolves the working window of one day cell, as minutes from midnight.
 *
 * Consumers opt in through `behaviors.getDayCellWorkingWindowFunc`, which is
 * asked per resource and per day. A falsy or invalid result means "no working
 * window", and the cell keeps spanning the full 24 hours — which is what a day
 * off should look like.
 */
export const getDayCellWorkingWindow = (schedulerData, slotId, time) => {
  const { behaviors, cellUnit } = schedulerData;
  const resolver = behaviors && behaviors.getDayCellWorkingWindowFunc;
  if (cellUnit !== CellUnit.Day || typeof resolver !== 'function') return null;

  const workingWindow = resolver(schedulerData, slotId, time);
  if (!workingWindow) return null;

  const from = Number(workingWindow.from);
  const to = Number(workingWindow.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  if (from < 0 || to > DAY_MINUTES || to <= from) return null;

  return { from, to };
};

/**
 * Where `minutesFromMidnight` sits inside its day cell, as a 0..1 fraction of
 * the cell width.
 *
 * With a working window the cell spans [from, to] rather than the whole day, so
 * an event that exactly fills the working hours fills the cell. Time outside the
 * window is clamped onto the nearest cell edge.
 */
export const getDayCellFraction = (minutesFromMidnight, workingWindow) => {
  if (!workingWindow) return clamp01(minutesFromMidnight / DAY_MINUTES);
  return clamp01((minutesFromMidnight - workingWindow.from) / (workingWindow.to - workingWindow.from));
};

/** Horizontal position of `fraction` within the cell at `index`. */
export const getDayCellX = (cellWidth, index, fraction) =>
  index * cellWidth + cellLead(index) + cellInnerWidth(cellWidth, index) * fraction;

/**
 * Left/width of a day-cell bar running from `startFraction` of the cell at
 * `startIndex` to `endFraction` of the cell at `endIndex`. A bar squeezed to
 * nothing by the working window keeps `MIN_DAY_CELL_EVENT_WIDTH` and is nudged
 * back so it stays inside its last cell.
 */
export const getDayCellBarGeometry = (cellWidth, startIndex, startFraction, endIndex, endFraction) => {
  const startX = getDayCellX(cellWidth, startIndex, startFraction);
  const endX = getDayCellX(cellWidth, endIndex, endFraction);
  const width = Math.max(MIN_DAY_CELL_EVENT_WIDTH, endX - startX);
  const cellStartX = getDayCellX(cellWidth, startIndex, 0);
  const cellEndX = getDayCellX(cellWidth, endIndex, 1);
  const left = startX + width > cellEndX ? Math.max(cellStartX, cellEndX - width) : startX;

  return { left, width };
};

/**
 * Left/width of a bar covering [start, end] across `cellSpan` day cells from
 * `startIndex`, measured against the working window of the cell each end falls
 * in. Cells without a working window keep the full-day scale.
 */
export const getDayCellRangeGeometry = (schedulerData, resourceEvents, startIndex, cellSpan, start, end, cellWidth) => {
  const { localeDayjs } = schedulerData;
  const { headerItems, slotId } = resourceEvents;
  const endIndex = Math.min(startIndex + Math.max(1, cellSpan) - 1, headerItems.length - 1);
  const startCell = headerItems[startIndex];
  const endCell = headerItems[endIndex];

  const startDayStart = localeDayjs(new Date(startCell.start)).startOf('day');
  const endDayStart = endIndex === startIndex ? startDayStart : localeDayjs(new Date(endCell.start)).startOf('day');
  const startWindow = getDayCellWorkingWindow(schedulerData, slotId, startCell.time);
  const endWindow =
    endIndex === startIndex ? startWindow : getDayCellWorkingWindow(schedulerData, slotId, endCell.time);

  return getDayCellBarGeometry(
    cellWidth,
    startIndex,
    getDayCellFraction(localeDayjs(start).diff(startDayStart, 'minute'), startWindow),
    endIndex,
    getDayCellFraction(localeDayjs(end).diff(endDayStart, 'minute'), endWindow)
  );
};
