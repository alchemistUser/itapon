// SPDX-License-Identifier: AGPL-3.0-or-later
// "Was this right?" (Phase 20). Feedback rows are private to the user under RLS. A photo is
// uploaded to the private training-images bucket only when the user ticks the consent box;
// otherwise the captured frame never leaves the device.
"use client";

import { ensureUserId, getSupabase } from "@/lib/supabase/client";

const PHOTO_MAX_PX = 640;

/** Downscaled JPEG of the frame the result locked on, kept in memory until the user decides. */
export function captureFrame(
  source: CanvasImageSource | null,
  width: number,
  height: number,
): Promise<Blob | null> {
  if (!source || !width || !height || typeof document === "undefined") {
    return Promise.resolve(null);
  }
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const g = canvas.getContext("2d");
  if (!g) return Promise.resolve(null);
  try {
    g.drawImage(source, 0, 0, canvas.width, canvas.height);
  } catch {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8);
    } catch {
      resolve(null); // tainted canvas
    }
  });
}

export interface FeedbackInput {
  detectionId: string | null;
  isCorrect: boolean;
  correctedClassKey: string | null; // null on "No" = something not in the list
  modelVersion: string;
  consent: boolean;
  photo: Blob | null;
}

export async function submitFeedback(input: FeedbackInput): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Feedback isn't available right now." };
  const uid = await ensureUserId();
  if (!uid) return { error: "Feedback isn't available right now." };

  let imagePath: string | null = null;
  if (input.consent && input.photo) {
    const path = `${uid}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage
      .from("training-images")
      .upload(path, input.photo, { contentType: "image/jpeg", upsert: false });
    if (error) return { error: "Couldn't upload the photo. Your answer wasn't sent." };
    imagePath = path;
  }

  const { error } = await sb.from("feedback").insert({
    user_id: uid,
    detection_id: input.detectionId,
    is_correct: input.isCorrect,
    corrected_class_key: input.isCorrect ? null : input.correctedClassKey,
    model_version: input.modelVersion,
    consent: input.consent && !!imagePath,
    image_path: imagePath,
  });
  if (error) {
    if (imagePath) await sb.storage.from("training-images").remove([imagePath]);
    return { error: "Couldn't send your answer. Please try again." };
  }
  return {};
}
