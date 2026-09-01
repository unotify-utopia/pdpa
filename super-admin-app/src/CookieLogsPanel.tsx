import { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw } from 'lucide-react';

interface CookieLog {
  id: number;
  session_id: string;
  ip_address: string;
  user_agent: string;
  action: string;
  preferences: any;
  created_at: string;
}

interface Props {
  token: string;
}

export default function CookieLogsPanel({ token }: Props) {
  const [logs, setLogs] = useState<CookieLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/cookie-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching cookie logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(l => 
    l.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.ip_address.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="text-blue-500" />
            Cookie Consent Audit Logs
          </h2>
          <p className="text-sm text-slate-400 mt-1">ประวัติการยินยอมนโยบายคุกกี้ของผู้ใช้งานทั้งหมด</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหา Session ID หรือ IP Address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-slate-400">
            แสดง {filteredLogs.length} รายการ
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Session ID / IP</th>
                <th className="px-6 py-4 font-medium">อุปกรณ์ (User Agent)</th>
                <th className="px-6 py-4 font-medium">การกระทำ</th>
                <th className="px-6 py-4 font-medium">วันที่ / เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">ไม่มีข้อมูลการยินยอมคุกกี้</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-slate-300">{log.session_id}</div>
                      <div className="text-slate-500 text-xs mt-1">{log.ip_address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-400 text-xs max-w-xs truncate" title={log.user_agent}>
                        {log.user_agent}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center w-max px-2 py-1 rounded text-xs font-medium ${
                          log.action === 'accept_all' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                          log.action === 'reject_all' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {log.action === 'accept_all' ? 'ยอมรับทั้งหมด' : log.action === 'reject_all' ? 'ปฏิเสธทั้งหมด' : 'เลือกตั้งค่าเอง'}
                        </span>
                        <div className="text-[10px] text-slate-500 flex gap-2">
                          <span className={log.preferences?.necessary ? 'text-green-500/70' : 'text-red-500/70'}>Nec</span>
                          <span className={log.preferences?.analytics ? 'text-green-500/70' : 'text-red-500/70'}>Ana</span>
                          <span className={log.preferences?.marketing ? 'text-green-500/70' : 'text-red-500/70'}>Mar</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
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
