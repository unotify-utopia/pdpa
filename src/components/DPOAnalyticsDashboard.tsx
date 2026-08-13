import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock, CheckCircle, BarChart3, Activity, Loader2, AlertTriangle, Building2 } from 'lucide-react';

interface SLA_Breach {
  id: string;
  trackingNo: string;
  orgId: string;
  status: string;
  requesterName: string;
  slaRemainingDays: number;
  slaDaysUsed: number;
  slaDeadlineDate: string;
}

interface ReportSummary {
  totalRequests: number;
  totalActive: number;
  totalBreached: number;
  breachRatePercent: number;
  averageResolutionDays: number;
  statusBreakdown: Record<string, number>;
}

export default function DPOAnalyticsDashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [breaches, setBreaches] = useState<SLA_Breach[]>([]);
  const [warnings, setWarnings] = useState<SLA_Breach[]>([]);
  const [trend, setTrend] = useState<{ month: string; count: number }[]>([]);
  const [statusCounts, setStatusCounts] = useState<{ status: string; count: number }[]>([]);
  const [topOrgs, setTopOrgs] = useState<{ orgId: string; orgName: string; count: number }[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; trackingNo: string; type: string; message: string; date: string }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = user?.isSuperAdmin || user?.role === 'superadmin' || (user?.roles && user.roles.includes('superadmin'));

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedOrgId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const queryParam = selectedOrgId ? `?orgId=${selectedOrgId}` : '';

      const fetchPromises = [
        fetch(`/api/reports/summary${queryParam}`, { headers }),
        fetch(`/api/reports/sla-breach${queryParam}`, { headers }),
        fetch(`/api/reports/sla-warning${queryParam}`, { headers }),
        fetch(`/api/reports/by-month${queryParam}`, { headers }),
        fetch(`/api/reports/by-status${queryParam}`, { headers }),
        fetch(`/api/reports/alerts${queryParam}`, { headers })
      ];

      if (isSuperAdmin) {
        fetchPromises.push(fetch(`/api/reports/top-orgs`, { headers }));
      }

      const responses = await Promise.all(fetchPromises);
      
      for (const res of responses) {
        if (!res.ok) throw new Error('Failed to load dashboard data');
      }

      const data = await Promise.all(responses.map(r => r.json()));
      
      setSummary(data[0].report);
      setBreaches(data[1].breaches || []);
      setWarnings(data[2].warnings || []);
      setTrend(data[3].trend || []);
      setStatusCounts(data[4].statusCounts || []);
      setAlerts(data[5].alerts || []);
      
      if (isSuperAdmin && data[6]) {
        setTopOrgs(data[6].topOrgs || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper for Donut Chart
  const renderDonutChart = () => {
    if (!statusCounts.length) return <div className="text-center text-gray-400 py-8">ไม่มีข้อมูล</div>;
    
    const total = statusCounts.reduce((acc, curr) => acc + curr.count, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#06b6d4'];
    let currentDegree = 0;
    
    const gradients = statusCounts.map((item, index) => {
      const percentage = (item.count / total) * 100;
      const degrees = (percentage / 100) * 360;
      const color = colors[index % colors.length];
      const slice = `${color} ${currentDegree}deg ${currentDegree + degrees}deg`;
      currentDegree += degrees;
      return slice;
    }).join(', ');

    return (
      <div className="flex flex-col items-center">
        <div 
          className="w-48 h-48 rounded-full flex items-center justify-center relative mb-6 shadow-inner"
          style={{ background: `conic-gradient(${gradients})` }}
        >
          <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
            <span className="text-3xl font-bold text-gray-800">{total}</span>
            <span className="text-xs text-gray-500 font-medium">รวมทั้งหมด</span>
          </div>
        </div>
        <div className="w-full space-y-2 max-h-48 overflow-y-auto pr-2">
          {statusCounts.map((item, index) => (
            <div key={item.status} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
                <span className="text-gray-700 truncate max-w-[120px]" title={item.status}>{item.status}</span>
              </div>
              <span className="font-medium text-gray-900">{item.count} <span className="text-gray-400 font-normal">({Math.round((item.count/total)*100)}%)</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper for Line Chart
  const renderLineChart = () => {
    if (!trend.length) return <div className="text-center text-gray-400 py-8">ไม่มีข้อมูล</div>;
    
    const maxCount = Math.max(...trend.map(t => t.count), 1); // Avoid division by zero
    const height = 150;
    const width = 400; // viewBox width
    const points = trend.map((t, i) => {
      const x = (i / (trend.length - 1)) * width;
      const y = height - ((t.count / maxCount) * height * 0.8) - 10; // Keep some top margin
      return `${x},${y}`;
    }).join(' ');

    return (
      <div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          {/* Grid lines */}
          <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
          <line x1="0" y1="10" x2={width} y2="10" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
          
          {/* Data Line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {/* Data Points */}
          {trend.map((t, i) => {
             const x = (i / (trend.length - 1)) * width;
             const y = height - ((t.count / maxCount) * height * 0.8) - 10;
             return (
               <g key={i}>
                 <circle cx={x} cy={y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                 {t.count > 0 && <text x={x} y={y - 12} fontSize="10" fill="#6b7280" textAnchor="middle">{t.count}</text>}
               </g>
             );
          })}
        </svg>
        <div className="flex justify-between mt-2 text-xs text-gray-400 px-1">
          {trend.map((t, i) => (
             i % 2 === 0 ? <span key={i}>{t.month}</span> : null // Show every other month to avoid crowding
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            DPO Analytics Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            รายงานวิเคราะห์ข้อมูลและติดตามสถานะคำขอ (SLA Monitoring)
          </p>
        </div>
        
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Scope:</label>
            <select 
              value={selectedOrgId} 
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">ทั้งหมด (All Organizations)</option>
              {topOrgs.map(org => (
                <option key={org.orgId} value={org.orgId}>{org.orgName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-500 font-medium text-sm">คำขอทั้งหมด</h3>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalRequests}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-500 font-medium text-sm">กำลังดำเนินการ (Active)</h3>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalActive}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4"></div>
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-gray-500 font-medium text-sm">เกินกำหนด SLA</h3>
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-600 mt-2 relative z-10">{summary.totalBreached}</p>
            <p className="text-xs text-red-400 mt-1 relative z-10">Breach Rate: {summary.breachRatePercent}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-500 font-medium text-sm">ระยะเวลาเฉลี่ย (วัน)</h3>
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{summary.averageResolutionDays}</p>
            <p className="text-xs text-gray-400 mt-1">Average Resolution Time</p>
          </div>
        </div>
      )}

      {/* ALERTS PANEL */}
      {(alerts.length > 0 || warnings.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider">ระบบแจ้งเตือน (Action Required)</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {alerts.map(a => (
              <div key={a.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{a.trackingNo}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{a.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{a.message}</p>
                </div>
              </div>
            ))}
            {warnings.map(w => (
              <div key={w.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{w.trackingNo}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">SLA_WARNING</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">คำขอนี้เหลือเวลา SLA อีกเพียง <strong className="text-amber-700">{w.slaRemainingDays} วัน</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHARTS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6">สัดส่วนสถานะคำขอ (Status Breakdown)</h2>
          <div className="flex-grow flex items-center justify-center">
            {renderDonutChart()}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6">แนวโน้มคำขอรายเดือน (Monthly Trend)</h2>
          <div className="flex-grow flex flex-col justify-center">
            {renderLineChart()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA BREACH TABLE */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-base font-bold text-gray-800">คำขอที่เกินกำหนด (SLA Breach)</h2>
            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold">
              {breaches.length} รายการ
            </span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-medium">Tracking No</th>
                  <th className="px-6 py-3 font-medium">ผู้ร้องขอ</th>
                  <th className="px-6 py-3 font-medium">สถานะ</th>
                  <th className="px-6 py-3 font-medium text-right">วันเกินกำหนด (Days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {breaches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">ไม่มีรายการเกินกำหนดเวลา</td>
                  </tr>
                ) : (
                  breaches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{b.trackingNo}</td>
                      <td className="px-6 py-4 text-gray-600">{b.requesterName || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-red-600 font-bold">{Math.abs(b.slaRemainingDays)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP ORGS TABLE (SUPERADMIN ONLY) */}
        {isSuperAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-gray-800">หน่วยงานที่มีคำขอสูงสุด</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {topOrgs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">ไม่มีข้อมูล</div>
              ) : (
                topOrgs.map((org, idx) => (
                  <div key={org.orgId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]" title={org.orgName}>{org.orgName}</p>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-indigo-600">{org.count}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
