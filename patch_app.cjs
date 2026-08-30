const fs = require('fs');

let f = fs.readFileSync('super-admin-app/src/App.tsx', 'utf8');

const target1 = `<span>ประวัติความยินยอม (Cookie Logs)</span>\r\n              </button>`;
const target2 = `<span>ประวัติความยินยอม (Cookie Logs)</span>\n              </button>`;

const replacement = `<span>ประวัติความยินยอม (Cookie Logs)</span>
              </button>

              <button
                onClick={() => setActiveTab('audit_logs')}
                className={\`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 \${
                  activeTab === 'audit_logs' ? 'bg-indigo-600 text-white shadow-md' : inactiveTabClass
                }\`}
              >
                <Activity className="h-4 w-4" />
                <span>ประวัติระบบ (Audit Logs)</span>
              </button>`;

if (f.includes(target1)) f = f.replace(target1, replacement);
else if (f.includes(target2)) f = f.replace(target2, replacement);

fs.writeFileSync('super-admin-app/src/App.tsx', f, 'utf8');
console.log('App.tsx patched successfully');
