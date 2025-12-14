// frontend/src/services/rescheduleRemaining.js

/**
 * rescheduleRemaining(schedule, completedIds, fromDate, dailyCapacityHours)
 * - schedule: array of { date, tasks: [ { id, text, hours, done, ... } ] }
 * - completedIds: Set or array of task ids that are already done
 * - fromDate: string or Date to start redistributing remaining tasks (default today)
 * - dailyCapacityHours: hours/day available
 *
 * Returns: new schedule array (dates from fromDate forward)
 */
export default function rescheduleRemaining({
  schedule = [],
  completedIds = new Set(),
  fromDate = new Date(),
  dailyCapacityHours = 2
} = {}) {
  // Simple safe implementation:
  // - flatten remaining tasks (not in completedIds)
  // - pack them into days starting at fromDate with 'dailyCapacityHours'
  const remaining = [];
  for (const day of schedule) {
    for (const t of (day.tasks || [])) {
      if (!completedIds.has(t.id)) remaining.push({ ...t, done: false });
    }
  }

  // helper to format YYYY-MM-DD
  function isoDate(d) {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  const out = [];
  let dayIndex = 0;
  let i = 0;
  while (i < remaining.length) {
    // allocate a day
    const date = isoDate(new Date(new Date(fromDate).getTime() + dayIndex * 86400000));
    let capacity = Number(dailyCapacityHours) || 1;
    const dayTasks = [];
    while (i < remaining.length && capacity >= (remaining[i].hours || 1)) {
      const t = remaining[i++];
      dayTasks.push({ ...t });
      capacity -= (t.hours || 1);
    }
    out.push({ date, tasks: dayTasks });
    dayIndex += 1;
  }

  return out;
}