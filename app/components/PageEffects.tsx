"use client";

import { useEffect } from "react";

/** Scroll-reveal animations + hides the sticky CTA while the form is on screen. */
export default function PageEffects() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");

    // Reveal elements already in viewport immediately
    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("in");
      }
    });

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const revealer = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            revealer.unobserve(en.target);
          }
        }),
      { threshold: 0.05 }
    );
    els.forEach((el) => revealer.observe(el));

    const card = document.getElementById("join");
    const cta = document.getElementById("sticky-cta");
    let ctaObserver: IntersectionObserver | undefined;
    if (card && cta) {
      ctaObserver = new IntersectionObserver(
        ([entry]) => cta.classList.toggle("is-hidden", entry.isIntersecting),
        { threshold: 0.15 }
      );
      ctaObserver.observe(card);
    }

    return () => {
      revealer.disconnect();
      ctaObserver?.disconnect();
    };
  }, []);

  return null;
}
