import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEMO_INCIDENTS } from "@/data/demo";
import { mergeIncidents } from "@/lib/incidents";
import { fetchSharedIncidents } from "@/lib/incidents-api";

export const INCIDENTS_KEY = ["incidents"] as const;

/**
 * All incidents: built-in demo samples + real shared reports from the database.
 * `isLoading` / `error` describe the database read only; demo data is always available.
 */
export function useIncidents() {
  const query = useQuery({
    queryKey: INCIDENTS_KEY,
    queryFn: fetchSharedIncidents,
    refetchInterval: 30_000, // keeps the dashboard in sync with other devices
    retry: 1, // the database client already retries; show the error message quickly instead of spinning
  });

  // Fixed "now" on the server render, real time after the page loads (avoids mismatches).
  const [now, setNow] = useState(() => new Date("2026-10-29T00:00:00Z").getTime());
  useEffect(() => setNow(Date.now()), [query.dataUpdatedAt]);

  const shared = query.data ?? [];
  return {
    incidents: mergeIncidents(DEMO_INCIDENTS, shared),
    sharedCount: shared.length,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    now,
  };
}
