"use client";

// ============================================================
// Global client state — auth user, hash route, favourites,
// notifications. Powered by Zustand.
// ============================================================

import { create } from "zustand";
import { api } from "@/lib/api-client";
import type { AuthUser, NotificationDTO, PropertyCardDTO } from "@/lib/types";

const RECENTLY_VIEWED_KEY = "gph_recently_viewed";
const MAX_RECENTLY_VIEWED = 12;

function loadStoredRecentlyViewed(): PropertyCardDTO[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface HashRoute {
  path: string; // e.g. "/properties/abc-123"
  segments: string[]; // ["properties", "abc-123"]
  query: URLSearchParams;
  fullPath: string; // "/properties/abc-123?city=Mumbai"
}

function parseHash(): HashRoute {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, search] = raw.split("?");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return {
    path: clean,
    segments: clean.split("/").filter(Boolean),
    query: new URLSearchParams(search ?? ""),
    fullPath: raw,
  };
}

interface AppState {
  // ---- auth ----
  user: AuthUser | null;
  authLoaded: boolean;
  setUser: (user: AuthUser | null) => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;

  // ---- routing ----
  route: HashRoute;
  initRoute: () => void;
  navigate: (path: string, opts?: { replace?: boolean }) => void;

  // ---- favourites ----
  favourites: string[];
  loadFavourites: () => Promise<void>;
  toggleFavourite: (propertyId: string) => Promise<boolean>; // returns new state

  // ---- notifications ----
  notifications: NotificationDTO[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;

  // ---- recently viewed ----
  recentlyViewed: PropertyCardDTO[];
  recordViewedProperty: (property: PropertyCardDTO) => void;
  clearRecentlyViewed: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ---------- auth ----------
  user: null,
  authLoaded: false,
  setUser: (user) => set({ user, authLoaded: true }),

  loadUser: async () => {
    try {
      const user = await api<AuthUser>("/api/auth/me");
      set({ user, authLoaded: true });
      get().loadFavourites();
      get().loadNotifications();
    } catch {
      set({ user: null, authLoaded: true, favourites: [], notifications: [], unreadCount: 0 });
    }
  },

  logout: async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, favourites: [], notifications: [], unreadCount: 0 });
      get().navigate("/");
    }
  },

  // ---------- routing ----------
  route: { path: "/", segments: [], query: new URLSearchParams(), fullPath: "/" },

  initRoute: () => {
    set({ route: parseHash() });
    window.addEventListener("hashchange", () => {
      set({ route: parseHash() });
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
  },

  navigate: (path, opts) => {
    const target = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (window.location.hash === target) return;
    if (opts?.replace) {
      window.history.replaceState(null, "", target);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = target;
    }
  },

  // ---------- favourites ----------
  favourites: [],

  loadFavourites: async () => {
    try {
      const res = await api<{ favourites: string[] }>("/api/favourites");
      set({ favourites: res.favourites });
    } catch {
      // guest — ignore
    }
  },

  toggleFavourite: async (propertyId) => {
    const { user } = get();
    if (!user) throw new Error("SIGNIN_REQUIRED");
    const res = await api<{ favourited: boolean }>("/api/favourites", {
      method: "POST",
      body: JSON.stringify({ propertyId }),
    });
    set((state) => ({
      favourites: res.favourited
        ? [...state.favourites, propertyId]
        : state.favourites.filter((id) => id !== propertyId),
    }));
    return res.favourited;
  },

  // ---------- notifications ----------
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    try {
      const res = await api<{ data: NotificationDTO[]; unreadCount: number }>("/api/notifications");
      set({ notifications: res.data, unreadCount: res.unreadCount });
    } catch {
      // ignore
    }
  },

  markAllRead: async () => {
    await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ all: true }) });
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  // ---------- recently viewed ----------
  recentlyViewed: loadStoredRecentlyViewed(),

  recordViewedProperty: (property) => {
    set((state) => {
      const filtered = state.recentlyViewed.filter((p) => p.id !== property.id);
      const updated = [property, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
      try {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
      } catch {
        // ignore localStorage errors
      }
      return { recentlyViewed: updated };
    });
  },

  clearRecentlyViewed: () => {
    try {
      localStorage.removeItem(RECENTLY_VIEWED_KEY);
    } catch {
      // ignore
    }
    set({ recentlyViewed: [] });
  },
}));
