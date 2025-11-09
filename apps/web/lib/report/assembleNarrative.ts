type Json = any;
export type ReportData = {
  org:{name:string;logo_url:string|null;tagline:string|null;disclaimer:string|null};
  taker:{fullName:string;email:string|null;company:string|null;role_title:string|null;completed_at:string|null};
  test:{name:string|null};
  freqPct:Record<string,number>;
  profilePct:Record<string,number>;
};
function parseTotals(t:any){if(!t)return{};try{if(typeof t==="string"){const a=JSON.parse(t);return typeof a==="string"?JSON.parse(a):a;}return t as Record<string,number>;}catch{return{}}}
function asPct(m:Record<string,number>){const s=Object.values(m).reduce((a,b)=>a+(+b||0),0);if(!s)return Object.fromEntries(Object.keys(m).map(k=>[k,0]));return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Math.round(((+v||0)/s)*100)]))}
export function assembleNarrative(raw:{org:any;taker:any;test:any;latestResult:{totals:Json|null;created_at:string}|null}):ReportData{
  const totals=parseTotals(raw.latestResult?.totals);const keys=Object.keys(totals);const isFreq=keys.length&&keys.every(k=>["A","B","C","D"].includes(k.toUpperCase()));
  const freq=isFreq?Object.fromEntries(Object.entries(totals).map(([k,v])=>[k.toUpperCase(),+v||0])):{};
  const prof=!isFreq?Object.fromEntries(Object.entries(totals).map(([k,v])=>[String(k),+v||0])):{};
  const full=[raw.taker?.first_name,raw.taker?.last_name].filter(Boolean).join(" ").trim()||"—";
  return {org:{name:raw.org?.name??"—",logo_url:raw.org?.logo_url??null,tagline:raw.org?.report_cover_tagline??null,disclaimer:raw.org?.report_disclaimer??null},
          taker:{fullName:full,email:raw.taker?.email??null,company:raw.taker?.company??null,role_title:raw.taker?.role_title??null,completed_at:raw.latestResult?.created_at??null},
          test:{name:raw.test?.name??null},freqPct:asPct(freq),profilePct:asPct(prof)};
}
