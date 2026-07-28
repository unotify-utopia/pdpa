const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'super-admin-app', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add `roles?: string[];` to User interface
content = content.replace(/role: string;\n  department: string;\n\}/, 'role: string;\n  roles?: string[];\n  department: string;\n}');

// 2. Add SOD function after the states
const sodFunction = `
  // SOD helper function
  const calculateSodWarnings = (rolesList: string[]): string[] => {
    const warnings: string[] = [];
    if (rolesList.includes('dpo') && rolesList.includes('approver')) {
      warnings.push('Conflict of Interest: DPO ไม่ควรเป็นผู้อนุมัติคำขอ (Approver) เพื่อรักษาสถานะผู้ประเมินอิสระ');
    }
    if (rolesList.includes('intake') && rolesList.includes('owner')) {
      warnings.push('Data Pipeline Risk: ผู้รับเรื่อง (Intake) ไม่ควรเป็นผู้ดึงข้อมูล (Owner) เองทั้งหมดโดยไม่มีคนสอบทาน');
    }
    return warnings;
  };
`;
content = content.replace('const [theme, setTheme] = useState', sodFunction + '\n  const [theme, setTheme] = useState');

// 3. Update EditRoleModal state
content = content.replace('const [editRoleModal, setEditRoleModal] = useState<{ open: boolean; user: User | null; newRole: string }>({ open: false, user: null, newRole: \'\' });', 'const [editRoleModal, setEditRoleModal] = useState<{ open: boolean; user: User | null; newRoles: string[] }>({ open: false, user: null, newRoles: [] });');

// 4. Update newUserData state & handleOpenAddUserModal & payload
content = content.replace(/role: 'intake',/g, 'role: \'intake\',\n    roles: [\'intake\'],');
content = content.replace('role: newUserData.role,', 'role: newUserData.roles[0] || \'intake\',\n      roles: newUserData.roles,');

// 5. Replace `handleEditRole` & `submitEditRole`
const oldHandleEditCode = `  const handleEditRole = (u: User) => {
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
  };`;

const newHandleEditCode = `  const handleEditRole = (u: User) => {
    let currentRoles = u.roles || [];
    if (currentRoles.length === 0) currentRoles = [u.role];
    setEditRoleModal({ open: true, user: u, newRoles: currentRoles });
  };

  const submitEditRole = async () => {
    if (!editRoleModal.user || editRoleModal.newRoles.length === 0) return;
    try {
      const res = await fetch(\`/api/users/\${editRoleModal.user.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({
          ...editRoleModal.user,
          fullNameTh: editRoleModal.user.fullName,
          role: editRoleModal.newRoles[0],
          roles: editRoleModal.newRoles
        })
      });
      if (res.ok) {
        showNotify(\`อัปเดตสิทธิ์สำหรับ "\${editRoleModal.user.username}" สำเร็จเรียบร้อยแล้ว\`, 'success', 'อัปเดตสิทธิ์สำเร็จ');
        setEditRoleModal({ open: false, user: null, newRoles: [] });
        if (token) fetchData(token); // refresh
      } else {
        showNotify('เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์', 'error', 'ผิดพลาด');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error', 'ผิดพลาด');
    }
  };`;

content = content.replace(oldHandleEditCode, newHandleEditCode);

// 6. Fix mapping in fetchData
content = content.replace('department: user.department', 'department: user.department,\n          roles: user.roles && user.roles.length > 0 ? user.roles : [user.role]');

// 7. Replace role select in AddUserModal with checkboxes
const addRoleSelectBlockRegex = /<div>\s*<label className="block text-xs font-semibold mb-1 text-slate-400">บทบาทสิทธิ์ \(Role\)<\/label>\s*<select\s*value=\{newUserData.role\}\s*onChange=\{\(e\) => setNewUserData\(\{ \.\.\.newUserData, role: e\.target\.value \}\)\}\s*className=\{`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:border-emerald-500 transition \$\{isDark \? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300'}`\}\s*>\s*<option value="intake">INTAKE \(เจ้าหน้าที่รับเรื่อง\)<\/option>\s*<option value="owner">OWNER \(ผู้ดูแลระบบข้อมูล\)<\/option>\s*<option value="dpo">DPO \(เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล\)<\/option>\s*<option value="approver">APPROVER \(ผู้อนุมัติ\/ผู้บริหาร\)<\/option>\s*<option value="admin">ADMIN \(ผู้ดูแลระบบหน่วยงาน\)<\/option>\s*<\/select>\s*<\/div>/g;

const multiSelectRoleJSX = (stateVar, setStateCode) => `
              <div>
                <label className="block text-xs font-semibold mb-2 text-slate-400">บทบาทสิทธิ์ (Roles)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries({
                    intake: 'INTAKE (เจ้าหน้าที่รับเรื่อง)',
                    owner: 'OWNER (ผู้ดูแลระบบข้อมูล)',
                    dpo: 'DPO (เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล)',
                    approver: 'APPROVER (ผู้อนุมัติ/ผู้บริหาร)',
                    admin: 'ADMIN (ผู้ดูแลระบบหน่วยงาน)'
                  }).map(([roleKey, roleLabel]) => {
                    const isChecked = ${stateVar}.includes(roleKey);
                    return (
                      <label
                        key={roleKey}
                        className={\`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none \${
                          isChecked
                            ? (isDark ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-emerald-50/70 border-emerald-500 font-bold text-emerald-900')
                            : (isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                        }\`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextRoles = [...${stateVar}];
                            if (e.target.checked) {
                              nextRoles.push(roleKey);
                            } else {
                              nextRoles = nextRoles.filter(r => r !== roleKey);
                            }
                            if (nextRoles.length === 0) nextRoles = ['intake'];
                            ${setStateCode}
                          }}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs">{roleLabel}</span>
                      </label>
                    );
                  })}
                </div>
                {/* Real-time SOD Warning */}
                {(() => {
                  const warnings = calculateSodWarnings(${stateVar});
                  if (warnings.length > 0) {
                    return (
                      <div className={\`mt-3 p-3 rounded-xl border-l-4 space-y-1 \${isDark ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-amber-50 border-amber-500 text-amber-800'}\`}>
                        {warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] font-bold">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
`;

content = content.replace(addRoleSelectBlockRegex, multiSelectRoleJSX('newUserData.roles', 'setNewUserData({ ...newUserData, roles: nextRoles, role: nextRoles[0] });'));

// 8. Replace role select in EditRoleModal with checkboxes
const editRoleSelectBlockRegex = /<div>\s*<label className="block text-xs font-semibold mb-1 text-slate-400">เลือกบทบาทใหม่<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/;

content = content.replace(editRoleSelectBlockRegex, multiSelectRoleJSX('editRoleModal.newRoles', 'setEditRoleModal({ ...editRoleModal, newRoles: nextRoles });'));

// 9. Update close modal actions
content = content.replace(/setEditRoleModal\(\{ open: false, user: null, newRole: '' \}\)/g, 'setEditRoleModal({ open: false, user: null, newRoles: [] })');


fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx successfully updated with roles checkbox array and SOD logic.');
