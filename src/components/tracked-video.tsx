"use client";

import { useRef } from "react";
import { markVideoWatchedAction } from "@/app/(app)/courses/[courseId]/actions";

// Forward jumps larger than this (via the scrubber, not natural playback)
// snap back to the furthest point actually played — playing through the
// whole video is the only way to reach the end and fire `ended`.
const SKIP_THRESHOLD_SECONDS = 1.5;

export function TrackedVideo({
  moduleId,
  src,
  alreadyWatched,
}: {
  moduleId: string;
  src: string;
  alreadyWatched: boolean;
}) {
  const maxTimeRef = useRef(0);
  const watchedRef = useRef(alreadyWatched);

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (watchedRef.current) return;
    const video = e.currentTarget;
    if (video.currentTime - maxTimeRef.current > SKIP_THRESHOLD_SECONDS) {
      video.currentTime = maxTimeRef.current;
      return;
    }
    maxTimeRef.current = Math.max(maxTimeRef.current, video.currentTime);
  }

  function handleEnded() {
    if (watchedRef.current) return;
    watchedRef.current = true;
    markVideoWatchedAction(moduleId).catch(() => {
      watchedRef.current = false;
    });
  }

  return (
    <video
      controls
      src={src}
      className="size-full"
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    />
  );
}
