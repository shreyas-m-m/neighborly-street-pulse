// DEMO DATA ONLY — these are made-up incidents for the hackathon prototype.
import { Trash2, Construction, Droplets, Lightbulb, type LucideIcon } from "lucide-react";
import type { CategoryId, Incident, Severity } from "@/lib/incidents";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  {
    id: "garbage",
    name: "Overflowing Garbage Bins",
    description: "Full or spilling bins that attract pests and block walkways.",
    icon: Trash2,
  },
  {
    id: "roads",
    name: "Damaged Roads",
    description: "Potholes, cracks and broken surfaces that risk accidents.",
    icon: Construction,
  },
  {
    id: "water",
    name: "Water Leaks",
    description: "Burst pipes and leaks wasting water and flooding streets.",
    icon: Droplets,
  },
  {
    id: "lights",
    name: "Broken Streetlights",
    description: "Dark streets that reduce safety at night.",
    icon: Lightbulb,
  },
];

export const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-sev-critical text-primary-foreground",
  high: "bg-sev-high text-primary-foreground",
  medium: "bg-sev-medium text-foreground",
  low: "bg-sev-low text-primary-foreground",
};

// Location format: "Street, Ward N" — the ward is used for the hotspot panel.
export const DEMO_INCIDENTS: Incident[] = [
  {
    id: "INC-1042",
    title: "Burst water main near bus stop",
    category: "water",
    severity: "critical",
    status: "open",
    location: "MG Road, Ward 12",
    description:
      "Water gushing from a broken main onto the road since early morning. Bus stop is flooded.",
    peopleAffected: 800,
    createdAt: "2026-10-27T07:30:00Z",
    source: "demo",
  },
  {
    id: "INC-1038",
    title: "Deep pothole on main junction",
    category: "roads",
    severity: "high",
    status: "in_progress",
    location: "Station Circle, Ward 4",
    description: "Large pothole in the left lane causing two-wheelers to swerve.",
    peopleAffected: 1200,
    createdAt: "2026-10-22T10:15:00Z",
    source: "demo",
  },
  {
    id: "INC-1031",
    title: "Bins overflowing for 3 days",
    category: "garbage",
    severity: "medium",
    status: "open",
    location: "Market Street, Ward 7",
    description: "Three community bins are full and waste is spilling onto the footpath.",
    peopleAffected: 300,
    createdAt: "2026-10-24T09:00:00Z",
    source: "demo",
  },
  {
    id: "INC-1027",
    title: "Streetlight flickering",
    category: "lights",
    severity: "low",
    status: "open",
    location: "Lake View Lane, Ward 2",
    description: "One streetlight flickers on and off through the night.",
    peopleAffected: 60,
    createdAt: "2026-10-20T19:45:00Z",
    source: "demo",
  },
  {
    id: "INC-1024",
    title: "Leaking pipe outside school",
    category: "water",
    severity: "high",
    status: "open",
    location: "School Road, Ward 12",
    description: "Constant leak creating a muddy patch at the school gate.",
    peopleAffected: 450,
    createdAt: "2026-10-18T08:20:00Z",
    source: "demo",
  },
  {
    id: "INC-1019",
    title: "Three streetlights out in a row",
    category: "lights",
    severity: "high",
    status: "open",
    location: "Park Avenue, Ward 7",
    description: "An entire stretch of the avenue is dark after 7pm.",
    peopleAffected: 500,
    createdAt: "2026-10-15T20:10:00Z",
    source: "demo",
  },
  {
    id: "INC-1015",
    title: "Garbage dumped near drain",
    category: "garbage",
    severity: "medium",
    status: "resolved",
    location: "Canal Street, Ward 4",
    description: "Waste piled near the storm drain, blocking water flow.",
    peopleAffected: 150,
    createdAt: "2026-10-10T11:00:00Z",
    source: "demo",
  },
  {
    id: "INC-1011",
    title: "Road surface cracked after rain",
    category: "roads",
    severity: "medium",
    status: "open",
    location: "Hill Road, Ward 12",
    description: "Long cracks across the road surface, getting worse daily.",
    peopleAffected: 400,
    createdAt: "2026-10-12T14:30:00Z",
    source: "demo",
  },
  {
    id: "INC-1008",
    title: "Overflowing bin at bus depot",
    category: "garbage",
    severity: "low",
    status: "resolved",
    location: "Depot Road, Ward 2",
    description: "Single bin overflowing, cleared by sanitation team.",
    peopleAffected: 80,
    createdAt: "2026-10-05T16:00:00Z",
    source: "demo",
  },
  {
    id: "INC-1003",
    title: "Sinkhole forming on service road",
    category: "roads",
    severity: "critical",
    status: "in_progress",
    location: "Service Road, Ward 7",
    description: "Ground sinking near a manhole; area cordoned with stones by residents.",
    peopleAffected: 650,
    createdAt: "2026-10-25T06:45:00Z",
    source: "demo",
  },
];
