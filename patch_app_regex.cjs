const fs = require('fs');

let f = fs.readFileSync('super-admin-app/src/App.tsx', 'utf8');

f = f.replace(/\(Cookie Logs\)<\/span>\s*<\/button>/, `(Cookie Logs)</span>
            </button>
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={\`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 \${
                activeTab === 'audit_logs' ? 'bg-indigo-600 text-white shadow-md' : inactiveTabClass
              }\`}
            >
              <Activity className="h-4 w-4" />
              <span>ประวัติระบบ (Audit Logs)</span>
            </button>`);

fs.writeFileSync('super-admin-app/src/App.tsx', f, 'utf8');
console.log('App.tsx patched successfully');
