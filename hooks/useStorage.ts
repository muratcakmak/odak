import { MMKV } from "react-native-mmkv";
import { useSyncExternalStore } from "react";
import type { TimeEvent, CountdownEvent, SinceEvent, AheadEvent } from "../types/event";

// Initialize MMKV storage
export const storage = new MMKV({
  id: "reko-storage",
});

// Storage keys
const STORAGE_KEYS = {
  COUNTDOWN_EVENTS: "countdown_events",
  SINCE_EVENTS: "since_events",
  AHEAD_EVENTS: "ahead_events",
} as const;

// Generic storage helpers
function getStoredValue<T>(key: string, defaultValue: T): T {
  const value = storage.getString(key);
  if (value) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function setStoredValue<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

// Countdown Events
export function useCountdownEvents() {
  const subscribe = (callback: () => void) => {
    const listener = storage.addOnValueChangedListener((changedKey) => {
      if (changedKey === STORAGE_KEYS.COUNTDOWN_EVENTS) {
        callback();
      }
    });
    return () => listener.remove();
  };

  const getSnapshot = () => {
    return getStoredValue<CountdownEvent[]>(STORAGE_KEYS.COUNTDOWN_EVENTS, []);
  };

  const events = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addEvent = (event: Omit<CountdownEvent, "id" | "createdAt" | "type">) => {
    const newEvent: CountdownEvent = {
      ...event,
      id: Date.now().toString(),
      type: "countdown",
      createdAt: new Date().toISOString(),
    };
    const currentEvents = getStoredValue<CountdownEvent[]>(STORAGE_KEYS.COUNTDOWN_EVENTS, []);
    setStoredValue(STORAGE_KEYS.COUNTDOWN_EVENTS, [...currentEvents, newEvent]);
    return newEvent;
  };

  const removeEvent = (id: string) => {
    const currentEvents = getStoredValue<CountdownEvent[]>(STORAGE_KEYS.COUNTDOWN_EVENTS, []);
    setStoredValue(
      STORAGE_KEYS.COUNTDOWN_EVENTS,
      currentEvents.filter((e) => e.id !== id)
    );
  };

  const updateEvent = (id: string, updates: Partial<CountdownEvent>) => {
    const currentEvents = getStoredValue<CountdownEvent[]>(STORAGE_KEYS.COUNTDOWN_EVENTS, []);
    setStoredValue(
      STORAGE_KEYS.COUNTDOWN_EVENTS,
      currentEvents.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  return { events, addEvent, removeEvent, updateEvent };
}

// Since Events
export function useSinceEvents() {
  const subscribe = (callback: () => void) => {
    const listener = storage.addOnValueChangedListener((changedKey) => {
      if (changedKey === STORAGE_KEYS.SINCE_EVENTS) {
        callback();
      }
    });
    return () => listener.remove();
  };

  const getSnapshot = () => {
    return getStoredValue<SinceEvent[]>(STORAGE_KEYS.SINCE_EVENTS, []);
  };

  const events = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addEvent = (event: Omit<SinceEvent, "id" | "createdAt" | "type">) => {
    const newEvent: SinceEvent = {
      ...event,
      id: Date.now().toString(),
      type: "since",
      createdAt: new Date().toISOString(),
    };
    const currentEvents = getStoredValue<SinceEvent[]>(STORAGE_KEYS.SINCE_EVENTS, []);
    setStoredValue(STORAGE_KEYS.SINCE_EVENTS, [...currentEvents, newEvent]);
    return newEvent;
  };

  const removeEvent = (id: string) => {
    const currentEvents = getStoredValue<SinceEvent[]>(STORAGE_KEYS.SINCE_EVENTS, []);
    setStoredValue(
      STORAGE_KEYS.SINCE_EVENTS,
      currentEvents.filter((e) => e.id !== id)
    );
  };

  const updateEvent = (id: string, updates: Partial<SinceEvent>) => {
    const currentEvents = getStoredValue<SinceEvent[]>(STORAGE_KEYS.SINCE_EVENTS, []);
    setStoredValue(
      STORAGE_KEYS.SINCE_EVENTS,
      currentEvents.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  return { events, addEvent, removeEvent, updateEvent };
}

// Ahead Events
export function useAheadEvents() {
  const subscribe = (callback: () => void) => {
    const listener = storage.addOnValueChangedListener((changedKey) => {
      if (changedKey === STORAGE_KEYS.AHEAD_EVENTS) {
        callback();
      }
    });
    return () => listener.remove();
  };

  const getSnapshot = () => {
    return getStoredValue<AheadEvent[]>(STORAGE_KEYS.AHEAD_EVENTS, []);
  };

  const events = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addEvent = (event: Omit<AheadEvent, "id" | "createdAt" | "type">) => {
    const newEvent: AheadEvent = {
      ...event,
      id: Date.now().toString(),
      type: "ahead",
      createdAt: new Date().toISOString(),
    };
    const currentEvents = getStoredValue<AheadEvent[]>(STORAGE_KEYS.AHEAD_EVENTS, []);
    setStoredValue(STORAGE_KEYS.AHEAD_EVENTS, [...currentEvents, newEvent]);
    return newEvent;
  };

  const removeEvent = (id: string) => {
    const currentEvents = getStoredValue<AheadEvent[]>(STORAGE_KEYS.AHEAD_EVENTS, []);
    setStoredValue(
      STORAGE_KEYS.AHEAD_EVENTS,
      currentEvents.filter((e) => e.id !== id)
    );
  };

  const updateEvent = (id: string, updates: Partial<AheadEvent>) => {
    const currentEvents = getStoredValue<AheadEvent[]>(STORAGE_KEYS.AHEAD_EVENTS, []);
    setStoredValue(
      STORAGE_KEYS.AHEAD_EVENTS,
      currentEvents.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  return { events, addEvent, removeEvent, updateEvent };
}

// Get all events
export function useAllEvents() {
  const { events: countdownEvents } = useCountdownEvents();
  const { events: sinceEvents } = useSinceEvents();
  const { events: aheadEvents } = useAheadEvents();

  return {
    countdown: countdownEvents,
    since: sinceEvents,
    ahead: aheadEvents,
    all: [...countdownEvents, ...sinceEvents, ...aheadEvents] as TimeEvent[],
  };
}
