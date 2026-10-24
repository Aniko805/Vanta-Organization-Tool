"use client";

import { tokensToMarkdownLinks } from "@/lib/ai/handles";
import { formatNoteTime } from "@/lib/dates";
import { displayNameFromProfile, type EngNote, type Task } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type NotebookMarkdownProps = {
  content: string;
  notesById: Map<string, EngNote>;
  tasksById: Map<string, Pick<Task, "id" | "name" | "status">>;
  imagesById: Map<string, { url: string | null; caption: string | null }>;
  onNote?: (noteId: string) => void;
  onTask?: (taskId: string) => void;
};

function chipClass() {
  return "mx-0.5 inline-flex min-h-6 items-center rounded-lg border border-white/10 bg-zinc-800/60 px-2 align-baseline text-[10px] font-mono uppercase tracking-wider text-zinc-300 hover:bg-zinc-700/60 hover:border-white/20 hover:text-zinc-100 transition-all duration-300 ease-out";
}

export default function NotebookMarkdown({
  content,
  notesById,
  tasksById,
  imagesById,
  onNote,
  onTask,
}: NotebookMarkdownProps) {
  return (
    <div className="notebook-prose space-y-2 text-sm leading-relaxed text-zinc-300">
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children }) => {
            const noteId = href?.startsWith("#vulcan-note-") ? href.slice("#vulcan-note-".length) : null;
            const taskId = href?.startsWith("#vulcan-task-") ? href.slice("#vulcan-task-".length) : null;
            const imageId = href?.startsWith("#vulcan-image-")
              ? href.slice("#vulcan-image-".length)
              : null;

            if (noteId) {
              const note = notesById.get(noteId);
              const label = note
                ? `Note · ${formatNoteTime(note.created_at)} · ${displayNameFromProfile(note.author, "Member")}`
                : "Note unavailable";
              return (
                <button type="button" className={chipClass()} onClick={() => onNote?.(noteId)}>
                  {label}
                </button>
              );
            }

            if (taskId) {
              const task = tasksById.get(taskId);
              const label = task ? `${task.name} · ${task.status.replace(/_/g, " ")}` : "Task unavailable";
              return (
                <button type="button" className={chipClass()} onClick={() => onTask?.(taskId)}>
                  {label}
                </button>
              );
            }

            if (imageId) {
              const image = imagesById.get(imageId);
              if (!image?.url) {
                return <span className="text-[10px] font-mono uppercase text-zinc-500">Photo unavailable</span>;
              }
              return (
                <figure className="my-3">
                  {/* Signed notebook URLs are created at view time and are not a configured image host. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.caption || "Notebook photo"}
                    className="max-w-full rounded-xl border border-white/10"
                  />
                  {image.caption ? (
                    <figcaption className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              );
            }

            return (
              <a href={href} className="underline" rel="noreferrer">
                {children}
              </a>
            );
          },
          img: () => null,
        }}
      >
        {tokensToMarkdownLinks(content)}
      </ReactMarkdown>
    </div>
  );
}
