// frontend/src/services/api.js
// Small in-memory helper "API" for the Learning Path generator.
// No external keys or network calls. Pure JS scheduling logic.

/**
 * Utilities
 */
function isoDate(d) {
  const dt = typeof d === "string" ? new Date(d) : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

/** tiny id generator */
let _idCounter = Date.now() % 100000;
function nextId() {
  _idCounter += 1;
  return String(_idCounter);
}

/**
 * buildTaskList
 * Create a flat array of tasks from goal + skills + weeks+tasksPerWeek
 * Each task: { id, text, hours, done }
 */
export function buildTaskList({ goal, skills = [], weeksCount = 8, tasksPerWeek = 3 }) {
  // ensure skills is array
  const skillList = Array.isArray(skills) ? skills : (skills ? String(skills).split(",").map(s => s.trim()).filter(Boolean) : []);
  const total = Math.max(1, weeksCount * tasksPerWeek);
  const tasks = [];

  for (let i = 0; i < total; i += 1) {
    const topic = skillList.length ? skillList[i % skillList.length] : "Foundations";
    const text = goal ? `${topic} — ${goal} (task ${i + 1})` : `${topic} — task ${i + 1}`;
    tasks.push({
      id: nextId(),
      text,
      // default 1 hour per task; you can change logic to weight some tasks heavier
      hours: 1,
      done: false,
    });
  }

  return tasks;
}

/**
 * packTasksToDays
 * Pack a flat task list into consecutive days, honoring dailyCapacityHours.
 * startDate: 'YYYY-MM-DD' string (defaults to today)
 * Returns array: [{ date: 'YYYY-MM-DD', tasks: [...] }, ...]
 */
export function packTasksToDays({ tasks = [], startDate = isoDate(new Date()), dailyCapacityHours = 2 }) {
  // shallow copy so we can shift()
  const tasksCopy = tasks.map(t => ({ ...t }));
  const schedule = [];
  let dayIndex = 0;

  while (tasksCopy.length) {
    const dateIso = isoDate(addDays(startDate, dayIndex));
    let remainingHours = Number(dailyCapacityHours) || 1;
    const dayTasks = [];

    // pack tasks that fit into remainingHours
    while (tasksCopy.length && remainingHours >= (tasksCopy[0].hours || 1)) {
      const t = tasksCopy.shift();
      dayTasks.push(t);
      remainingHours -= (t.hours || 1);
    }

    // if nothing fit (task hours > capacity) assign one anyway
    if (!dayTasks.length && tasksCopy.length) {
      dayTasks.push(tasksCopy.shift());
    }

    schedule.push({ date: dateIso, tasks: dayTasks });
    dayIndex += 1;
  }

  return schedule;
}

/**
 * groupDaysToWeeks
 * Group daily schedule into weeks (Monday-start is optional; we simply chunk into 7-day buckets here).
 * Returns array: [{ week: 1, startDate: 'YYYY-MM-DD', days: [ {date, tasks}, ... ] }, ...]
 */
export function groupDaysToWeeks(dailySchedule = []) {
  const weeks = [];
  for (let i = 0; i < dailySchedule.length; i += 7) {
    const chunk = dailySchedule.slice(i, i + 7);
    weeks.push({
      week: Math.floor(i / 7) + 1,
      startDate: chunk[0] ? chunk[0].date : null,
      days: chunk,
    });
  }
  return weeks;
}

/**
 * rescheduleRemaining
 * Rebuilds a schedule while keeping completed tasks on their original dates.
 * - schedule: existing schedule (array of {date, tasks})
 * - completedIds: Set or array of task ids that are done
 * - fromDate: ISO date string to start re-allocating remaining tasks (default today)
 * - dailyCapacityHours: hours per day for packing
 *
 * Returns new daily schedule array [{ date, tasks }]
 */
export function rescheduleRemaining({ schedule = [], completedIds = new Set(), fromDate = isoDate(new Date()), dailyCapacityHours = 2 }) {
  // normalize completedIds to Set
  const doneSet = new Set(Array.isArray(completedIds) ? completedIds : Array.from(completedIds || []));

  // collect completed tasks (and track their original date) and remaining tasks
  const completedTasksMap = new Map(); // id -> task with originalDate
  const remainingFlat = [];

  (schedule || []).forEach(day => {
    const dDate = day && day.date ? day.date : isoDate(new Date());
    (day.tasks || []).forEach(task => {
      if (!task) return;
      if (doneSet.has(task.id) || task.done) {
        completedTasksMap.set(task.id, { ...task, done: true, originalDate: dDate });
      } else {
        remainingFlat.push({ ...task, done: false });
      }
    });
  });

  // completed tasks grouped by date (for display)
  const completedByDate = {};
  for (const t of completedTasksMap.values()) {
    const d = t.originalDate || fromDate;
    completedByDate[d] = completedByDate[d] || [];
    completedByDate[d].push({ ...t, done: true });
  }

  // pack remaining tasks starting from fromDate
  const result = [];
  const cursor = new Date(fromDate);
  let ri = 0;

  while (ri < remainingFlat.length) {
    const dateIso = isoDate(cursor);
    let remainingHours = Number(dailyCapacityHours) || 1;
    const dayTasks = [];

    while (ri < remainingFlat.length && remainingHours >= (remainingFlat[ri].hours || 1)) {
      dayTasks.push(remainingFlat[ri]);
      remainingHours -= (remainingFlat[ri].hours || 1);
      ri++;
    }

    // if nothing fitted but there are tasks remaining, assign one anyway
    if (!dayTasks.length && ri < remainingFlat.length) {
      dayTasks.push(remainingFlat[ri++]);
    }

    // include completed tasks for this date (if any) for display + day's tasks
    const merged = [...(completedByDate[dateIso] || []), ...dayTasks];
    result.push({ date: dateIso, tasks: merged });

    cursor.setDate(cursor.getDate() + 1);
  }

  // Ensure any completed tasks that fall after our generated range are included
  for (const t of completedTasksMap.values()) {
    const d = t.originalDate;
    if (!result.some(day => day.date === d)) {
      result.push({ date: d, tasks: [{ ...t, done: true }] });
    }
  }

  // sort by date
  result.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  return result;
}

/**
 * generateRoadmap(payload)
 * Public function the frontend calls. Payload example:
 * {
 *   goal: "Frontend Developer",
 *   skills: "react,js,css" or ["react","js"],
 *   time: 2   // hours per day
 * }
 *
 * Returns object with grouped weeks for UI:
 * { weeks: [ { week, startDate, days: [ {date, tasks}, ... ] }, ... ] }
 */
export async function generateRoadmap(payload = {}) {
  // small delay to simulate processing
  await new Promise(r => setTimeout(r, 120));

  const { goal = "", skills = [], time = 2, weeks = 8, tasksPerWeek = 3 } = payload;

  // 1) build flat tasks
  const tasks = buildTaskList({ goal, skills, weeksCount: weeks, tasksPerWeek });

  // 2) pack tasks into days using daily time (time)
  const startDate = isoDate(new Date()); // start today
  const dailySchedule = packTasksToDays({ tasks, startDate, dailyCapacityHours: time });

  // 3) group days to weeks
  const grouped = groupDaysToWeeks(dailySchedule);

  // Return a friendly shape for the UI
  return {
    weeks: grouped.map(w => ({
      week: w.week,
      startDate: w.startDate,
      days: w.days.map(d => ({ date: d.date, tasks: d.tasks })),
    })),
  };
}

/**
 * default export for convenience
 */
export default generateRoadmap;