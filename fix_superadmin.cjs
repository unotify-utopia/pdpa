const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'super-admin-app', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables for Modals
const stateVars = `
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; user: User | null; newPassword: string }>({ open: false, user: null, newPassword: '' });
  const [editRoleModal, setEditRoleModal] = useState<{ open: boolean; user: User | null; newRole: string }>({ open: false, user: null, newRole: '' });
`;
content = content.replace('const [notifyModal, setNotifyModal] = useState<{ open: boolean; title: string; message: string; type: \'success\' | \'warning\' | \'error\'; onConfirm?: () => void } | null>(null);', 'const [notifyModal, setNotifyModal] = useState<{ open: boolean; title: string; message: string; type: \'success\' | \'warning\' | \'error\'; onConfirm?: () => void } | null>(null);\n' + stateVars);

// 2. Modify handleResetPassword to open modal instead of prompt
const handleResetCode = `
  // Reset User Password (now opens modal)
  const handleResetPassword = (u: User) => {
    setResetPasswordModal({ open: true, user: u, newPassword: '' });
  };
  
  const submitResetPassword = async () => {
    if (!resetPasswordModal.user || !resetPasswordModal.newPassword) return;
    try {
      const res = await fetch(\`/api/users/\${resetPasswordModal.user.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({
          ...resetPasswordModal.user,
          fullNameTh: resetPasswordModal.user.fullName,
          newPassword: resetPasswordModal.newPassword
        })
      });
      if (res.ok) {
        showNotify(\`รีเซ็ตรหัสผ่านสำหรับ "\${resetPasswordModal.user.username}" สำเร็จเรียบร้อยแล้ว\`, 'success', 'รีเซ็ตรหัสผ่านสำเร็จ');
        setResetPasswordModal({ open: false, user: null, newPassword: '' });
      } else {
        showNotify('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error', 'ผิดพลาด');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error', 'ผิดพลาด');
    }
  };

  const handleEditRole = (u: User) => {
    setEditRoleModal({ open: true, user: u, newRole: u.role });
  };

  const submitEditRole = async () => {
    if (!editRoleModal.user || !editRoleModal.newRole) return;
    try {
      const res = await fetch(\`/api/users/\${editRoleModal.user.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({
          ...editRoleModal.user,
          fullNameTh: editRoleModal.user.fullName,
          role: editRoleModal.newRole,
          roles: [editRoleModal.newRole]
        })
      });
      if (res.ok) {
        showNotify(\`อัปเดตสิทธิ์สำหรับ "\${editRoleModal.user.username}" สำเร็จเรียบร้อยแล้ว\`, 'success', 'อัปเดตสิทธิ์สำเร็จ');
        setEditRoleModal({ open: false, user: null, newRole: '' });
        if (token) fetchData(token); // refresh
      } else {
        showNotify('เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์', 'error', 'ผิดพลาด');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error', 'ผิดพลาด');
    }
  };
`;
// Replace old handleResetPassword
content = content.replace(/const handleResetPassword = \([\s\S]*?\n  \};/m, handleResetCode);

// 3. Update the button in the table to pass the whole user object and add Edit Role button
const oldTableRow = `<td className="p-3 text-center">
                        <button
                          onClick={() => handleResetPassword(u.username)}
                          className="bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Key className="h-3 w-3" />
                          <span>รีเซ็ตรหัสผ่าน</span>
                        </button>
                      </td>`;

const newTableRow = `<td className="p-3 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditRole(u)}
                          className="bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          <span>แก้ไขสิทธิ์</span>
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Key className="h-3 w-3" />
                          <span>รีเซ็ตรหัสผ่าน</span>
                        </button>
                      </td>`;
content = content.replace(oldTableRow, newTableRow);

// 4. Update the table header
content = content.replace('<th className="p-3 text-center">จัดการรหัสผ่าน</th>', '<th className="p-3 text-center">จัดการบัญชี</th>');

// 5. Add Modals JSX before the final </div>
const modalsJSX = `
      {/* Edit Role Modal */}
      {editRoleModal.open && editRoleModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={\`w-full max-w-md rounded-2xl shadow-xl overflow-hidden border \${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}\`}>
            <div className={\`px-6 py-4 border-b flex items-center justify-between \${isDark ? 'border-slate-800' : 'border-slate-100'}\`}>
              <h3 className="font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>แก้ไขบทบาทสิทธิ์ (Edit Role)</span>
              </h3>
              <button onClick={() => setEditRoleModal({ open: false, user: null, newRole: '' })} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-400">ผู้ใช้งาน</label>
                <div className="text-sm font-bold text-emerald-500">{editRoleModal.user.username} <span className="text-slate-400 font-normal">({editRoleModal.user.fullName})</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-400">เลือกบทบาทใหม่</label>
                <select
                  value={editRoleModal.newRole}
                  onChange={(e) => setEditRoleModal({ ...editRoleModal, newRole: e.target.value })}
                  className={\`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:border-blue-500 transition \${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}\`}
                >
                  <option value="intake">INTAKE (เจ้าหน้าที่รับเรื่อง)</option>
                  <option value="owner">OWNER (ผู้ดูแลระบบข้อมูล)</option>
                  <option value="dpo">DPO (เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล)</option>
                  <option value="approver">APPROVER (ผู้อนุมัติ/ผู้บริหาร)</option>
                  <option value="admin">ADMIN (ผู้ดูแลระบบหน่วยงาน)</option>
                </select>
              </div>
            </div>
            <div className={\`px-6 py-4 border-t flex justify-end gap-3 \${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}\`}>
              <button
                onClick={() => setEditRoleModal({ open: false, user: null, newRole: '' })}
                className={\`px-4 py-2 rounded-lg text-sm font-bold transition \${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}\`}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitEditRole}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Check className="h-4 w-4" />
                <span>บันทึกสิทธิ์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.open && resetPasswordModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={\`w-full max-w-md rounded-2xl shadow-xl overflow-hidden border \${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}\`}>
            <div className={\`px-6 py-4 border-b flex items-center justify-between \${isDark ? 'border-slate-800' : 'border-slate-100'}\`}>
              <h3 className="font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                <span>เปลี่ยนรหัสผ่าน (Reset Password)</span>
              </h3>
              <button onClick={() => setResetPasswordModal({ open: false, user: null, newPassword: '' })} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                กรุณาระบุรหัสผ่านใหม่ สำหรับยูสเซอร์ <span className="font-bold text-emerald-500">{resetPasswordModal.user.username}</span>
              </p>
              <div>
                <input
                  type="text"
                  placeholder="รหัสผ่านใหม่ (เช่น 123456)"
                  value={resetPasswordModal.newPassword}
                  onChange={(e) => setResetPasswordModal({ ...resetPasswordModal, newPassword: e.target.value })}
                  className={\`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:border-amber-500 transition \${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}\`}
                />
              </div>
            </div>
            <div className={\`px-6 py-4 border-t flex justify-end gap-3 \${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}\`}>
              <button
                onClick={() => setResetPasswordModal({ open: false, user: null, newPassword: '' })}
                className={\`px-4 py-2 rounded-lg text-sm font-bold transition \${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}\`}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitResetPassword}
                disabled={!resetPasswordModal.newPassword}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Check className="h-4 w-4" />
                <span>ยืนยันการเปลี่ยน</span>
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* End of modals */}\n    </div>\n  );\n}', modalsJSX + '\n      {/* End of modals */}\n    </div>\n  );\n}');
if (!content.includes('{/* End of modals */}')) {
  // if not found, just put before the last div
  const lastDivIndex = content.lastIndexOf('</div>');
  content = content.slice(0, lastDivIndex) + modalsJSX + content.slice(lastDivIndex);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx updated successfully.');
