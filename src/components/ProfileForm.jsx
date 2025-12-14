import React, { useState } from "react";

export default function ProfileForm({ onRoadmap }) {
  const [goal, setGoal] = useState("");
  const [skills, setSkills] = useState("");
  const [time, setTime] = useState(2);

  function handleSubmit(e) {
    e.preventDefault();
    onRoadmap({
      goal,
      skills: skills.split(",").map((s) => s.trim()),
      time,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Generate Your Learning Path</h3>

      <label>Career Goal:</label>
      <input
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        required
      />

      <label>Skills (comma separated):</label>
      <input
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
      />

      <label>Hours per day:</label>
      <input
        type="number"
        value={time}
        onChange={(e) => setTime(Number(e.target.value))}
      />

      <button type="submit">Generate</button>
    </form>
  );
}