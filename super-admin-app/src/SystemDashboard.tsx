import { useEffect, useState } from 'react';
import { Database, ShieldAlert, Archive, Server, AlertTriangle } from 'lucide-react';

interface SystemDashboardProps {
  token: string;
}

export default function SystemDashboard({ token }: SystemDashboardProps) {
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

  const { dbSize, metrics, archives, recentAlerts } = stats;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">System Dashboard</h2>
          <p className="text-slate-500 mt-1">ภาพรวมการทำงานของระบบและสถานะความปลอดภัย</p>
        </div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Database size={20} /></div>
            <h3 className="font-semibold text-slate-700">ขนาด Database</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{dbSize?.size_pretty || 'N/A'}</p>
          <p className="text-sm text-slate-500 mt-1">ตารางคำร้อง, ผู้ใช้งาน, และ Log</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Archive size={20} /></div>
            <h3 className="font-semibold text-slate-700">ขนาด Archive</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{formatBytes(archives?.sizeBytes || 0)}</p>
          <p className="text-sm text-slate-500 mt-1">จำนวนไฟล์: {archives?.count || 0} ไฟล์</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ShieldAlert size={20} /></div>
            <h3 className="font-semibold text-slate-700">การบล็อกการโจมตี</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{metrics?.payload_blocks || 0}</p>
          <p className="text-sm text-slate-500 mt-1">การพยายามอัปโหลดไฟล์ขนาดใหญ่</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><AlertTriangle size={20} /></div>
            <h3 className="font-semibold text-slate-700">OTP ผิดพลาด</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{metrics?.otp_failures || 0}</p>
          <p className="text-sm text-slate-500 mt-1">ผู้ใช้กรอกรหัสผิดหรือหมดอายุ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-500" /> Security Alerts ล่าสุด
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">เวลา</th>
                  <th className="px-6 py-3 font-medium">เหตุการณ์</th>
                  <th className="px-6 py-3 font-medium">IP Address</th>
                  <th className="px-6 py-3 font-medium">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAlerts && recentAlerts.length > 0 ? (
                  recentAlerts.map((alert: any) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {new Date(alert.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          alert.action.includes('PAYLOAD') ? 'bg-red-100 text-red-700' :
                          alert.action.includes('LOGIN') ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {alert.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{alert.ip_address}</td>
                      <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={alert.details}>{alert.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">ไม่มีข้อมูลการแจ้งเตือนความปลอดภัย</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Server size={18} className="text-blue-500" /> สรุปปริมาณข้อมูล
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="text-slate-500">จำนวนคำร้องทั้งหมด</div>
              <div className="font-bold text-slate-800 text-lg">{metrics?.total_requests || 0}</div>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="text-slate-500">จำนวนหน่วยงาน (Tenants)</div>
              <div className="font-bold text-slate-800 text-lg">{metrics?.total_tenants || 0}</div>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="text-slate-500">บัญชีผู้ใช้งานระบบ (Staff/Admin)</div>
              <div className="font-bold text-slate-800 text-lg">{metrics?.total_users || 0}</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-slate-500">จำนวน Audit Logs ทั้งหมด</div>
              <div className="font-bold text-slate-800 text-lg">{metrics?.total_audit_logs || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
