"use client";

import { useEffect, useRef } from "react";

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Ensure audio is completely muted and browser autoplay functions reliably
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.play().catch(() => {
        // Autoplay policy fallback (browser blocked or user interaction pending)
      });
    }
  }, []);

  return (
    <div className="hero-video-wrap" aria-hidden="true">
      <video
        ref={videoRef}
        className="hero-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/videos/landing%20page.mp4" type="video/mp4" />
      </video>
      <div className="hero-video-overlay" />
    </div>
  );
}
