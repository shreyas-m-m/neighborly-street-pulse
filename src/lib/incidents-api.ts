// Reads and writes shared incidents in the Lovable Cloud database.
// Uses the public browser client; database rules allow reading, submitting
// new reports and changing status only.
import { supabase } from "@/integrations/supabase/client";
import { PHOTO_TYPES, validatePhoto } from "@/lib/photos";
import type { CategoryId, Incident, Severity, Status } from "@/lib/incidents";

interface IncidentRow {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  severity: string;
  people_affected: number;
  status: string;
  created_at: string;
  original_photo_path: string | null;
  resolution_photo_path: string | null;
  resolution_note: string | null;
}

const COLUMNS = "id, title, description, category, location, severity, people_affected, status, created_at, original_photo_path, resolution_photo_path, resolution_note";

function toIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as CategoryId,
    location: row.location,
    severity: row.severity as Severity,
    peopleAffected: row.people_affected,
    status: row.status as Status,
    createdAt: row.created_at,
    source: "shared",
    originalPhotoPath: row.original_photo_path,
    resolutionPhotoPath: row.resolution_photo_path,
    resolutionNote: row.resolution_note,
  };
}

export async function fetchSharedIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toIncident);
}

export interface NewIncident {
  title: string;
  description: string;
  category: CategoryId;
  location: string;
  severity: Severity;
  peopleAffected: number;
  photo?: File | null;
}

const BUCKET = "incident-photos";

/** Uploads a photo file to storage and returns its path. Throws on failure. */
export async function uploadPhoto(kind: "original" | "resolution", file: File): Promise<string> {
  const problem = validatePhoto(file);
  if (problem) throw new Error(problem);
  const path = `${kind}/${crypto.randomUUID()}.${PHOTO_TYPES[file.type]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/** Temporary viewing link for a stored photo (bucket is private). */
export async function getPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) throw new Error(error?.message ?? "Could not load photo.");
  return data.signedUrl;
}

export async function createIncident(input: NewIncident): Promise<Incident> {
  const originalPhotoPath = input.photo ? await uploadPhoto("original", input.photo) : null;
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location,
      severity: input.severity,
      people_affected: input.peopleAffected,
      original_photo_path: originalPhotoPath,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toIncident(data);
}

export async function updateIncidentStatus(id: string, status: Status): Promise<void> {
  const { data, error } = await supabase.from("incidents").update({ status }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Incident not found in the database.");
}

/** Uploads the resolution photo first; only if that succeeds, saves it and marks the incident resolved. */
export async function resolveIncident(id: string, photo: File, note: string): Promise<void> {
  const path = await uploadPhoto("resolution", photo);
  const { data, error } = await supabase
    .from("incidents")
    .update({ status: "resolved", resolution_photo_path: path, resolution_note: note.trim() || null })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Incident not found in the database.");
}
