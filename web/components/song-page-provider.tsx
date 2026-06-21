"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SONG_SETTINGS,
  type DisplayMode,
  type SongDetail,
  type SongSettings,
  type SongSummary,
} from "@/lib/types";

type SongPageContextValue = {
  song: SongDetail;
  relatedSongs: SongSummary[];
  settings: SongSettings;
  setTranspose: (value: number | ((prev: number) => number)) => void;
  setCapo: (value: number) => void;
  setFontScale: (value: number | ((prev: number) => number)) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  cycleDisplayMode: () => void;
  setAutoscrollSpeed: (value: number) => void;
  autoscrollPlaying: boolean;
  setAutoscrollPlaying: (value: boolean) => void;
};

const SongPageContext = createContext<SongPageContextValue | null>(null);

function settingsKey(slug: string): string {
  return `accordi-song-settings:${slug}`;
}

function readSettings(slug: string): SongSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SONG_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(settingsKey(slug));
    if (!raw) {
      return DEFAULT_SONG_SETTINGS;
    }
    return { ...DEFAULT_SONG_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SONG_SETTINGS;
  }
}

function writeSettings(slug: string, settings: SongSettings): void {
  localStorage.setItem(settingsKey(slug), JSON.stringify(settings));
}

export function SongPageProvider({
  song,
  relatedSongs,
  children,
}: {
  song: SongDetail;
  relatedSongs: SongSummary[];
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<SongSettings>(() => readSettings(song.slug));
  const [autoscrollPlaying, setAutoscrollPlaying] = useState(false);

  useEffect(() => {
    setSettings(readSettings(song.slug));
    setAutoscrollPlaying(false);
  }, [song.slug]);

  useEffect(() => {
    writeSettings(song.slug, settings);
  }, [song.slug, settings]);

  const setTranspose = useCallback((value: number | ((prev: number) => number)) => {
    setSettings((prev) => ({
      ...prev,
      transpose: typeof value === "function" ? value(prev.transpose) : value,
    }));
  }, []);

  const setCapo = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, capo: value }));
  }, []);

  const setFontScale = useCallback((value: number | ((prev: number) => number)) => {
    setSettings((prev) => {
      const next = typeof value === "function" ? value(prev.fontScale) : value;
      return { ...prev, fontScale: Math.min(1.35, Math.max(0.85, next)) };
    });
  }, []);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setSettings((prev) => ({ ...prev, displayMode: mode }));
  }, []);

  const cycleDisplayMode = useCallback(() => {
    setSettings((prev) => {
      const order: DisplayMode[] = ["both", "chords", "lyrics"];
      const index = order.indexOf(prev.displayMode);
      return { ...prev, displayMode: order[(index + 1) % order.length] };
    });
  }, []);

  const setAutoscrollSpeed = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, autoscrollSpeed: value }));
  }, []);

  const value = useMemo(
    () => ({
      song,
      relatedSongs,
      settings,
      setTranspose,
      setCapo,
      setFontScale,
      setDisplayMode,
      cycleDisplayMode,
      setAutoscrollSpeed,
      autoscrollPlaying,
      setAutoscrollPlaying,
    }),
    [
      song,
      relatedSongs,
      settings,
      setTranspose,
      setCapo,
      setFontScale,
      setDisplayMode,
      cycleDisplayMode,
      setAutoscrollSpeed,
      autoscrollPlaying,
    ],
  );

  return <SongPageContext.Provider value={value}>{children}</SongPageContext.Provider>;
}

export function useSongPage() {
  return useContext(SongPageContext);
}

export function useSongPageRequired() {
  const context = useContext(SongPageContext);
  if (!context) {
    throw new Error("useSongPageRequired must be used on a song page");
  }
  return context;
}
