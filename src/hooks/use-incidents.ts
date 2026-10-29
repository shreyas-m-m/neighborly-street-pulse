import { useCallback, useEffect, useState } from "react";
import { DEMO_INCIDENTS } from "@/data/demo";
import { loadLocalReports, loadStatusOverrides, mergeIncidents, type Incident } from "@/lib/incidents";

/**
 * All incidents (demo + saved in this browser). localStorage is read after the
 * page loads, so `ready` is false on the very first render.
 */
export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>(DEMO_INCIDENTS);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date("2026-10-29T00:00:00Z").getTime());

  const refresh = useCallback(() => {
    setIncidents(mergeIncidents(DEMO_INCIDENTS, loadLocalReports(), loadStatusOverrides()));
    setNow(Date.now());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { incidents, ready, now, refresh };
}
