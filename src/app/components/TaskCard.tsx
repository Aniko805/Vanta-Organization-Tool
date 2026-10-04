import Link from "next/link";
import { FieldInput, SecondaryButton } from "@/app/components/AppShell";
import {
  displayNameFromProfile,
  TASK_COLUMNS,
  type TaskStatus,
  type TaskLink,
  type TaskWithRelations,
} from "@/lib/types";

export default function TaskCard({
  task,
  parentTask,
  childTasks,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onDelete,
}: {
  task: TaskWithRelations;
  parentTask?: TaskLink;
  childTasks: TaskLink[];
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete?: () => void;
}) {
  const dueUrgency = getDueUrgency(task.due_date, task.status);
  const importanceClass = {
    critical: "border-l-rose-500 bg-rose-950/25 text-rose-100",
    high: "border-l-orange-400 bg-orange-950/20 text-orange-100",
    medium: "border-l-sky-400 bg-sky-950/15 text-sky-100",
    low: "border-l-zinc-500 bg-zinc-950 text-zinc-100",
  }[task.importance];
  const importanceLabelClass = {
    critical: "text-rose-300",
    high: "text-orange-300",
    medium: "text-sky-300",
    low: "text-zinc-400",
  }[task.importance];
  const sourceLabel = task.is_personal
    ? "Personal task"
    : task.teams
      ? `${task.teams.name}${task.teams.team_number ? ` #${task.teams.team_number}` : ""}`
      : "Team task";

  return (
    <article
      id={`task-${task.id}`}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`space-y-3 p-4 rounded-lg bg-black border border-zinc-800 border-l-4 ${importanceClass} hover:border-t-zinc-700 hover:border-r-zinc-700 hover:border-b-zinc-700 transition-colors ${
        onDragStart ? "cursor-grab active:cursor-grabbing" : ""
      } ${
        isDragging ? "opacity-50" : ""
      } ${
        dueUrgency === "overdue"
          ? "ring-1 ring-rose-500/80"
          : dueUrgency === "today" || dueUrgency === "tomorrow"
            ? "ring-1 ring-amber-400/70"
            : ""
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 space-y-1">
          <span
            className={`text-[9px] font-mono uppercase ${
              task.is_personal ? "text-zinc-500" : "text-emerald-300"
            }`}
          >
            {sourceLabel}
          </span>
          <h3 className="text-xs font-semibold text-zinc-100 leading-snug break-words">
            {task.name}
          </h3>
          {task.id.startsWith("temp-") ? (
            <span className="text-[9px] font-mono text-amber-400">Saving...</span>
          ) : null}
        </div>
        <span className={`shrink-0 text-[10px] font-mono uppercase ${importanceLabelClass}`}>
          {task.importance}
        </span>
      </div>

      {task.description ? (
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
          {task.description}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
        <span>Status: {task.status.replace("_", " ")}</span>
        {task.due_date ? (
          <span
            className={
              dueUrgency === "overdue"
                ? "text-rose-300"
                : dueUrgency === "today" || dueUrgency === "tomorrow"
                  ? "text-amber-300"
                  : ""
            }
          >
            {dueUrgency === "overdue"
              ? `Overdue · ${task.due_date}`
              : dueUrgency === "today"
                ? "Due today"
                : dueUrgency === "tomorrow"
                  ? "Due tomorrow"
                  : `Due ${task.due_date}`}
          </span>
        ) : null}
      </div>

      {parentTask ? (
        <p className="text-[10px] font-mono text-zinc-400 break-words">
          Parent: <TaskLink task={parentTask} />
        </p>
      ) : null}

      {childTasks.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase text-zinc-500">
            Child tasks ({childTasks.length})
          </p>
          <ul className="space-y-1">
            {childTasks.map((child) => (
              <li key={child.id} className="text-xs">
                <TaskLink task={child} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {task.task_assignees && task.task_assignees.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.task_assignees.map((assignee) => (
            <span
              key={assignee.user_id}
              className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
            >
              {displayNameFromProfile(assignee.profiles)}
            </span>
          ))}
        </div>
      ) : null}

      {task.task_parts && task.task_parts.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.task_parts.map((taskPart) => (
            <span
              key={taskPart.part_id}
              className="text-[10px] font-mono text-emerald-300/80 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
            >
              {taskPart.parts?.part_catalog?.name ?? "Part"}
              {taskPart.quantity ? ` × ${taskPart.quantity}` : ""}
            </span>
          ))}
        </div>
      ) : null}

      <FieldInput
        as="select"
        value={task.status}
        onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
        aria-label={`Move ${task.name} to status`}
      >
        {TASK_COLUMNS.map((column) => (
          <option key={column.id} value={column.id}>
            {column.label}
          </option>
        ))}
      </FieldInput>

      <div className="flex flex-wrap gap-2">
        {!task.id.startsWith("temp-") ? (
          <Link
            href={addChildHref(task)}
            className="px-3 py-2 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded hover:border-zinc-500 hover:text-white transition-colors"
          >
            Add child
          </Link>
        ) : null}
        {onDelete && !task.id.startsWith("temp-") ? (
          <SecondaryButton type="button" onClick={onDelete}>
            Delete
          </SecondaryButton>
        ) : null}
      </div>
    </article>
  );
}

function TaskLink({ task }: { task: TaskLink }) {
  return (
    <Link
      href={taskHref(task)}
      className="text-zinc-300 underline decoration-zinc-700 underline-offset-2 hover:text-white"
    >
      {task.name}
    </Link>
  );
}

function taskHref(task: TaskLink) {
  const board = task.is_personal
    ? "/personal-tasks"
    : `/team-tasks?team=${encodeURIComponent(task.team_id ?? "")}`;
  return `${board}#task-${encodeURIComponent(task.id)}`;
}

function addChildHref(task: TaskWithRelations) {
  const params = new URLSearchParams({ new: "1", parent: task.id });
  if (!task.is_personal && task.team_id) params.set("team", task.team_id);

  const board = task.is_personal ? "/personal-tasks" : "/team-tasks";
  return `${board}?${params.toString()}#task-form`;
}

function getDueUrgency(
  dueDate: string | null | undefined,
  status: TaskWithRelations["status"]
): "overdue" | "today" | "tomorrow" | null {
  if (!dueDate || status === "done") return null;

  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue === 0) return "today";
  if (daysUntilDue === 1) return "tomorrow";
  return null;
}