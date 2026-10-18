import { downscaleImage } from "./images";
import { supabase } from "./supabase";
import type { EngNote, EngNoteImage, Profile } from "./types";

export const MAX_NOTE_IMAGES = 8;
export const SIGNED_URL_SECONDS = 60 * 60;
const NOTE_SELECT = `
  *,
  author:profiles!eng_notes_author_id_fkey(id, username, first_name, last_name),
  eng_note_images(*)
`;

type NoteRow = EngNote & {
  author?: Profile | null;
  eng_note_images?: EngNoteImage[];
};

function sortNote(note: NoteRow): EngNote {
  const images = [...(note.eng_note_images ?? [])].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
  );
  return { ...note, eng_note_images: images };
}

export async function listNotes(input: {
  teamId: string;
  date?: string;
}): Promise<EngNote[]> {
  let query = supabase
    .from("eng_notes")
    .select(NOTE_SELECT)
    .eq("team_id", input.teamId)
    .order("created_at", { ascending: false });

  if (input.date) query = query.eq("note_date", input.date);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as NoteRow[]).map(sortNote);
}

export async function listNotesForDates(teamId: string, dates: string[]): Promise<EngNote[]> {
  if (dates.length === 0) return [];
  const { data, error } = await supabase
    .from("eng_notes")
    .select(NOTE_SELECT)
    .eq("team_id", teamId)
    .in("note_date", dates)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as NoteRow[]).map(sortNote);
}

export async function listNoteIndex(teamId: string): Promise<
  Pick<EngNote, "id" | "note_date" | "subteam" | "title" | "body" | "created_at">[]
> {
  const { data, error } = await supabase
    .from("eng_notes")
    .select("id, note_date, subteam, title, body, created_at")
    .eq("team_id", teamId)
    .order("note_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createNote(input: {
  teamId: string;
  authorId: string;
  noteDate: string;
  title?: string;
  body: string;
  subteam?: string | null;
  taskId?: string | null;
}): Promise<EngNote> {
  const { data, error } = await supabase
    .from("eng_notes")
    .insert({
      team_id: input.teamId,
      author_id: input.authorId,
      note_date: input.noteDate,
      title: input.title?.trim() || null,
      body: input.body,
      subteam: input.subteam?.trim() || null,
      task_id: input.taskId || null,
    })
    .select(NOTE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return sortNote(data as NoteRow);
}

export async function updateNote(
  noteId: string,
  patch: { title?: string | null; body?: string; subteam?: string | null; noteDate?: string }
): Promise<void> {
  const next: Record<string, string | null> = {};
  if (patch.title !== undefined) next.title = patch.title?.trim() || null;
  if (patch.body !== undefined) next.body = patch.body;
  if (patch.subteam !== undefined) next.subteam = patch.subteam?.trim() || null;
  if (patch.noteDate !== undefined) next.note_date = patch.noteDate;

  const { error } = await supabase.from("eng_notes").update(next).eq("id", noteId);
  if (error) throw new Error(error.message);
}

export async function deleteNote(note: Pick<EngNote, "id" | "eng_note_images">): Promise<void> {
  const paths = (note.eng_note_images ?? []).map((image) => image.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("notebook").remove(paths);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase.from("eng_notes").delete().eq("id", note.id);
  if (error) throw new Error(error.message);
}

export async function addNoteImage(input: {
  noteId: string;
  teamId: string;
  createdBy: string;
  file: File;
  position: number;
}): Promise<EngNoteImage> {
  const blob = await downscaleImage(input.file);
  const path = `${input.teamId}/${input.noteId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("notebook").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("eng_note_images")
    .insert({
      note_id: input.noteId,
      team_id: input.teamId,
      storage_path: path,
      mime_type: "image/jpeg",
      byte_size: blob.size,
      position: input.position,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from("notebook").remove([path]);
    throw new Error(error.message);
  }

  const { data: current } = await supabase
    .from("eng_notes")
    .select("body")
    .eq("id", input.noteId)
    .single();
  if (current) {
    await supabase.from("eng_notes").update({ body: current.body }).eq("id", input.noteId);
  }

  return data as EngNoteImage;
}

export async function signedImageUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from("notebook")
    .createSignedUrls(unique, SIGNED_URL_SECONDS);

  if (error) throw new Error(error.message);

  const urls: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) urls[row.path] = row.signedUrl;
  }
  return urls;
}

export function attachSignedUrls(notes: EngNote[], urls: Record<string, string>): EngNote[] {
  return notes.map((note) => ({
    ...note,
    eng_note_images: (note.eng_note_images ?? []).map((image) => ({
      ...image,
      signed_url: urls[image.storage_path] ?? null,
    })),
  }));
}
