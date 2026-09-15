"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

// Fires once on mount — a short two-sided burst in Zeni's brand colors,
// same idea as the certificate celebration GIF's confetti, just live
// instead of baked into an image.
export function PodiumConfetti() {
  useEffect(() => {
    const colors = ["#eeba7d", "#97c3b9", "#366170"];
    const end = Date.now() + 1200;
    let frame: number;
    (function tick() {
      confetti({ particleCount: 3, angle: 60, spread: 55, startVelocity: 45, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, startVelocity: 45, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) frame = requestAnimationFrame(tick);
    })();
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
