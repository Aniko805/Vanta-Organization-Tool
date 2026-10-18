import { formatNotebookDate } from "./dates";
import type { EngNote, NotebookSection } from "./types";

export function notebookToMarkdown(input: {
  teamName: string;
  date: string;
  sections: NotebookSection[];
  notesById: Map<string, EngNote>;
  imagesById: Map<string, { url: string | null; caption: string | null }>;
  tasksById: Map<string, { name: string; status: string }>;
}) {
  const lines = [`# ${input.teamName}`, "", `## ${formatNotebookDate(input.date)}`, ""];
  let tab = "";
  for (const section of input.sections) {
    if (section.tab_name !== tab) {
      tab = section.tab_name;
      lines.push(`### ${tab}`, "");
    }
    lines.push(`#### ${section.section_name}`, "");
    lines.push(renderTokens(section.content, input), "");
  }
  return lines.join("\n");
}

function renderTokens(
  content: string,
  input: {
    notesById: Map<string, EngNote>;
    imagesById: Map<string, { url: string | null; caption: string | null }>;
    tasksById: Map<string, { name: string; status: string }>;
  }
) {
  return content.replace(/\[\[(note|task|image):([0-9a-fA-F-]{36})\]\]/g, (full, kind: string, id: string) => {
    if (kind === "note") {
      const note = input.notesById.get(id);
      return note ? `*(note ${note.created_at})*` : "*(note)*";
    }
    if (kind === "task") {
      const task = input.tasksById.get(id);
      return task ? `*(task: ${task.name}, ${task.status})*` : "*(task)*";
    }
    const image = input.imagesById.get(id);
    if (!image?.url) return "*(photo)*";
    const caption = image.caption || "Notebook photo";
    return `![${caption}](${image.url})`;
  });
}

export function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
