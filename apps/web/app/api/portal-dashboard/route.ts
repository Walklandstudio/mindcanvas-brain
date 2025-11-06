import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

type KV = { key: string; value: number; percent?: string };
type Dash = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

const PROFILE_ORDER = ["PROFILE_1","PROFILE_2","PROFILE_3","PROFILE_4","PROFILE_5","PROFILE_6","PROFILE_7","PROFILE_8"];
const FREQ_ORDER = ["A","B","C","D"];

const L = (s: string) => s.toLowerCase();
const idLike = (k:string) => /(^|_)id$/.test(L(k)) || ["id","org_id","organization_id","test_id"].includes(L(k));

function cols(sample: Record<string, any>) {
  const keys = Object.keys(sample || {});
  const keyHints = ["frequency_code","profile_code","frequency","profile","name","label","code","title","key"];
  const valHints = ["avg","average","value","score","count","total","sum","mean"];
  const keyCol =
    keys.find(c => keyHints.some(h => L(c).includes(h)) && !idLike(c)) ??
    keys.find(c => typeof sample[c] === "string" && !idLike(c)) ??
    keys.find(c => !idLike(c)) ?? keys[0];
  const valCol =
    keys.find(c => valHints.some(h => L(c).includes(h))) ??
    keys.find(c => typeof sample[c] === "number") ??
    keys.find(c => sample[c] != null && !Number.isNaN(Number(sample[c]))) ??
    keys[1] ?? keys[0];
  return { keyCol, valCol };
}
function toKV(rows?: any[] | null): KV[] {
  if (!rows?.length) return [];
  const { keyCol, valCol } = cols(rows[0]);
  return rows.map(r => ({
    key: String(r?.[keyCol] ?? ""),
    value: Number(r?.[valCol] ?? 0),
  }));
}
function onlyOrg(orgId: string, rows?: any[] | null) {
  return (rows ?? []).filter(r => r?.org_id === orgId || r?.organization_id === orgId || r?.orgid === orgId);
}
function detectOverall(rows?: any[] | null) {
  const row = (rows ?? [])[0] ?? {};
  const k = Object.keys(row);
  const avg = k.find(x => ["avg","average","mean"].some(w => L(x).includes(w)));
  const cnt = k.find(x => ["count","total","responses","n"].some(w => L(x).includes(w)));
  return { average: avg ? Number(row[avg]) : undefined, count: cnt ? Number(row[cnt]) : undefined };
}
function looksBad(rows: KV[]) {
  if (!rows.length) return true;
  const allSame = rows.every(r => r.key === rows[0].key);
  const uuidish = /^[0-9a-f-]{30,}$/i.test(rows[0].key || "");
  return allSame || uuidish;
}
function asPercent(v:number, total:number) {
  if (!total) return "0%";
  return ((v/total)*100).toFixed(1) + "%";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const forcedTestId = (url.searchParams.get("testId") || "").trim() || null;
    if (!orgSlug) return NextResponse.json({ ok: false, error: "Missing ?org" }, { status: 400 });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
    const s = sb.schema("portal");

    const orgQ = await s.from("v_organizations").select("id,slug,name").eq("slug", orgSlug).limit(1);
    if (orgQ.error) return NextResponse.json({ ok:false, error:`Org lookup failed: ${orgQ.error.message}` }, { status:500 });
    const org = orgQ.data?.[0];
    if (!org) return NextResponse.json({ ok:false, error:"Org not found" }, { status:404 });

    // Find a test that has labels
    let testId = forcedTestId;
    if (!testId) {
      const tQ = await s.from("v_org_tests").select("id,created_at").eq("org_id", org.id).order("created_at",{ascending:false}).limit(5);
      const ids = (tQ.data??[]).map(r=>r.id);
      for (const id of ids) {
        const chk = await s.from("test_profile_labels").select("profile_code").eq("test_id", id).limit(1);
        if (!chk.error && chk.data?.length) { testId=id; break; }
      }
      if (!testId && ids[0]) testId=ids[0];
    }

    // Label maps
    let profileNames: Record<string,string> = {};
    let frequencyNames: Record<string,string> = {};
    if (testId) {
      const [pl, fl] = await Promise.all([
        s.from("test_profile_labels").select("profile_code,profile_name").eq("test_id", testId),
        s.from("test_frequency_labels").select("frequency_code,frequency_name").eq("test_id", testId),
      ]);
      if (!pl.error && pl.data) profileNames = Object.fromEntries(pl.data.map((r:any)=>[r.profile_code,r.profile_name]));
      if (!fl.error && fl.data) frequencyNames = Object.fromEntries(fl.data.map((r:any)=>[r.frequency_code,r.frequency_name]));
    }

    // Dashboard data
    const [fq,pq,t3,b3,o] = await Promise.all([
      s.from("v_dashboard_avg_frequency").select("*"),
      s.from("v_dashboard_avg_profile").select("*"),
      s.from("v_dashboard_top3_profiles").select("*"),
      s.from("v_dashboard_bottom3_profiles").select("*"),
      s.from("v_dashboard_overall_avg").select("*").limit(1),
    ]);
    const freqRows = fq.error?[]:onlyOrg(org.id,fq.data);
    const profRows = pq.error?[]:onlyOrg(org.id,pq.data);
    const top3Rows = t3.error?[]:onlyOrg(org.id,t3.data);
    const bottom3Rows = b3.error?[]:onlyOrg(org.id,b3.data);
    const overallRows = o.error?[]:onlyOrg(org.id,o.data);

    let frequencies = toKV(freqRows);
    let profiles = toKV(profRows);
    let top3 = toKV(top3Rows);
    let bottom3 = toKV(bottom3Rows);
    const overall = detectOverall(overallRows);

    // Relabel
    const relabelByCode = (rows:KV[], names:Record<string,string>) => rows.map(r=>({...r, key:names[r.key]??r.key}));
    if (Object.keys(frequencyNames).length) frequencies = relabelByCode(frequencies,frequencyNames);
    if (Object.keys(profileNames).length) {
      profiles = relabelByCode(profiles,profileNames);
      top3 = relabelByCode(top3,profileNames);
      bottom3 = relabelByCode(bottom3,profileNames);
    }

    // Percentages
    const freqTotal = frequencies.reduce((a,b)=>a+b.value,0);
    const profTotal = profiles.reduce((a,b)=>a+b.value,0);
    frequencies = frequencies.map(f=>({...f, percent: asPercent(f.value,freqTotal)}));
    profiles = profiles.map(p=>({...p, percent: asPercent(p.value,profTotal)}));

    const data: Dash = {frequencies, profiles, top3, bottom3, overall};
    return NextResponse.json({ok:true,org:orgSlug,testId,data},{status:200});
  } catch (e:any) {
    return NextResponse.json({ok:false,error:e?.message??"Unknown error"},{status:500});
  }
}
