"use client";

import { useEffect } from "react";
import { useHubTicketStore } from "@/stores/hub-ticket-store";

/**
 * Single bridge: on ticket detail route, fetches by ticketId and writes to hub ticket store.
 * Page reads ticket/loading/error from store only. Redux SSoT: one place that fetches, one store that holds state.
 */
export function HubTicketDetailFetcher({ ticketId }: { ticketId: string | undefined }) {
  const fetchTicket = useHubTicketStore((s) => s.fetchTicket);

  useEffect(() => {
    if (!ticketId) return;
    fetchTicket(ticketId);
  }, [ticketId, fetchTicket]);

  return null;
}
