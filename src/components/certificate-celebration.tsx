"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

const ZENI_CONFETTI_COLORS = ["#97C3B9", "#366170", "#EEBA7D", "#AD584A"];

/** Fires a confetti burst once when the page is loaded with ?celebrate=1
 *  (right after earning a new certificate), then strips the param so a
 *  refresh or revisit doesn't replay it. */
export function CertificateCelebration() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef(false);

  const shouldCelebrate = searchParams.get("celebrate") === "1";

  useEffect(() => {
    if (!shouldCelebrate || firedRef.current) return;
    firedRef.current = true;

    confetti({ particleCount: 100, spread: 70, origin: { x: 0.3, y: 0.6 }, colors: ZENI_CONFETTI_COLORS });
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.7, y: 0.6 }, colors: ZENI_CONFETTI_COLORS });

    router.replace(pathname, { scroll: false });
  }, [shouldCelebrate, router, pathname]);

  return null;
}
