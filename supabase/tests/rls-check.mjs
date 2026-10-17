// SPDX-License-Identifier: AGPL-3.0-or-later
// RLS check (ROADMAP Phase 10 exit criteria) against a real project, using only the
// public anon key and two anonymous users, exactly like the app.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=... node supabase/tests/rls-check.mjs
//
// Needs "Allow anonymous sign-ins" enabled in the project's Auth settings.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY");
  process.exit(2);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function anonUser() {
  const c = createClient(url, key, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`Anonymous sign-in failed: ${error.message}`);
  return { c, id: data.user.id };
}

// --- not signed in -----------------------------------------------------------------
const pub = createClient(url, key, opts);
{
  const cats = await pub.from("waste_categories").select("key").order("sort_order");
  check("public reads 4 bins", cats.data?.length === 4, cats.error?.message);
  const items = await pub.from("waste_items").select("class_key, is_detectable");
  check(
    "public reads items (23 detectable)",
    items.data?.filter((i) => i.is_detectable).length === 23,
    `${items.data?.length} items`,
  );
  const scans = await pub.from("scan_sessions").select("id");
  check("public cannot read scans", (scans.data ?? []).length === 0, scans.error?.message);
  const ins = await pub.from("scan_sessions").insert({ model_version: "x" });
  check("public cannot insert scans", !!ins.error);
  const edit = await pub.from("waste_items").update({ display_name: "hacked" }).eq("class_key", "battery");
  const after = await pub.from("waste_items").select("display_name").eq("class_key", "battery").single();
  check("public cannot edit items", after.data?.display_name === "Battery", edit.error?.message);
}

// --- two users ---------------------------------------------------------------------
const A = await anonUser();
const B = await anonUser();
check("two distinct anonymous users", A.id !== B.id);

const prof = await A.c.from("profiles").select("id, role").eq("id", A.id).single();
check("profile auto-created with role user", prof.data?.role === "user", prof.error?.message);

const sess = await A.c
  .from("scan_sessions")
  .insert({ model_version: "rls-check", source: "kiosk", latency_ms: 420, inference_backend: "wasm" })
  .select()
  .single();
check("A inserts own scan", !!sess.data, sess.error?.message);
check("A cannot claim kiosk source", sess.data?.source === "mobile", sess.data?.source);
const sid = sess.data?.id;

const det = await A.c
  .from("scan_detections")
  .insert({
    session_id: sid,
    class_key: "paper_bag",
    category_key: "hazardous", // wrong on purpose: the server must override it
    confidence: 0.61,
    bbox: { x1: 0.1, y1: 0.1, x2: 0.9, y2: 0.8 },
    is_primary: true,
  })
  .select()
  .single();
check("A inserts detection", !!det.data, det.error?.message);
check("bin comes from server (recyclable)", det.data?.category_key === "recyclable", det.data?.category_key);

const bad = await A.c
  .from("scan_detections")
  .insert({ session_id: sid, class_key: "not_a_class", category_key: "residual", confidence: 0.5, bbox: {} });
check("unknown class_key rejected", !!bad.error);

const bSees = await B.c.from("scan_sessions").select("id");
check("B cannot see A's scans", (bSees.data ?? []).length === 0, `${bSees.data?.length} rows`);
const bDet = await B.c.from("scan_detections").select("id").eq("session_id", sid);
check("B cannot see A's detections", (bDet.data ?? []).length === 0);
const bIns = await B.c
  .from("scan_detections")
  .insert({ session_id: sid, class_key: "battery", category_key: "hazardous", confidence: 0.9, bbox: {} });
check("B cannot add detections to A's scan", !!bIns.error);
const bDel = await B.c.from("scan_sessions").delete().eq("id", sid).select();
check("B cannot delete A's scan", (bDel.data ?? []).length === 0);

const aSees = await A.c.from("scan_sessions").select("id, scan_detections(class_key)");
check("A sees own scan with detection", aSees.data?.[0]?.scan_detections?.length === 1);

const promote = await A.c.from("profiles").update({ role: "admin" }).eq("id", A.id);
const roleAfter = await A.c.from("profiles").select("role").eq("id", A.id).single();
check("A cannot make self admin", roleAfter.data?.role === "user", promote.error?.message);
const prefs = await A.c.from("profiles").update({ prefs: { tts_auto: true } }).eq("id", A.id).select().single();
check("A can update own prefs", prefs.data?.prefs?.tts_auto === true, prefs.error?.message);

const counts = await A.c.rpc("daily_counts_by_category");
check("A gets own daily counts", counts.data?.some((r) => r.category_key === "recyclable"), counts.error?.message);
const bCounts = await B.c.rpc("daily_counts_by_category");
check("B's counts exclude A's scans", (bCounts.data ?? []).length === 0, bCounts.error?.message);

// --- feedback (Phase 20) -------------------------------------------------------------
const fb = await A.c
  .from("feedback")
  .insert({ user_id: A.id, detection_id: det.data?.id, is_correct: false, corrected_class_key: "battery" })
  .select()
  .single();
check("A sends feedback on own detection", !!fb.data, fb.error?.message);
check("feedback starts pending", fb.data?.review_status === "pending", fb.data?.review_status);
const preApproved = await A.c
  .from("feedback")
  .insert({ user_id: A.id, detection_id: det.data?.id, is_correct: true, review_status: "approved" });
check("A cannot self-approve feedback", !!preApproved.error);
const bFb = await B.c
  .from("feedback")
  .insert({ user_id: B.id, detection_id: det.data?.id, is_correct: true });
check("B cannot give feedback on A's detection", !!bFb.error);
const bReads = await B.c.from("feedback").select("id");
check("B cannot read A's feedback", (bReads.data ?? []).length === 0);
const review = await A.c.rpc("admin_review_feedback", { p_id: fb.data?.id, p_status: "approved" });
check("non-admin cannot review feedback", !!review.error);
const noImg = await A.c
  .from("feedback")
  .insert({ user_id: A.id, detection_id: det.data?.id, is_correct: true, image_path: `${A.id}/x.jpg` });
check("photo needs consent", !!noImg.error);
const bUp = await B.c.storage
  .from("training-images")
  .upload(`${A.id}/rls-check.jpg`, new Blob(["x"], { type: "image/jpeg" }));
check("B cannot upload into A's photo folder", !!bUp.error);

const del = await A.c.rpc("delete_my_data");
check("delete_my_data removes A's scans", del.data?.[0]?.scans_deleted === 1, del.error?.message);
check("delete_my_data removes A's feedback", del.data?.[0]?.feedback_deleted === 1, del.error?.message);
const gone = await A.c.from("scan_sessions").select("id");
check("A has no scans after delete", (gone.data ?? []).length === 0);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll RLS checks passed");
process.exit(failures ? 1 : 0);
