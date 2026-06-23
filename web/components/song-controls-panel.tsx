"use client";

import { useSongPageRequired } from "./song-page-provider";

const MIN_AUTOSCROLL_SPEED = 0.25;
const MAX_AUTOSCROLL_SPEED = 2;

function ControlGroup({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-1 rounded-full bg-background/45 px-2 py-1 ${className}`}>
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
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
  const autoscrollSpeed = Math.min(
    MAX_AUTOSCROLL_SPEED,
    Math.max(MIN_AUTOSCROLL_SPEED, settings.autoscrollSpeed),
  );
  const fontScaleLabel = `${Math.round(settings.fontScale * 100)}%`;

  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 px-1 py-0.5">
      <ControlGroup label="Key">
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
      </ControlGroup>

      <ControlGroup label="Capo">
        <select
          value={settings.capo}
          onChange={(e) => setCapo(Number(e.target.value))}
          aria-label="Capo fret"
          title="Capo"
          className="h-7 shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-1 text-[11px] text-foreground outline-none"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </ControlGroup>

      <ControlGroup label="Text">
        <IconButton label="Smaller text" onClick={() => setFontScale((s) => s - 0.1)}>
          A−
        </IconButton>
        <span className="min-w-[2.25rem] text-center text-[11px] tabular-nums text-muted-foreground">
          {fontScaleLabel}
        </span>
        <IconButton label="Larger text" onClick={() => setFontScale((s) => s + 0.1)}>
          A+
        </IconButton>
      </ControlGroup>

      <ControlGroup label="View">
        <IconButton label="Toggle chords, lyrics, or both" onClick={cycleDisplayMode}>
          {modeLabel}
        </IconButton>
      </ControlGroup>

      <ControlGroup label="Scroll" className="basis-full justify-center min-[420px]:basis-auto">
        <IconButton
          label={autoscrollPlaying ? "Pause autoscroll" : "Start autoscroll"}
          onClick={() => setAutoscrollPlaying(!autoscrollPlaying)}
          active={autoscrollPlaying}
        >
          {autoscrollPlaying ? "❚❚" : "▶"}
        </IconButton>
        <input
          type="range"
          min={MIN_AUTOSCROLL_SPEED}
          max={MAX_AUTOSCROLL_SPEED}
          step="0.05"
          value={autoscrollSpeed}
          onChange={(e) => setAutoscrollSpeed(Number(e.target.value))}
          aria-label="Autoscroll speed"
          title="Scroll speed"
          className="h-1 w-28 shrink-0 accent-foreground"
        />
        <span className="min-w-[2.25rem] text-[11px] tabular-nums text-muted-foreground">
          {autoscrollSpeed.toFixed(2)}x
        </span>
      </ControlGroup>
    </div>
  );
}
