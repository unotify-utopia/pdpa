import React, { useState } from 'react';
import { ShieldCheck, Building2, UserCheck, Key, Lock, LogOut, Plus } from 'lucide-react';

interface Tenant {
  id: string;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

interface User {
  id: string;
  orgId: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'security'>('tenants');

  // Master Tenants List State
  const [tenants, setTenants] = useState<Tenant[]>([
    { id: 'org_dopa', nameTh: 'กรมการปกครอง (Department of Provincial Administration)', nameEn: 'DOPA', email: 'pdpa@dopa.go.th', phone: '02-221-8150', status: 'active' },
    { id: 'org_rd', nameTh: 'กรมสรรพากร (Revenue Department)', nameEn: 'RD', email: 'pdpa@rd.go.th', phone: '02-272-8000', status: 'active' },
    { id: 'org_tech_th', nameTh: 'บริษัท ไทยเทคโนโลยี อินโนเวชั่น จำกัด', nameEn: 'Thai Tech', email: 'dpo@thaitech.co.th', phone: '02-999-8888', status: 'active' }
  ]);

  // Master Users List State
  const [users, setUsers] = useState<User[]>([
    { id: 'usr_admin', orgId: 'org_dopa', username: 'admin.pdpa', fullName: 'สมเจตน์ จัดการดี (DOPA Admin)', email: 'admin@dopa.go.th', role: 'admin', department: 'เทคโนโลยีสารสนเทศ' },
    { id: 'usr_intake', orgId: 'org_dopa', username: 'intake.pdpa', fullName: 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', email: 'intake@dopa.go.th', role: 'intake', department: 'ศูนย์รับเรื่องร้องเรียน' },
    { id: 'usr_dpo', orgId: 'org_dopa', username: 'dpo.pdpa', fullName: 'สุรพงษ์ ยุติธรรม (DOPA DPO)', email: 'dpo@dopa.go.th', role: 'dpo', department: 'กลุ่มงานคุ้มครองข้อมูลส่วนบุคคล' },
    { id: 'usr_approver', orgId: 'org_dopa', username: 'exec.pdpa', fullName: 'ดร. ประภาส อธิบดี (DOPA Exec)', email: 'director@dopa.go.th', role: 'approver', department: 'ผู้บริหารระดับสูง' }
  ]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin1234' || passcode === '123456') {
      setIsAuthenticated(true);
    } else {
      alert('รหัสผ่าน Master Passcode ไม่ถูกต้อง');
    }
  };

  // Add New Tenant
  const handleAddTenant = () => {
    const name = prompt('กรุณาระบุชื่อหน่วยงานใหม่ที่จะเพิ่มเข้าระบบ:');
    if (!name) return;
    const code = prompt('กรุณาระบุรหัสย่อหน่วยงาน (เช่น ORG_EXCISE):') || `org_${Date.now()}`;
    const email = prompt('กรุณาระบุอีเมลติดต่อหน่วยงาน:') || 'admin@org.go.th';

    const newOrg: Tenant = {
      id: code,
      nameTh: name,
      nameEn: code.toUpperCase(),
      email: email,
      phone: '02-000-0000',
      status: 'active'
    };

    setTenants([...tenants, newOrg]);
    alert(`เพิ่มหน่วยงาน "${name}" เข้าสู่ระบบเรียบร้อยแล้ว`);
  };

  // Add New User
  const handleAddUser = () => {
    const username = prompt('กรุณาระบุ Username เจ้าหน้าที่ใหม่:');
    if (!username) return;
    const fullName = prompt('กรุณาระบุ ชื่อ-นามสกุล เจ้าหน้าที่:') || username;
    const orgId = prompt('กรุณาระบุ รหัสหน่วยงาน (เช่น org_dopa, org_rd):') || 'org_dopa';
    const role = prompt('กรุณาระบุ บทบาทสิทธิ์ (admin, intake, dpo, approver, owner):') || 'intake';

    const newUser: User = {
      id: `usr_${Date.now()}`,
      orgId: orgId,
      username: username,
      fullName: fullName,
      email: `${username}@${orgId.replace('org_', '')}.go.th`,
      role: role,
      department: 'หน่วยงานผู้ปฏิบัติงาน'
    };

    setUsers([...users, newUser]);
    alert(`สร้างบัญชีเจ้าหน้าที่ "${fullName}" เรียบร้อยแล้ว`);
  };

  // Reset User Password
  const handleResetPassword = (username: string) => {
    const newPass = prompt(`กรุณาระบุ รหัสผ่านใหม่ สำหรับยูสเซอร์ "${username}":`);
    if (newPass) {
      alert(`🔑 รีเซ็ตรหัสผ่านสำหรับ "${username}" เป็น "${newPass}" สำเร็จเรียบร้อยแล้ว`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-brand-600/20 border border-brand-500/30 rounded-2xl text-brand-400 mb-2">
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Super Admin Control Portal</h1>
            <p className="text-xs text-slate-400">ระบบหลังบ้านบริหารจัดการหน่วยงานและผู้ใช้งานภาพรวม (Standalone)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Master Security Passcode</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="กรอกรหัสผ่าน Super Admin (เช่น 123456)"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg"
            >
              เข้าสู่ระบบหลังบ้าน Super Admin
            </button>
          </form>

          <div className="text-[11px] text-slate-600 text-center border-t border-slate-800/80 pt-4">
            🛡️ Isolated Super Admin Management Console v2.5
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white flex items-center gap-2">
                <span>Super Admin Enterprise Console</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono">STANDALONE WEB APP</span>
              </h1>
              <p className="text-xs text-slate-400">ระบบบริหารจัดการภาพรวมแยกต่างหากสำหรับผู้ดูแลระบบสูงสุด</p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg transition border border-slate-700 flex items-center gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'tenants' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>1. จัดการหน่วยงาน (Tenants - {tenants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>2. จัดการผู้ใช้ & รหัสผ่าน (Users - {users.length})</span>
            </button>
          </div>

          {/* Action Button */}
          {activeTab === 'tenants' ? (
            <button
              onClick={handleAddTenant}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ เพิ่มหน่วยงานใหม่</span>
            </button>
          ) : (
            <button
              onClick={handleAddUser}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ สร้างผู้ใช้ใหม่</span>
            </button>
          )}
        </div>

        {/* Tab 1: Tenant Management */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tenants.map((t) => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-sm text-white block">{t.nameTh}</span>
                      <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">ID: {t.id}</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p>อีเมลติดต่อ: <span className="text-slate-200">{t.email}</span></p>
                    <p>เบอร์โทรศัพท์: <span className="text-slate-200">{t.phone}</span></p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => alert(`จำลองการแก้ไขหน่วยงาน: ${t.nameTh}`)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-1.5 rounded-lg font-semibold transition border border-slate-700"
                    >
                      แก้ไขข้อมูล
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Users & Password Management */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <span>ตารางรายชื่อเจ้าหน้าที่ประจำหน่วยงาน และการรีเซ็ตรหัสผ่าน</span>
              </h2>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">Username / อีเมล</th>
                    <th className="p-3">หน่วยงาน</th>
                    <th className="p-3">บทบาทสิทธิ์ (Role)</th>
                    <th className="p-3 text-center">รีเซ็ตรหัสผ่าน / จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-white">
                        {u.fullName}
                        <span className="block text-[10px] text-slate-500 font-normal">{u.department}</span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-emerald-400 block font-bold">{u.username}</span>
                        <span className="text-[10px] text-slate-500 font-sans block">{u.email}</span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{u.orgId}</td>
                      <td className="p-3">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResetPassword(u.username)}
                            className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition flex items-center gap-1"
                          >
                            <Key className="h-3.5 w-3.5" />
                            <span>🔑 รีเซ็ตรหัสผ่าน</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 p-4 text-center text-xs text-slate-600">
        Standalone Super Admin Web App | Platform Master Management Portal
      </footer>
    </div>
  );
}
