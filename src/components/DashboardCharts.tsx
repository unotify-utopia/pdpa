import React from 'react';
import type { Request } from '../types';

interface DashboardChartsProps {
  requests: Request[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ requests }) => {
  // Aggregate data
  const total = requests.length;
  
  // Channels split
  const channelCounts = requests.reduce((acc, r) => {
    acc[r.contactChannel] = (acc[r.contactChannel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Requester split
  const typeCounts = requests.reduce((acc, r) => {
    acc[r.requesterType] = (acc[r.requesterType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // SLA stats
  const onTrack = requests.filter(r => !r.slaPaused && r.slaRemainingDays > 7 && !['Closed', 'Delivered', 'Withdrawn'].includes(r.status)).length;
  const atRisk = requests.filter(r => !r.slaPaused && r.slaRemainingDays <= 7 && r.slaRemainingDays >= 0 && !['Closed', 'Delivered', 'Withdrawn'].includes(r.status)).length;
  const overdue = requests.filter(r => !r.slaPaused && r.slaRemainingDays < 0 && !['Closed', 'Delivered', 'Withdrawn'].includes(r.status)).length;
  const paused = requests.filter(r => r.slaPaused).length;

  const channelsData = [
    { label: 'พอร์ทัลออนไลน์ (Web)', count: channelCounts['web'] || 0, color: 'bg-brand-500', fill: '#0ea5e9' },
    { label: 'อีเมล (Email)', count: channelCounts['email'] || 0, color: 'bg-indigo-500', fill: '#6366f1' },
    { label: 'ไปรษณีย์ (Post)', count: channelCounts['post'] || 0, color: 'bg-amber-500', fill: '#f59e0b' },
    { label: 'ยื่นที่สำนักงาน (Office)', count: channelCounts['office'] || 0, color: 'bg-emerald-500', fill: '#10b981' },
  ];

  const typeData = [
    { label: 'เจ้าของข้อมูล (Self)', count: typeCounts['self'] || 0, pct: total ? Math.round(((typeCounts['self'] || 0) / total) * 100) : 0, color: 'bg-brand-600' },
    { label: 'ผู้รับมอบอำนาจ (Agent)', count: typeCounts['representative'] || 0, pct: total ? Math.round(((typeCounts['representative'] || 0) / total) * 100) : 0, color: 'bg-teal-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* SLA Status Widget */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">ประสิทธิภาพตามข้อกำหนด (SLA Health)</span>
          <span className="text-2xl font-bold text-slate-800">
            {total ? Math.round(((onTrack + paused) / Math.max(1, onTrack + atRisk + overdue + paused)) * 100) : 100}%
          </span>
          <span className="text-xs text-slate-500 block">ของคำขอที่ทำงานอยู่ในเกณฑ์ปกติ (On track)</span>
        </div>

        <div className="space-y-2">
          {/* Progress stack bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${total ? (onTrack / total) * 100 : 0}%` }} className="bg-emerald-500 h-full" title="On Track" />
            <div style={{ width: `${total ? (paused / total) * 100 : 0}%` }} className="bg-blue-400 h-full" title="SLA Paused" />
            <div style={{ width: `${total ? (atRisk / total) * 100 : 0}%` }} className="bg-amber-500 h-full" title="At Risk" />
            <div style={{ width: `${total ? (overdue / total) * 100 : 0}%` }} className="bg-rose-500 h-full" title="Overdue" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full"></span>
              <span className="text-slate-600">On Track: <strong>{onTrack}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-blue-400 rounded-full"></span>
              <span className="text-slate-600">Paused (รอข้อมูล): <strong>{paused}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-amber-500 rounded-full"></span>
              <span className="text-slate-600">At Risk (&lt;7 วัน): <strong>{atRisk}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-rose-500 rounded-full"></span>
              <span className="text-slate-600">Overdue (เกินกำหนด): <strong>{overdue}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Splits Chart (SVG Custom Bar Chart) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">ช่องทางการยื่นคำขอ (Submission Channels)</span>
        
        <div className="space-y-2.5">
          {channelsData.map((ch) => {
            const pct = total ? Math.round((ch.count / total) * 100) : 0;
            return (
              <div key={ch.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{ch.label}</span>
                  <span>{ch.count} คำขอ ({pct}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${pct}%` }} className={`h-full ${ch.color} rounded-full`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Requester Type Splits (Visual Card-based percentages) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">ประเภทผู้ยื่นสิทธิ (Requester Share)</span>

        <div className="flex items-center justify-around h-full py-2">
          {typeData.map((t) => (
            <div key={t.label} className="text-center space-y-2 flex flex-col items-center">
              {/* Draw custom SVG circle progress */}
              <div className="relative h-16 w-16 flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="transparent"
                    stroke={t.color === 'bg-brand-600' ? '#0284c7' : '#14b8a6'}
                    strokeWidth="6"
                    strokeDasharray={175}
                    strokeDashoffset={175 - (175 * t.pct) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-bold text-slate-800">{t.pct}%</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-700">{t.label}</span>
                <span className="text-[10px] text-slate-400 font-bold">{t.count} คำขอ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
