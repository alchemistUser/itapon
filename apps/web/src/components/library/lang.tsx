// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Square, Volume2 } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/library/types";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";

const LangContext = createContext<Lang>("en");

/**
 * English / Filipino for library pages (Phase 30). Pages are prerendered with both
 * languages in the HTML (search engines and offline copies get both); this shows one,
 * following the user's language preference (Phase 17).
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const prefs = usePrefs();
  return <LangContext value={prefs.language ?? "en"}>{children}</LangContext>;
}

export const useLang = () => useContext(LangContext);

/** Shows its children only in the active language (`inline` inside text). */
export function InLang({
  lang,
  inline = false,
  children,
}: {
  lang: Lang;
  inline?: boolean;
  children: ReactNode;
}) {
  const active = useLang();
  const Tag = inline ? "span" : "div";
  return (
    <Tag hidden={active !== lang} lang={lang === "fil" ? "fil" : undefined} className="contents">
      {children}
    </Tag>
  );
}

/** English and Filipino text; Filipino falls back to English while it isn't written. */
export function Bi({ en, fil }: { en: ReactNode; fil?: ReactNode | null }) {
  return (
    <>
      <InLang lang="en" inline>
        {en}
      </InLang>
      <InLang lang="fil" inline>
        {fil || en}
      </InLang>
    </>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn("inline-flex rounded-control border border-line bg-white p-0.5", className)}
    >
      {(
        [
          ["en", "English"],
          ["fil", "Filipino"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => void setPrefs({ language: code })}
          className={cn(
            "min-h-9 rounded-[10px] px-3 text-sm font-semibold",
            lang === code ? "bg-brand-tint text-brand-strong" : "text-ink-3 hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const noopSubscribe = () => () => {};

/** Reads an entry aloud in the active language (falls back to English without a voice). */
export function ReadEntryButton({ en, fil }: { en: string; fil: string }) {
  const lang = useLang();
  const [speaking, setSpeaking] = useState(false);
  const supported = useSyncExternalStore(noopSubscribe, speechSupported, () => false);
  useEffect(() => () => stopSpeaking(), []);
  const Icon = speaking ? Square : Volume2;
  return (
    <button
      type="button"
      disabled={!supported}
      aria-pressed={speaking}
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
          return;
        }
        setSpeaking(true);
        speak([{ text: lang === "fil" ? fil : en, lang }], () => setSpeaking(false));
      }}
      className="inline-flex h-11 items-center gap-2 rounded-control border border-ink-4/60 bg-white px-4 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
    >
      <Icon aria-hidden className="size-4" />
      {speaking ? "Stop reading" : "Read aloud"}
    </button>
  );
}
