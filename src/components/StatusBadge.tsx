import { STATUS_LABELS, type Status } from "@/lib/incidents";

const STYLES: Record<Status, string> = {
  open: "border-primary/30 text-primary",
  in_progress: "border-accent bg-accent/15 text-foreground",
  resolved: "border-sev-low/40 bg-sev-low/10 text-foreground",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
