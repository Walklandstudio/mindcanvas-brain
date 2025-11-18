'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type PersonalityRadarProps = {
  frequencies: {
    innovationA: number; // 0–1 or 0–100
    influenceB: number;
    implementationC: number;
    insightD: number;
  };
  profiles: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
    p6: number;
    p7: number;
    p8: number;
  };
};

const labels = [
  'Innovation A',
  'P1',
  'P2',
  'Influence B',
  'P3',
  'P4',
  'Implementation C',
  'P5',
  'P6',
  'Insight D',
  'P7',
  'P8',
];

// Normalise values: if they look like 0–1, convert to 0–100
function toPercent(v: number | undefined | null): number {
  if (!v || Number.isNaN(v)) return 0;
  if (v <= 1) return Math.round(v * 100);
  return Math.round(v);
}

export default function PersonalityRadar({
  frequencies,
  profiles,
}: PersonalityRadarProps) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Frequencies',
        data: [
          toPercent(frequencies.innovationA),
          null,
          null,
          toPercent(frequencies.influenceB),
          null,
          null,
          toPercent(frequencies.implementationC),
          null,
          null,
          toPercent(frequencies.insightD),
          null,
          null,
        ],
        borderColor: '#2D8FC4',
        backgroundColor: 'rgba(45, 143, 196, 0.18)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#2D8FC4',
        pointHoverRadius: 4,
        spanGaps: true,
      },
      {
        label: 'Profiles',
        data: [
          null,
          toPercent(profiles.p1),
          toPercent(profiles.p2),
          null,
          toPercent(profiles.p3),
          toPercent(profiles.p4),
          null,
          toPercent(profiles.p5),
          toPercent(profiles.p6),
          null,
          toPercent(profiles.p7),
          toPercent(profiles.p8),
        ],
        borderColor: '#0FB9B1',
        backgroundColor: 'rgba(15, 185, 177, 0.18)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#0FB9B1',
        pointHoverRadius: 4,
        spanGaps: true,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 18,
          font: {
            family: 'Fira Sans, system-ui, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || '';
            const value = ctx.parsed.r ?? 0;
            return `${label}: ${value}%`;
          },
        },
      },
    },
    scales: {
      r: {
        angleLines: {
          color: '#E4E7EB',
        },
        grid: {
          color: '#E4E7EB',
        },
        min: 0,
        max: 100,
        ticks: {
          showLabelBackdrop: false,
          stepSize: 10,
          callback: (v: number) => `${v}%`,
          font: {
            family: 'Fira Sans, system-ui, sans-serif',
            size: 10,
          },
        },
        pointLabels: {
          font: {
            family: 'Fira Sans, system-ui, sans-serif',
            size: 12,
          },
          color: '#111827',
        },
      },
    },
  };

  return (
    <div className="w-full">
      <h3 className="mb-2 text-center text-base font-semibold text-slate-900">
        Your Personality Map (Frequencies + Profiles)
      </h3>
      <div className="relative h-80 w-full">
        <Radar data={data} options={options} />
      </div>
    </div>
  );
}
