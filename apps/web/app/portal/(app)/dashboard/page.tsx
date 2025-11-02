"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

/**
 * DashboardContent — main logic wrapped by Suspense boundary
 */
function DashboardContent() {
  const params = useSearchParams();
  const orgSlug = params.get("org") || "team-puzzle";

  const [freqData, setFreqData] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const freqRes = await fetch(`/api/portal-dashboard?org=${orgSlug}&type=frequency`);
        const profRes = await fetch(`/api/portal-dashboard?org=${orgSlug}&type=profile`);
        const [f, p] = await Promise.all([freqRes.json(), profRes.json()]);
        setFreqData(f);
        setProfileData(p);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgSlug]);

  const freqChart = useMemo(
    () =>
      freqData.map((item) => ({
        name: item.frequency_name,
        points: parseFloat(item.avg_points),
      })),
    [freqData]
  );

  const profileChart = useMemo(
    () =>
      profileData.map((item) => ({
        name: item.profile_name,
        points: parseFloat(item.avg_points),
      })),
    [profileData]
  );

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading dashboard data…</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Frequency Mix */}
      <Card>
        <CardHeader>
          <CardTitle>Frequency Mix</CardTitle>
        </CardHeader>
        <CardContent>
          {freqChart.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={freqChart}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                  {freqChart.map((entry, index) => (
                    <Cell key={`cell-freq-${index}`} fill="#8884d8" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No frequency data available</p>
          )}
        </CardContent>
      </Card>

      {/* Profile Mix */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Mix</CardTitle>
        </CardHeader>
        <CardContent>
          {profileChart.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profileChart}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                  {profileChart.map((entry, index) => (
                    <Cell key={`cell-prof-${index}`} fill="#82ca9d" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No profile data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * DashboardPage — wraps content in Suspense boundary to support useSearchParams
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}

