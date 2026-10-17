// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect } from "react";

/**
 * Highlights the list item named in the URL hash (#battery). CSS :target alone isn't
 * enough: Next.js client navigation scrolls to the hash without updating :target.
 */
export function HashHighlight() {
  useEffect(() => {
    let last: HTMLElement | null = null;
    const apply = () => {
      last?.removeAttribute("data-highlight");
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.setAttribute("data-highlight", "");
        el.scrollIntoView({ block: "center" });
      }
      last = el;
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  return null;
}
