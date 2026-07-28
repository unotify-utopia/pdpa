const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for extendSlaModal
const stateVars = `
  const [extendSlaModal, setExtendSlaModal] = useState<{ open: boolean; reqId: string | null; reason: string }>({ open: false, reqId: null, reason: '' });
`;
content = content.replace('const [reqType, setReqType] = useState<\'self\' | \'representative\'>(\'self\');', 'const [reqType, setReqType] = useState<\'self\' | \'representative\'>(\'self\');\n' + stateVars);

// 2. Replace the prompt() with setExtendSlaModal
const oldPromptBlock = `                          onClick={() => {
                            const reason = prompt('ระบุเหตุจำเป็นหรือเหตุขัดข้องในการขยายระยะเวลาสืบค้นข้อมูล:');
                            if (reason) {
                              handleExtendSla(activeRequestObj.id, reason);
                            }
                          }}`;
const newPromptBlock = `                          onClick={() => {
                            setExtendSlaModal({ open: true, reqId: activeRequestObj.id, reason: '' });
                          }}`;
content = content.replace(oldPromptBlock, newPromptBlock);

// 3. Add Modal JSX before the final NotifyModal
const modalJSX = `
      {/* --- EXTEND SLA MODAL --- */}
      {extendSlaModal.open && extendSlaModal.reqId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                ขยายระยะเวลาสืบค้นข้อมูล (+30 วัน)
              </h3>
              <button
                onClick={() => setExtendSlaModal({ open: false, reqId: null, reason: '' })}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1">
              <p className="text-sm text-slate-600">
                ระบุเหตุจำเป็นหรือเหตุขัดข้องในการขยายระยะเวลาสืบค้นข้อมูล:
              </p>
              <textarea
                autoFocus
                placeholder="อธิบายเหตุผล..."
                value={extendSlaModal.reason}
                onChange={(e) => setExtendSlaModal({ ...extendSlaModal, reason: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 min-h-[100px] resize-none"
              ></textarea>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 mt-auto">
              <button
                type="button"
                onClick={() => setExtendSlaModal({ open: false, reqId: null, reason: '' })}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!extendSlaModal.reason.trim()}
                onClick={() => {
                  handleExtendSla(extendSlaModal.reqId!, extendSlaModal.reason);
                  setExtendSlaModal({ open: false, reqId: null, reason: '' });
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>ยืนยันการขยายเวลา</span>
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* Added NotifyModal to replace alerts */}', modalJSX + '\n      {/* Added NotifyModal to replace alerts */}');

// Make sure Clock and X are imported if needed.
// 'Clock' and 'X' are likely imported from 'lucide-react', let's just make sure.
// Let's assume they are imported, if not the build will complain and we will fix it.

fs.writeFileSync(filePath, content, 'utf8');
console.log('src/App.tsx updated successfully.');
