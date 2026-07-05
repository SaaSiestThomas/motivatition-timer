// Vibration on flip where supported (Android Chrome and friends). iOS Safari ignores
// navigator.vibrate; native haptics come later via the Capacitor wrap.

import type { Mode } from "./timerEngine";

export function vibrate(mode: Mode): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  navigator.vibrate(mode === "fun" ? [30, 40, 30] : [45]);
}
