"use client";

import { useSongPageRequired } from "./song-page-provider";

function Divider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-border/80" aria-hidden />;
}

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-xs transition-colors ${
        active ? "bg-foreground text-background" : "text-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}

export function SongControlsPanel() {
  const {
    settings,
    setTranspose,
    setCapo,
    setFontScale,
    cycleDisplayMode,
    setAutoscrollSpeed,
    autoscrollPlaying,
    setAutoscrollPlaying,
  } = useSongPageRequired();

  const modeLabel =
    settings.displayMode === "both" ? "Both" : settings.displayMode === "chords" ? "Chords" : "Lyrics";

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Transpose down" onClick={() => setTranspose((t) => t - 1)}>
          −
        </IconButton>
        <span className="min-w-[1.75rem] text-center text-[11px] tabular-nums text-muted-foreground">
          {settings.transpose > 0 ? "+" : ""}
          {settings.transpose}
        </span>
        <IconButton label="Transpose up" onClick={() => setTranspose((t) => t + 1)}>
          +
        </IconButton>
      </div>

      <Divider />

      <select
        value={settings.capo}
        onChange={(e) => setCapo(Number(e.target.value))}
        aria-label="Capo fret"
        title="Capo"
        className="h-7 shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-1.5 text-[11px] text-foreground outline-none"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>
            Capo {i}
          </option>
        ))}
      </select>

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Smaller text" onClick={() => setFontScale((s) => s - 0.05)}>
          A−
        </IconButton>
        <IconButton label="Larger text" onClick={() => setFontScale((s) => s + 0.05)}>
          A+
        </IconButton>
      </div>

      <Divider />

      <IconButton label="Toggle chords, lyrics, or both" onClick={cycleDisplayMode}>
        {modeLabel}
      </IconButton>

      <Divider />

      <div className="flex shrink-0 items-center gap-1.5">
        <IconButton
          label={autoscrollPlaying ? "Pause autoscroll" : "Start autoscroll"}
          onClick={() => setAutoscrollPlaying(!autoscrollPlaying)}
          active={autoscrollPlaying}
        >
          {autoscrollPlaying ? "❚❚" : "▶"}
        </IconButton>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={settings.autoscrollSpeed}
          onChange={(e) => setAutoscrollSpeed(Number(e.target.value))}
          aria-label="Autoscroll speed"
          title="Scroll speed"
          className="h-1 w-14 shrink-0 accent-foreground"
        />
      </div>
    </div>
  );
}
