// SPDX-License-Identifier: AGPL-3.0-or-later
// Read aloud (Phase 17). Builds what to say for a result and speaks it with the best
// matching voice. Filipino: a short Filipino phrase (item + bin colour) with a Filipino
// voice, then the instruction in English. Falls back to English if no Filipino voice.
import { BINS } from "@/lib/bins";
import type { Category } from "@/lib/detector/types";

export interface SpeechItem {
  name: string;
  nameFil?: string;
  category: Category;
  instruction: string;
}

export interface SpeechPart {
  text: string;
  lang: "en" | "fil";
}

const COLOR_FIL: Record<Category, string> = {
  biodegradable: "berde",
  recyclable: "asul",
  residual: "itim",
  hazardous: "pula",
};

export function partsFor(item: SpeechItem, language: "en" | "fil" = "en"): SpeechPart[] {
  const bin = BINS[item.category];
  const english: SpeechPart = {
    text: `${item.name}. Put it in the ${bin.colorWord} bin, ${bin.name}. ${item.instruction}`,
    lang: "en",
  };
  if (language !== "fil") return [english];
  const where =
    item.category === "hazardous"
      ? `Ilagay sa pula na basurahan o sa collection point.`
      : `Ilagay sa ${COLOR_FIL[item.category]} na basurahan.`;
  return [
    { text: `${item.nameFil ?? item.name}. ${where}`, lang: "fil" },
    { text: item.instruction, lang: "en" },
  ];
}

function pickVoice(lang: "en" | "fil"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (lang === "fil") return voices.find((v) => /^(fil|tl)\b/i.test(v.lang));
  return (
    voices.find((v) => /^en-PH/i.test(v.lang)) ??
    voices.find((v) => /^en-US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang))
  );
}

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Speak the parts in order (cancels anything already speaking). Calls onEnd once done. */
export function speak(parts: SpeechPart[], onEnd?: () => void): void {
  if (!speechSupported() || !parts.length) return onEnd?.();
  const synth = window.speechSynthesis;
  synth.cancel();
  // No Filipino voice on this device: say everything in English instead.
  const usable = parts.some((p) => p.lang === "fil") && !pickVoice("fil") ? null : parts;
  const queue: SpeechPart[] = usable ?? [{ text: parts.map((p) => p.text).join(" "), lang: "en" }];
  queue.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.text);
    const voice = pickVoice(p.lang);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (p.lang === "fil" ? "fil-PH" : "en-US");
    u.rate = 0.95;
    if (i === queue.length - 1) u.onend = u.onerror = () => onEnd?.();
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
