export type HapticPattern = "light" | "medium" | "heavy";

const HAPTIC_PATTERN_MS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 22,
};

export function triggerHaptic(pattern: HapticPattern = "light") {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (typeof navigator.vibrate !== "function") {
    return;
  }

  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  if (!isCoarsePointer) {
    return;
  }

  navigator.vibrate(HAPTIC_PATTERN_MS[pattern]);
}
