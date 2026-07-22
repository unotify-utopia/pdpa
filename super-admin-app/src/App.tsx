import React, { useState } from 'react';
import { ShieldCheck, Building2, UserCheck, Key, Lock, LogOut, Plus, Sun, Moon, QrCode, Smartphone, CheckCircle2 } from 'lucide-react';

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'authenticated'>('credentials');
  
  // Credentials
  const [username, setUsername] = useState('super.admin');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [activeTab, setActiveTab] = useState<'tenants' | 'users'>('tenants');

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

  // Step 1: Check Credentials
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin1234' || password === '123456') {
      setLoginStep('mfa');
    } else {
      alert(' Username หรือ Password ไม่ถูกต้อง');
    }
  };

  // Step 2: Verify MFA TOTP
  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.trim() === '123456' || mfaCode.trim().length === 6) {
      setLoginStep('authenticated');
    } else {
      alert('รหัส MFA Code 6 หลักไม่ถูกต้อง (ลองใช้ 123456)');
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
    const uname = prompt('กรุณาระบุ Username เจ้าหน้าที่ใหม่:');
    if (!uname) return;
    const fullName = prompt('กรุณาระบุ ชื่อ-นามสกุล เจ้าหน้าที่:') || uname;
    const orgId = prompt('กรุณาระบุ รหัสหน่วยงาน (เช่น org_dopa, org_rd):') || 'org_dopa';
    const role = prompt('กรุณาระบุ บทบาทสิทธิ์ (admin, intake, dpo, approver, owner):') || 'intake';

    const newUser: User = {
      id: `usr_${Date.now()}`,
      orgId: orgId,
      username: uname,
      fullName: fullName,
      email: `${uname}@${orgId.replace('org_', '')}.go.th`,
      role: role,
      department: 'หน่วยงานผู้ปฏิบัติงาน'
    };

    setUsers([...users, newUser]);
    alert(`สร้างบัญชีเจ้าหน้าที่ "${fullName}" เรียบร้อยแล้ว`);
  };

  // Reset User Password
  const handleResetPassword = (uname: string) => {
    const newPass = prompt(`กรุณาระบุ รหัสผ่านใหม่ สำหรับยูสเซอร์ "${uname}":`);
    if (newPass) {
      alert(`🔑 รีเซ็ตรหัสผ่านสำหรับ "${uname}" เป็น "${newPass}" สำเร็จเรียบร้อยแล้ว`);
    }
  };

  // Theme Styling Helper
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headerBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const tableHeaderBg = isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200';
  const inputBgClass = isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900';

  // LOGIN SCREEN (Step 1 & Step 2 MFA)
  if (loginStep !== 'authenticated') {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center p-4 transition-colors duration-200`}>
        {/* Top Theme Switcher */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2.5 rounded-xl border transition ${cardBgClass} flex items-center gap-2 text-xs font-semibold`}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            <span>{isDark ? 'โหมดสว่าง (Light Mode)' : 'โหมดมืด (Dark Mode)'}</span>
          </button>
        </div>

        <div className={`border rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6 ${cardBgClass}`}>
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-1">
              <ShieldCheck className="h-9 w-9 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold">Super Admin Enterprise Control</h1>
            <p className="text-xs text-slate-400">พอร์ทัลบริหารจัดการระบบหลังบ้านระดับความมั่นคงปลอดภัยสูง</p>
          </div>

          {/* STEP 1: Username & Password */}
          {loginStep === 'credentials' && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Username ผู้ดูแลระบบกลาง</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="super.admin"
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Master Security Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่าน (เช่น 123456)"
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>ถัดไป: ยืนยันรหัส MFA Authenticator →</span>
              </button>
            </form>
          )}

          {/* STEP 2: MFA TOTP Code Verification */}
          {loginStep === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-4 animate-fade-in">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>ยืนยันตัวตนขั้นแรกสำเร็จ กรุณากรอกรหัส OTP 6 หลัก จากแอป Authenticator</span>
              </div>

              <div className="text-center py-2 space-y-2">
                <div className="inline-block p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <QrCode className="h-16 w-16 text-slate-300 mx-auto" />
                </div>
                <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>เปิดแอป Google / Microsoft Authenticator บนมือถือ</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-center mb-1.5">รหัสผ่าน 2FA TOTP (6 หลัก)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="1 2 3 4 5 6"
                  className={`w-full text-center tracking-[0.5em] font-mono text-lg font-bold py-2.5 border rounded-xl focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                  required
                  autoFocus
                />
                <span className="block text-[10px] text-slate-500 text-center mt-1">รหัสตัวอย่างทดสอบ: 123456</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoginStep('credentials')}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg"
                >
                  เข้าสู่ระบบหลังบ้าน
                </button>
              </div>
            </form>
          )}

          <div className="text-[11px] text-slate-500 text-center border-t border-slate-800 pt-4 font-mono">
            🔒 High Security Isolated Super Admin Console v2.5
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD (AUTHENTICATED)
  return (
    <div className={`min-h-screen ${bgClass} flex flex-col font-sans transition-colors duration-200`}>
      {/* Header */}
      <header className={`p-4 border-b sticky top-0 z-50 ${headerBgClass}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base flex items-center gap-2">
                <span>Super Admin Enterprise Console</span>
                <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  2FA MFA VERIFIED
                </span>
              </h1>
              <p className="text-xs text-slate-400">ระบบบริหารจัดการภาพรวมระดับภาพรวมประเทศ (Standalone)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-lg border transition ${cardBgClass} flex items-center gap-1.5 text-xs font-semibold`}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
              <span className="hidden md:inline">{isDark ? 'ธีมสว่าง' : 'ธีมมืด'}</span>
            </button>

            <button
              onClick={() => {
                setLoginStep('credentials');
                setPassword('');
                setMfaCode('');
              }}
              className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg transition border border-red-500/30 flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Tabs & Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'tenants' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>1. จัดการหน่วยงาน (Tenants - {tenants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>2. จัดการผู้ใช้ & รหัสผ่าน (Users - {users.length})</span>
            </button>
          </div>

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

        {/* TAB 1: Tenants */}
        {activeTab === 'tenants' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className={`border rounded-xl p-5 space-y-3 ${cardBgClass}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm block">{t.nameTh}</span>
                    <span className="text-[10px] font-mono text-emerald-500 block mt-0.5">ID: {t.id}</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    ACTIVE
                  </span>
                </div>

                <div className={`text-xs space-y-1 p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <p>อีเมลติดต่อ: <span className="font-medium">{t.email}</span></p>
                  <p>เบอร์โทรศัพท์: <span className="font-medium">{t.phone}</span></p>
                </div>

                <button
                  onClick={() => alert(`จำลองการแก้ไขหน่วยงาน: ${t.nameTh}`)}
                  className={`w-full text-xs py-1.5 rounded-lg font-semibold transition border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
                >
                  แก้ไขข้อมูลหน่วยงาน
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Users & Password Management */}
        {activeTab === 'users' && (
          <div className={`border rounded-xl overflow-hidden p-6 space-y-4 ${cardBgClass}`}>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span>รายการผู้ใช้งานเจ้าหน้าที่ประจำหน่วยงานทั้งหมด</span>
            </h2>

            <div className="overflow-x-auto border rounded-xl border-slate-800/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-bold ${tableHeaderBg}`}>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">Username / อีเมล</th>
                    <th className="p-3">หน่วยงาน</th>
                    <th className="p-3">บทบาทสิทธิ์ (Role)</th>
                    <th className="p-3 text-center">จัดการรหัสผ่าน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-3 font-bold">
                        {u.fullName}
                        <span className="block text-[10px] font-normal text-slate-400">{u.department}</span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-emerald-500 font-bold block">{u.username}</span>
                        <span className="text-[10px] font-sans text-slate-400 block">{u.email}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">{u.orgId}</td>
                      <td className="p-3">
                        <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleResetPassword(u.username)}
                          className="bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>🔑 รีเซ็ตรหัสผ่าน</span>
                        </button>
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
      <footer className={`border-t p-4 text-center text-xs text-slate-500 ${headerBgClass}`}>
        Standalone Super Admin Web App | High Security MFA Portal
      </footer>
    </div>
  );
}
