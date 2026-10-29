// DEMO DATA ONLY — not real incidents. Replace with real data later.
import { Trash2, Construction, Droplets, Lightbulb, type LucideIcon } from "lucide-react";

export type Severity = "critical" | "high" | "medium" | "low";

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { id: "garbage", name: "Overflowing Garbage Bins", description: "Full or spilling bins that attract pests and block walkways.", icon: Trash2 },
  { id: "roads", name: "Damaged Roads", description: "Potholes, cracks and broken surfaces that risk accidents.", icon: Construction },
  { id: "water", name: "Water Leaks", description: "Burst pipes and leaks wasting water and flooding streets.", icon: Droplets },
  { id: "lights", name: "Broken Streetlights", description: "Dark streets that reduce safety at night.", icon: Lightbulb },
];

export interface DemoIncident {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  location: string;
}

export const DEMO_INCIDENTS: DemoIncident[] = [
  { id: "INC-1042", title: "Burst water main near bus stop", category: "water", severity: "critical", location: "MG Road, Ward 12" },
  { id: "INC-1038", title: "Deep pothole on main junction", category: "roads", severity: "high", location: "Station Circle, Ward 4" },
  { id: "INC-1031", title: "Bins overflowing for 3 days", category: "garbage", severity: "medium", location: "Market Street, Ward 7" },
  { id: "INC-1027", title: "Streetlight flickering", category: "lights", severity: "low", location: "Lake View Lane, Ward 2" },
];

export const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-sev-critical text-primary-foreground",
  high: "bg-sev-high text-primary-foreground",
  medium: "bg-sev-medium text-foreground",
  low: "bg-sev-low text-primary-foreground",
};
