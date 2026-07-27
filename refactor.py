import re
import os

filepath = 'd:/PDPA req/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add NotifyModal import
if 'NotifyModal' not in content:
    content = content.replace("import { StaffLoginModal } from './components/StaffLoginModal';",
                              "import { StaffLoginModal } from './components/StaffLoginModal';\nimport { NotifyModal, NotifyType } from './components/NotifyModal';")

# Add Notify state to App component
state_code = """
  // Notify Modal State
  const [notifyState, setNotifyState] = useState<{ open: boolean; title: string; message: string; type: NotifyType; onConfirm?: () => void; onCancel?: () => void }>({
    open: false, title: '', message: '', type: 'success'
  });

  const showNotify = (message: string, type: NotifyType = 'success', title?: string, onConfirm?: () => void, onCancel?: () => void) => {
    let defaultTitle = 'การแจ้งเตือนจากระบบ';
    if (type === 'error') defaultTitle = 'เกิดข้อผิดพลาด';
    if (type === 'warning') defaultTitle = 'ข้อความแจ้งเตือน';
    if (type === 'confirm') defaultTitle = 'ยืนยันการดำเนินการ';
    
    // Auto-detect type if it's default
    if (message.includes('❌') || message.includes('เกิดข้อผิดพลาด') || message.includes('ไม่สามารถ')) {
      type = 'error';
      defaultTitle = 'เกิดข้อผิดพลาด';
    } else if (message.includes('⚠️') || message.includes('กรุณา')) {
      type = 'warning';
      defaultTitle = 'ข้อความแจ้งเตือน';
    } else if (message.includes('✅') || message.includes('สำเร็จ') || message.includes('เรียบร้อย')) {
      type = 'success';
      defaultTitle = 'การแจ้งเตือนจากระบบ';
    }
    
    // Remove emojis from message for cleaner UI
    const cleanMessage = message.replace(/^[❌⚠️✅]\\s*/, '');
    
    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });
  };
"""

if 'const [notifyState' not in content:
    content = content.replace("export default function App() {\n  // App context navigation states", 
                              "export default function App() {\n" + state_code + "\n  // App context navigation states")

# Render NotifyModal at the end
if '<NotifyModal' not in content:
    render_code = """
      <NotifyModal 
        {...notifyState} 
        onClose={() => setNotifyState(prev => ({ ...prev, open: false }))} 
      />
    """
    content = content.replace("    </>\n  );\n}", render_code + "    </>\n  );\n}")


# Replace alert('...') or alert(`...`) with showNotify(...)
def replace_alert(m):
    return f"showNotify({m.group(1)})"

content = re.sub(r'alert\(([\'\"`].*?[\'\"`])\)', replace_alert, content)
content = re.sub(r'alert\(editingUser \? (.*?) : (.*?)\)', lambda m: f"showNotify(editingUser ? {m.group(1)} : {m.group(2)})", content)
content = re.sub(r'alert\((.*?)\)', lambda m: f"showNotify({m.group(1)})" if 'error' in m.group(1) or '+' in m.group(1) or 'res.status' in m.group(1) else m.group(0), content)

# Specific manual fixes for confirms
confirm1_search = """if (window.confirm(`ยืนยันการลบผู้ใช้: ${editingUser.fullNameTh} ออกจากระบบ?`)) {
                          const updatedUsers = users.filter(u => u.id !== editingUser.id);
                          setUsers(updatedUsers);
                          setEditingUser(null);
                          setShowAddUser(false);
                          showNotify('ลบผู้ใช้งานสำเร็จ');
                        }"""
confirm1_replace = """showNotify(`ยืนยันการลบผู้ใช้: ${editingUser.fullNameTh} ออกจากระบบ?`, 'confirm', 'ยืนยันการลบข้อมูล', () => {
                          const updatedUsers = users.filter(u => u.id !== editingUser.id);
                          setUsers(updatedUsers);
                          setEditingUser(null);
                          setShowAddUser(false);
                          showNotify('ลบผู้ใช้งานสำเร็จ');
                        });"""

confirm2_search = """if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {
                              updateRequestStatus(selectedRequest.id, 'closed');
                              setSelectedRequest(null);
                            }"""
confirm2_replace = """showNotify('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?', 'confirm', 'ยืนยันการปิดเรื่อง', () => {
                              updateRequestStatus(selectedRequest.id, 'closed');
                              setSelectedRequest(null);
                            });"""

content = content.replace(confirm1_search, confirm1_replace)
content = content.replace(confirm2_search, confirm2_replace)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored App.tsx")
