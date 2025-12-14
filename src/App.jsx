import React, { useState } from "react";
import ProfileForm from "./components/ProfileForm";
import buildTaskList from "./services/buildTaskList";
import packTasksToDays from "./services/packTasksToDays";
import rescheduleRemaining from "./services/rescheduleRemaining";

export default function App() {
  const [schedule, setSchedule] = useState([]);

  function onRoadmap({ goal, skills, time }) {
    // 1. Build flat list of tasks
    const tasks = buildTaskList({
      goal,
      skills,
      weeksCount: 8,
      tasksPerWeek: time, // tasks based on daily hours
    });

    // 2. Convert tasks → daily buckets
    const dayPlan = packTasksToDays({
      tasks,
      startDate: new Date(),
      dailyCapacityHours: time,
    });

    setSchedule(dayPlan);
  }

  return (
    <div style={{ padding: 30, maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: 36, marginBottom: 10 }}>AI Learning Path Generator</h1>

      <ProfileForm onRoadmap={onRoadmap} />

      <hr style={{ margin: "30px 0" }} />

      <h2>Your Daily Plan</h2>

      {schedule.length === 0 && (
        <p style={{ opacity: 0.7 }}>Generate your roadmap to see tasks here.</p>
      )}

      {schedule.map((day, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <h3 style={{ marginBottom: 5 }}>{day.date}</h3>

          {day.tasks.map((task) => (
            <p key={task.id}>• {task.text}</p>
          ))}
        </div>
      ))}
    </div>
  );
}