import { useEffect, useState } from 'react';
import { Database, ShieldAlert, Archive, Server, Activity, FileText } from 'lucide-react';

interface SystemDashboardProps {
  token: string;
  isDark?: boolean;
}

export default function SystemDashboard({ token, isDark = false }: SystemDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/super-admin/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูลระบบ...</div>;
  if (error) return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;
  if (!stats) return null;

  const { dbSize, metrics, archives, recentAlerts, systemInfo, diskInfo } = stats;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0h';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    if (d > 0) return `${d} วัน ${h} ชม.`;
    return `${h} ชม. ${m} นาที`;
  };

  const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textTitleClass = isDark ? 'text-slate-100' : 'text-slate-800';
  const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const textValueClass = isDark ? 'text-white' : 'text-slate-900';
  const tableHeaderBg = isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200';
  const borderLightClass = isDark ? 'border-slate-800' : 'border-slate-100';
  const rowHoverClass = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${textTitleClass}`}>System Dashboard</h2>
          <p className={`${textSubClass} mt-1`}>ภาพรวมการทำงานของระบบและสถานะความปลอดภัย</p>
        </div>
        <button onClick={() => window.location.reload()} className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DB Size */}
        <div className={`rounded-xl border p-5 ${cardBgClass}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Database size={20} /></div>
            <h3 className={`font-semibold ${textTitleClass}`}>ขนาด Database รวม</h3>
          </div>
          <p className={`text-3xl font-bold mt-3 ${textValueClass}`}>{dbSize?.size_pretty || 'N/A'}</p>
          <p className={`text-sm mt-1 ${textSubClass}`}>ข้อมูลทั้งหมดในฐานข้อมูล</p>
        </div>

        {/* Log Size */}
        <div className={`rounded-xl border p-5 ${cardBgClass}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><FileText size={20} /></div>
            <h3 className={`font-semibold ${textTitleClass}`}>ขนาด Log</h3>
          </div>
          <p className={`text-3xl font-bold mt-3 ${textValueClass}`}>{dbSize?.log_size_pretty || 'N/A'}</p>
          <p className={`text-sm mt-1 ${textSubClass}`}>ประวัติการใช้งานและ Security Log</p>
        </div>

        {/* Archive Size */}
        <div className={`rounded-xl border p-5 ${cardBgClass}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Archive size={20} /></div>
            <h3 className={`font-semibold ${textTitleClass}`}>ขนาด Archive</h3>
          </div>
          <p className={`text-3xl font-bold mt-3 ${textValueClass}`}>{formatBytes(archives?.sizeBytes || 0)}</p>
          <p className={`text-sm mt-1 ${textSubClass}`}>จำนวนไฟล์: {archives?.count || 0} ไฟล์</p>
        </div>

        {/* Combined Security Info */}
        <div className={`rounded-xl border p-5 ${cardBgClass}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-red-50 text-red-600'}`}><ShieldAlert size={20} /></div>
            <h3 className={`font-semibold ${textTitleClass}`}>ความปลอดภัยระบบ</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={`text-2xl font-bold ${textValueClass}`}>{metrics?.payload_blocks || 0}</p>
              <p className={`text-xs mt-1 ${textSubClass}`}>บล็อกการโจมตี</p>
            </div>
            <div className={`border-l pl-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-2xl font-bold ${textValueClass}`}>{metrics?.otp_failures || 0}</p>
              <p className={`text-xs mt-1 ${textSubClass}`}>OTP ผิดพลาด</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={`lg:col-span-2 rounded-xl border overflow-hidden h-fit self-start ${cardBgClass}`}>
          <div className={`px-6 py-4 border-b ${tableHeaderBg}`}>
            <h3 className={`font-bold flex items-center gap-2 ${textTitleClass}`}>
              <ShieldAlert size={18} className={isDark ? 'text-rose-400' : 'text-red-500'} /> Security Alerts ล่าสุด
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b ${tableHeaderBg}`}>
                <tr>
                  <th className="px-6 py-3 font-medium">เวลา</th>
                  <th className="px-6 py-3 font-medium">เหตุการณ์</th>
                  <th className="px-6 py-3 font-medium">IP Address</th>
                  <th className="px-6 py-3 font-medium">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {recentAlerts && recentAlerts.length > 0 ? (
                  recentAlerts.map((alert: any) => (
                    <tr key={alert.id} className={`${rowHoverClass} transition`}>
                      <td className={`px-6 py-2.5 whitespace-nowrap ${textSubClass}`}>
                        {new Date(alert.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="px-6 py-2.5">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          alert.action.includes('PAYLOAD') ? (isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-red-100 text-red-700') :
                          alert.action.includes('LOGIN') ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-100 text-purple-700') :
                          (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-orange-100 text-orange-700')
                        }`}>
                          {alert.action}
                        </span>
                      </td>
                      <td className={`px-6 py-2.5 font-mono text-xs ${textSubClass}`}>{alert.ip_address}</td>
                      <td className={`px-6 py-2.5 truncate max-w-xs ${textSubClass}`} title={alert.details}>{alert.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className={`px-6 py-8 text-center ${textSubClass}`}>ไม่มีข้อมูลการแจ้งเตือนความปลอดภัย</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* System Resources */}
          <div className={`rounded-xl border overflow-hidden ${cardBgClass}`}>
             <div className={`px-6 py-4 border-b ${tableHeaderBg}`}>
              <h3 className={`font-bold flex items-center gap-2 ${textTitleClass}`}>
                <Activity size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} /> ทรัพยากรระบบ (Server)
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className={`flex justify-between items-center pb-4 border-b ${borderLightClass}`}>
                <div className={textSubClass}>CPU Load (1m)</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{systemInfo?.loadAvg?.[0]?.toFixed(2) || '0.00'}</div>
              </div>
              <div className={`flex justify-between items-center pb-4 border-b ${borderLightClass}`}>
                <div className={textSubClass}>RAM ที่ว่าง (Free)</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{formatBytes(systemInfo?.freeMem || 0)} <span className="text-sm font-normal text-slate-500">/ {formatBytes(systemInfo?.totalMem || 0)}</span></div>
              </div>
              <div className={`flex justify-between items-center pb-4 border-b ${borderLightClass}`}>
                <div className={textSubClass}>Disk ที่ว่าง (Free)</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{formatBytes(diskInfo?.free || 0)} <span className="text-sm font-normal text-slate-500">/ {formatBytes(diskInfo?.total || 0)}</span></div>
              </div>
              <div className="flex justify-between items-center">
                <div className={textSubClass}>Uptime</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{formatUptime(systemInfo?.uptime || 0)}</div>
              </div>
            </div>
          </div>

          {/* Data Summary */}
          <div className={`rounded-xl border overflow-hidden ${cardBgClass}`}>
             <div className={`px-6 py-4 border-b ${tableHeaderBg}`}>
              <h3 className={`font-bold flex items-center gap-2 ${textTitleClass}`}>
                <Server size={18} className={isDark ? 'text-blue-400' : 'text-blue-500'} /> สรุปปริมาณข้อมูล
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className={`flex justify-between items-center pb-4 border-b ${borderLightClass}`}>
                <div className={textSubClass}>จำนวนคำร้องทั้งหมด</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{metrics?.total_requests || 0}</div>
              </div>
              {!stats.isSingleNode && (
                <div className={`flex justify-between items-center pb-4 border-b ${borderLightClass}`}>
                  <div className={textSubClass}>จำนวนหน่วยงาน (Tenants)</div>
                  <div className={`font-bold text-lg ${textValueClass}`}>{metrics?.total_tenants || 0}</div>
                </div>
              )}
              <div className={`flex justify-between items-center pb-4 border-b ${borderLightClass}`}>
                <div className={textSubClass}>บัญชีผู้ใช้งานระบบ (Staff)</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{metrics?.total_users || 0}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className={textSubClass}>จำนวน Audit Logs</div>
                <div className={`font-bold text-lg ${textValueClass}`}>{metrics?.total_audit_logs || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
