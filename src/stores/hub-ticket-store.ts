"use client";

import { create } from "zustand";

/**
 * Ticket detail shape returned by GET /api/hub/events/tickets/[id].
 * ONE SOURCE OF TRUTH for hub ticket detail: store holds ticket/loading/error;
 * a single bridge (HubTicketDetailFetcher) fetches by ticketId and writes here.
 */
export interface HubTicketDetail {
  id: string;
  name: string;
  description: string | null;
  eventDate: string | null;
  isRecurring: boolean;
  recurringDays: string[];
  price: string;
  currency: string;
  originalPrice: string | null;
  totalInventory: number | null;
  soldCount: number;
  inclusions: string[];
  images: string[];
  isActive: boolean;
  venue: { id: string; name: string; slug: string; userId?: string };
}

export interface HubTicketState {
  ticket: HubTicketDetail | null;
  loading: boolean;
  error: string | null;
  /** Id of the ticket currently loaded (or last attempted). */
  ticketId: string | null;
}

export interface HubTicketStore extends HubTicketState {
  /** Single write path: fetch by ticketId and set ticket/loading/error. */
  fetchTicket: (ticketId: string) => Promise<void>;
  /** Update cached ticket (e.g. after PATCH on edit page). */
  setTicket: (ticket: HubTicketDetail | null) => void;
  /** Clear current ticket (e.g. when leaving detail page). */
  clearTicket: () => void;
}

const initialState: HubTicketState = {
  ticket: null,
  loading: false,
  error: null,
  ticketId: null,
};

export const useHubTicketStore = create<HubTicketStore>((set, get) => ({
  ...initialState,

  fetchTicket: async (ticketId: string) => {
    set({
      ticketId,
      loading: true,
      error: null,
      ticket: null,
    });
    try {
      const res = await fetch(`/api/hub/events/tickets/${ticketId}`, {
        credentials: "include",
      });
      const body = await res.json();
      if (body.success && body.data) {
        set({
          ticket: body.data as HubTicketDetail,
          loading: false,
          error: null,
        });
      } else {
        set({
          error: body.error || "Ticket not found",
          loading: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Request failed",
        loading: false,
      });
    }
  },

  setTicket: (ticket) => set((s) => ({ ...s, ticket, error: null })),

  clearTicket: () => set(initialState),
}));
