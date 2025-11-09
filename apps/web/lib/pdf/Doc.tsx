import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { ReportData } from "@/lib/report/assembleNarrative";
export function buildStyles(colors:{primary:string;text:string}, fontSize=12){
  return StyleSheet.create({page:{padding:32,fontSize,color:colors.text},h1:{fontSize:fontSize+10,marginBottom:8},h2:{fontSize:fontSize+4,marginTop:12,marginBottom:6},logo:{width:80,height:80,objectFit:"contain",marginBottom:8},barW:{marginVertical:2,backgroundColor:"#e5e7eb",height:6,borderRadius:3},bar:{backgroundColor:"#2563eb",height:6,borderRadius:3}});
}
export function ReportDoc(data:ReportData, colors:{primary:string;text:string}){
  const s=buildStyles(colors,12);const freq=Object.entries(data.freqPct);const prof=Object.entries(data.profilePct);
  return (<Document><Page size="A4" style={s.page}>
    {data.org.logo_url ? <Image src={data.org.logo_url} style={s.logo}/> : null}
    <Text style={s.h1}>{data.org.name} — Signature Profiling Report</Text>
    <Text>Participant: {data.taker.fullName}</Text>
    <Text>Test: {data.test.name || "—"}</Text>
    <Text>Completed: {data.taker.completed_at || "—"}</Text>
    {data.org.tagline ? <Text style={{marginTop:6}}>{data.org.tagline}</Text> : null}
    <View style={{marginTop:12}}><Text style={s.h2}>Frequency mix</Text>
      {freq.length?freq.map(([k,v])=>{const w=Math.max(0,Math.min(100,v));return(<View key={k} style={{marginBottom:4}}><Text>{k}: {w}%</Text><View style={s.barW}><View style={[s.bar,{width:`${w}%`}]} /></View></View>)}):<Text>—</Text>}
    </View>
    <View style={{marginTop:12}}><Text style={s.h2}>Profile mix</Text>
      {prof.length?prof.map(([k,v])=>{const w=Math.max(0,Math.min(100,v));return(<View key={k} style={{marginBottom:4}}><Text>{k}: {w}%</Text><View style={s.barW}><View style={[s.bar,{width:`${w}%`}]} /></View></View>)}):<Text>—</Text>}
    </View>
    {data.org.disclaimer ? <Text style={{marginTop:16}}>{data.org.disclaimer}</Text> : null}
  </Page></Document>);
}
