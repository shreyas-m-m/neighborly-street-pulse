import { SEVERITY_STYLES, type Severity } from "@/data/demo";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}
