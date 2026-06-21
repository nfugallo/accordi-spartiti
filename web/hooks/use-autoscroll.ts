"use client";

import { useEffect, useRef } from "react";

export function useAutoscroll(playing: boolean, speed: number) {
  const userScrolledRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      return;
    }

    userScrolledRef.current = false;

    const onWheel = () => {
      userScrolledRef.current = true;
    };
    const onTouchMove = () => {
      userScrolledRef.current = true;
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      if (!userScrolledRef.current) {
        window.scrollBy(0, (speed * delta) / 16);
      }
      timeoutRef.current = requestAnimationFrame(tick);
    };

    timeoutRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      if (timeoutRef.current !== null) {
        cancelAnimationFrame(timeoutRef.current);
      }
    };
  }, [playing, speed]);
}
