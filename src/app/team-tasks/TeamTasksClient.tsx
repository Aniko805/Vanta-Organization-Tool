"use client";

import { useState, useRef } from "react";
import { createTask } from "@/lib/tasks";
import type { Task, Profile, Part } from "@/lib/types";

interface TeamTasksClientProps {
  initialTasks: Task[];
  teamMembers: Profile[];
  assignableParts: Part[];
  teamId: string;
}

export default function TeamTasksClient({
  initialTasks,
  teamMembers,
  assignableParts,
  teamId,
}: TeamTasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("none");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createFormRef = useRef<HTMLDivElement | null>(null);

  // Top-level major tasks (e.g., "Build Robot")
  const parentTasks = tasks.filter((t) => !t.parent_id);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    setLoading(true);
    try {
      const newTask = await createTask({
      team_id: teamId,
      name: taskName.trim(),
      description: description.trim() || null,
      parent_id: selectedParentId === "none" ? null : selectedParentId,
      assignee_ids: selectedAssignees,
});

      setTasks((prev) => [newTask, ...prev]);
      setTaskName("");
      setDescription("");
      setSelectedParentId("none");
      setSelectedAssignees([]);
    } catch (err: any) {
      console.error("Failed to create task:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChildClick = (parentId: string) => {
    setSelectedParentId(parentId);
    createFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAndHighlightTask = (taskId: string) => {
    const element = document.getElementById(`task-card-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedTaskId(taskId);
      setTimeout(() => setHighlightedTaskId(null), 2500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Task Bar */}
      <div ref={createFormRef} className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase font-mono tracking-wider">
          Create Task
        </h2>
        
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task name (e.g. Build chassis)"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="bg-black border border-zinc-800 text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
            />

            {/* Parent Dropdown */}
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="bg-black border border-zinc-800 text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
            >
              <option value="none">-- No Parent (Major Task) --</option>
              {parentTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  Parent: {t.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            placeholder="Task description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-black border border-zinc-800 text-xs text-white rounded p-3 focus:outline-none focus:border-zinc-500"
          />

          <button
            type="submit"
            disabled={loading || !taskName.trim()}
            className="px-4 py-2 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Task"}
          </button>
        </form>
      </div>

      {/* Task List / Cards */}
      <div className="space-y-4">
        {tasks.map((task) => {
          const childTasks = tasks.filter((child) => child.parent_id === task.id);
          const isHighlighted = highlightedTaskId === task.id;

          return (
            <div
              key={task.id}
              id={`task-card-${task.id}`}
              className={`p-5 rounded-xl border transition-all duration-300 bg-zinc-950 ${
                isHighlighted
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : "border-zinc-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{task.name}</h3>
                    {task.parent_id && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        Subtask
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-zinc-400 mt-1">{task.description}</p>
                  )}
                </div>

                <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                  {task.status}
                </span>
              </div>

              {/* Child Tasks Section */}
              <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Subtasks ({childTasks.length})
                  </p>
                  <button
                    onClick={() => handleCreateChildClick(task.id)}
                    className="text-[11px] font-mono text-emerald-400 hover:underline"
                  >
                    + create new child task
                  </button>
                </div>

                {childTasks.length > 0 ? (
                  <ul className="space-y-1">
                    {childTasks.map((child) => (
                      <li key={child.id}>
                        <button
                          onClick={() => scrollToAndHighlightTask(child.id)}
                          className="text-xs text-zinc-300 hover:text-white hover:underline flex items-center gap-2"
                        >
                          <span className="text-zinc-600">└</span>
                          <span>{child.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            ({child.status})
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-600 italic">No subtasks assigned.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}