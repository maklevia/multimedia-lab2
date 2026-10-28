import { useEffect } from "react";

interface KeyboardShortcutOptions {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, select, textarea, button, [contenteditable='true']",
    ),
  );
}

export function useKeyboardShortcuts({
  isPlaying,
  onPlay,
  onStop,
  onExport,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.repeat) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (isPlaying) {
          onStop();
        } else {
          onPlay();
        }
      }

      if (event.key.toLowerCase() === "e" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        onExport();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlaying, onExport, onPlay, onStop]);
}
