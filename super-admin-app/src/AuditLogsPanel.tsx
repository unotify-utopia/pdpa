import { useState, useEffect } from 'react';
import { Search, RefreshCw, Activity, Calendar } from 'lucide-react';

interface AuditLogsPanelProps {
  token: string;
}

export default function AuditLogsPanel({ token }: AuditLogsPanelProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/audit-logs?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            System Audit Logs
          </h2>
          <p className="text-sm text-slate-500 mt-1">ประวัติความปลอดภัยและการทำงานของระบบโดยละเอียด</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={fetchLogs} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา Action, Details, หรือ User ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <span className="text-sm text-slate-500 font-medium">ทั้งหมด {total} รายการ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">วัน/เวลา</th>
                <th className="px-6 py-3 font-semibold">การกระทำ (Action)</th>
                <th className="px-6 py-3 font-semibold">รายละเอียด</th>
                <th className="px-6 py-3 font-semibold">ผู้ใช้งาน (User ID)</th>
                <th className="px-6 py-3 font-semibold">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-300" />
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    ไม่พบข้อมูลประวัติการทำงาน
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold tracking-wide uppercase border border-indigo-100">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-700 min-w-[300px]">{log.details}</td>
                    <td className="px-6 py-3">
                      {log.user_id ? (
                        <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {log.user_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">System / Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
