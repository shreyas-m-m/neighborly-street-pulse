// Reads and writes shared incidents in the Lovable Cloud database.
// Uses the public browser client; database rules allow reading, submitting
// new reports and changing status only.
import { supabase } from "@/integrations/supabase/client";
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
}

const COLUMNS = "id, title, description, category, location, severity, people_affected, status, created_at";

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
}

export async function createIncident(input: NewIncident): Promise<Incident> {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location,
      severity: input.severity,
      people_affected: input.peopleAffected,
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
