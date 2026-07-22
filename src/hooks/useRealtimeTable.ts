import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeTableOptions<T> {
  /** Skip subscribing until this is true (e.g. until the user id / filter value is known). */
  enabled: boolean;
  table: string;
  /** Postgres changes filter, e.g. `client_id=eq.${uid}`. */
  filter: string;
  /** Defaults to all three events. */
  events?: ChangeEvent[];
  onChange: (event: ChangeEvent, row: T, oldRow: T | null) => void;
}

/**
 * Subscribes to Supabase Realtime `postgres_changes` for a single table/filter,
 * forwarding INSERT/UPDATE/DELETE rows to `onChange`. Generalizes the pattern
 * used by useNotifications.ts for reuse across bookings/messaging.
 */
export function useRealtimeTable<T = Record<string, unknown>>({
  enabled,
  table,
  filter,
  events = ["INSERT", "UPDATE", "DELETE"],
  onChange,
}: UseRealtimeTableOptions<T>): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    // Unique topic prevents Supabase from returning an existing subscribed channel
    // (supabase.channel() deduplicates by name; removeChannel is async so the old
    // channel can still be in the registry when the next subscription attempt runs)
    let channel = supabase.channel(`${table}:${filter}:${Date.now()}`);

    for (const event of events) {
      channel = channel.on(
        "postgres_changes",
        { event, schema: "public", table, filter },
        (payload) => {
          onChangeRef.current(
            payload.eventType as ChangeEvent,
            payload.new as T,
            (payload.old ?? null) as T | null
          );
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, table, filter, events.join(",")]);
}
