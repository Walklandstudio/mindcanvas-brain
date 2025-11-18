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
    innovationA: number;      // Frequency A (%)
    influenceB: number;       // Frequency B (%)
    implementationC: number;  // Frequency C (%)
    insightD: number;         // Frequency D (%)
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

export function PersonalityRadar({ frequencies, profiles }: PersonalityRadarProps) {
  const {
    innovationA,
    influenceB,
    implementationC,
    insightD,
  } = frequencies;

  const {
    p1,
    p2,
    p3,
    p4,
    p5,
    p6,
    p7,
    p8,
  } = profiles;

  const data = {
    labels,
    datasets: [
      {
        label: 'Frequencies',
        data: [
          innovationA,
          null,
          null,
          influenceB,
          null,
          null,
          implementationC,
          null,
          null,
          insightD,
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
          p1,
          p2,
          null,
          p3,
          p4,
          null,
          p5,
          p6,
          null,
          p7,
          p8,
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
        position: 'bottom',
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
            const value = ctx.formattedValue || '0';
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
        suggestedMin: 0,
        suggestedMax: 40, // or 100 later if you want full scale
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

export default PersonalityRadar;
