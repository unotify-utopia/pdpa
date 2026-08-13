import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, RefreshCw, Layers, GitBranch, Save, Map } from 'lucide-react';

interface WorkflowState {
  id: number;
  name: string;
  label_th: string;
  label_en: string;
  color: string;
  is_terminal: boolean;
  sort_order: number;
}

interface WorkflowTransition {
  id: number;
  from_state: string;
  to_state: string;
  allowed_roles: string[];
  requires_comment: boolean;
  auto_notify: boolean;
}

interface Props {
  token: string;
  showNotify: (msg: string, type: 'success' | 'warning' | 'error', title?: string) => void;
  isDark: boolean;
}

export default function WorkflowAdminPanel({ token, showNotify, isDark }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'states' | 'transitions' | 'map'>('states');
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [editingState, setEditingState] = useState<Partial<WorkflowState> | null>(null);
  const [editingTransition, setEditingTransition] = useState<Partial<WorkflowTransition> | null>(null);

  useEffect(() => {
    fetchWorkflowData();
  }, [activeSubTab]);

  const fetchWorkflowData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (activeSubTab === 'states') {
        const res = await fetch('/api/workflow/states', { headers });
        const data = await res.json();
        if (data.success) setStates(data.states);
      } else if (activeSubTab === 'transitions') {
        const res = await fetch('/api/workflow/transitions', { headers });
        const data = await res.json();
        if (data.success) setTransitions(data.transitions);
      } else if (activeSubTab === 'map') {
        const [statesRes, transRes] = await Promise.all([
          fetch('/api/workflow/states', { headers }),
          fetch('/api/workflow/transitions', { headers })
        ]);
        const statesData = await statesRes.json();
        const transData = await transRes.json();
        if (statesData.success) setStates(statesData.states);
        if (transData.success) setTransitions(transData.transitions);
      }
    } catch (err) {
      showNotify('Failed to fetch workflow data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveState = async () => {
    if (!editingState?.name || !editingState?.label_th) return showNotify('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    
    try {
      const isNew = !editingState.id;
      const url = isNew ? '/api/workflow/states' : `/api/workflow/states/${editingState.name}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingState)
      });
      
      const data = await res.json();
      if (data.success) {
        showNotify(isNew ? 'เพิ่มสถานะสำเร็จ' : 'บันทึกการแก้ไขสำเร็จ', 'success');
        setEditingState(null);
        fetchWorkflowData();
      } else {
        showNotify(data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      showNotify('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  };

  const handleDeleteState = async (name: string) => {
    if (!confirm(`คุณต้องการลบสถานะ "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/workflow/states/${name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotify('ลบสถานะสำเร็จ', 'success');
        fetchWorkflowData();
      } else {
        showNotify(data.message, 'error');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการลบ', 'error');
    }
  };

  const handleSaveTransition = async () => {
    if (!editingTransition?.from_state || !editingTransition?.to_state) return showNotify('กรุณากรอกข้อมูลสถานะให้ครบถ้วน', 'warning');
    
    try {
      const isNew = !editingTransition.id;
      const url = isNew ? '/api/workflow/transitions' : `/api/workflow/transitions/${editingTransition.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingTransition)
      });
      
      const data = await res.json();
      if (data.success) {
        showNotify(isNew ? 'เพิ่ม Transition สำเร็จ' : 'บันทึกการแก้ไขสำเร็จ', 'success');
        setEditingTransition(null);
        fetchWorkflowData();
      } else {
        showNotify(data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      showNotify('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  };

  const handleDeleteTransition = async (id: number) => {
    if (!confirm(`คุณต้องการลบ Transition ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/workflow/transitions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotify('ลบ Transition สำเร็จ', 'success');
        fetchWorkflowData();
      } else {
        showNotify(data.message, 'error');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการลบ', 'error');
    }
  };

  const roleOptions = ['intake', 'owner', 'dpo', 'approver', 'admin', 'superadmin'];

  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-blue-500" />
            Workflow Engine Admin Panel
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            จัดการวงจรชีวิตคำขอ (Request Lifecycle) และสิทธิการเปลี่ยนสถานะ
          </p>
        </div>
        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setActiveSubTab('states')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeSubTab === 'states' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-4 h-4" />
            States (สถานะ)
          </button>
          <button 
            onClick={() => setActiveSubTab('transitions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeSubTab === 'transitions' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <GitBranch className="w-4 h-4" />
            Transitions (การเปลี่ยนสถานะ)
          </button>
          <button 
            onClick={() => setActiveSubTab('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeSubTab === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Map className="w-4 h-4" />
            Map (แผนภาพ)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : activeSubTab === 'states' ? (
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">รายการสถานะทั้งหมด ({states.length})</h3>
            <button 
              onClick={() => setEditingState({ name: '', label_th: '', label_en: '', color: 'gray', sort_order: states.length + 1, is_terminal: false })}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> เพิ่มสถานะใหม่
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">ID / Name (Key)</th>
                  <th className="px-4 py-3">Label (TH)</th>
                  <th className="px-4 py-3">Sort Order</th>
                  <th className="px-4 py-3">Terminal?</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {states.map(state => (
                  <tr key={state.name} className={`hover:${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                    <td className="px-4 py-3 font-mono text-xs">{state.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium bg-${state.color}-500/20 text-${state.color}-500 border border-${state.color}-500/30`}>
                        {state.label_th}
                      </span>
                    </td>
                    <td className="px-4 py-3">{state.sort_order}</td>
                    <td className="px-4 py-3">{state.is_terminal ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-500" />}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditingState(state)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition mr-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteState(state.name)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === 'transitions' ? (
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">เงื่อนไขการเปลี่ยนสถานะ ({transitions.length})</h3>
            <button 
              onClick={() => setEditingTransition({ from_state: '', to_state: '', allowed_roles: [], requires_comment: false, auto_notify: true })}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> เพิ่มกฎใหม่ (Rule)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">From State</th>
                  <th className="px-4 py-3">To State</th>
                  <th className="px-4 py-3">Allowed Roles</th>
                  <th className="px-4 py-3">Requires Comment</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {transitions.map(tr => (
                  <tr key={tr.id} className={`hover:${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-amber-500">{tr.from_state}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-500">{tr.to_state}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tr.allowed_roles.map(r => (
                          <span key={r} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] uppercase">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{tr.requires_comment ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-500" />}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditingTransition(tr)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition mr-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTransition(tr.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} overflow-x-auto`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">แผนภาพ Workflow (Visual Map)</h3>
          </div>
          <div className="relative min-w-[800px] h-[450px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              {(() => {
                const sortedStates = [...states].sort((a, b) => a.sort_order - b.sort_order);
                const positions: Record<string, {x: number, y: number}> = {};
                const nodeWidth = 140, nodeHeight = 50, gapX = 60, gapY = 80, startX = 50, startY = 150;
                
                sortedStates.forEach((state, index) => {
                  const row = Math.floor(index / 4);
                  const col = index % 4;
                  positions[state.name] = { x: startX + col * (nodeWidth + gapX), y: startY + row * (nodeHeight + gapY) };
                });

                return transitions.map((tr, idx) => {
                  const fromPos = positions[tr.from_state];
                  const toPos = positions[tr.to_state];
                  if (!fromPos || !toPos) return null;
                  
                  const isBackward = sortedStates.findIndex(s => s.name === tr.from_state) > sortedStates.findIndex(s => s.name === tr.to_state);
                  
                  let x1 = fromPos.x + (isBackward ? 0 : nodeWidth);
                  let y1 = fromPos.y + nodeHeight / 2;
                  let x2 = toPos.x + (isBackward ? nodeWidth : 0);
                  let y2 = toPos.y + nodeHeight / 2;
                  
                  let path;
                  if (fromPos.y === toPos.y && !isBackward) {
                     path = `M ${x1} ${y1} L ${x2} ${y2}`;
                  } else if (isBackward) {
                     const offset = 40 + (idx % 3) * 20;
                     y1 = fromPos.y; y2 = toPos.y; x1 = fromPos.x + nodeWidth/2; x2 = toPos.x + nodeWidth/2;
                     path = `M ${x1} ${y1} Q ${x1} ${y1 - offset}, ${(x1+x2)/2} ${Math.min(y1, y2) - offset} T ${x2} ${y2}`;
                  } else {
                     path = `M ${x1} ${y1} C ${x1 + 30} ${y1}, ${x2 - 30} ${y2}, ${x2} ${y2}`;
                  }

                  return (
                    <g key={tr.id}>
                      <path d={path} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" strokeDasharray={tr.requires_comment ? "5,5" : "none"} />
                      <text x={(x1 + x2) / 2} y={isBackward ? Math.min(y1, y2) - 30 : (y1 + y2) / 2 - 5} fill="#64748b" fontSize="10" textAnchor="middle">
                        {tr.allowed_roles[0]}{tr.allowed_roles.length > 1 ? '+' : ''}
                      </text>
                    </g>
                  );
                });
              })()}
            </svg>
            
            {(() => {
              const sortedStates = [...states].sort((a, b) => a.sort_order - b.sort_order);
              const positions: Record<string, {x: number, y: number}> = {};
              const nodeWidth = 140, nodeHeight = 50, gapX = 60, gapY = 80, startX = 50, startY = 150;
              const colors: Record<string, string> = {
                gray: '#64748b', blue: '#3b82f6', amber: '#f59e0b', green: '#10b981', red: '#ef4444', purple: '#8b5cf6'
              };
              
              sortedStates.forEach((state, index) => {
                const row = Math.floor(index / 4);
                const col = index % 4;
                positions[state.name] = { x: startX + col * (nodeWidth + gapX), y: startY + row * (nodeHeight + gapY) };
              });

              return sortedStates.map(state => {
                const pos = positions[state.name];
                return (
                  <div key={state.id} className="absolute shadow-sm border border-slate-200 dark:border-slate-700 rounded-md flex flex-col justify-center items-center px-2 py-1 bg-white dark:bg-slate-800"
                    style={{ left: pos.x, top: pos.y, width: nodeWidth, height: nodeHeight, borderTop: `4px solid ${colors[state.color] || colors.gray}` }}>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center">{state.label_th}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{state.name}</span>
                    {state.is_terminal && <Check className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 text-white rounded-full p-0.5" />}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Editor Modal for State */}
      {editingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden border p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl font-bold mb-4">{editingState.id ? 'แก้ไขสถานะ' : 'เพิ่มสถานะใหม่'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-slate-400">Name (Key)</label>
                <input 
                  type="text" 
                  value={editingState.name} 
                  onChange={e => setEditingState({...editingState, name: e.target.value})}
                  disabled={!!editingState.id}
                  className={`w-full px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'} ${editingState.id ? 'opacity-50' : ''}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Label (TH)</label>
                  <input type="text" value={editingState.label_th} onChange={e => setEditingState({...editingState, label_th: e.target.value})} className={`w-full px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'}`} />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Sort Order</label>
                  <input type="number" value={editingState.sort_order} onChange={e => setEditingState({...editingState, sort_order: parseInt(e.target.value)})} className={`w-full px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'}`} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input type="checkbox" checked={editingState.is_terminal} onChange={e => setEditingState({...editingState, is_terminal: e.target.checked})} className="rounded text-blue-500" />
                <span className="text-sm">Is Terminal (สิ้นสุดกระบวนการ)?</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingState(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">ยกเลิก</button>
              <button onClick={handleSaveState} className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"><Save className="w-4 h-4"/> บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Transition */}
      {editingTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden border p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl font-bold mb-4">{editingTransition.id ? 'แก้ไข Transition' : 'เพิ่ม Transition ใหม่'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-400">From State</label>
                  <select 
                    value={editingTransition.from_state} 
                    onChange={e => setEditingTransition({...editingTransition, from_state: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'}`}
                  >
                    <option value="">-- เลือก --</option>
                    {states.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">To State</label>
                  <select 
                    value={editingTransition.to_state} 
                    onChange={e => setEditingTransition({...editingTransition, to_state: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'}`}
                  >
                    <option value="">-- เลือก --</option>
                    {states.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-2 text-slate-400">Allowed Roles (อนุญาตให้ Role ใดบ้าง)</label>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map(role => {
                    const isSelected = editingTransition.allowed_roles?.includes(role);
                    return (
                      <label key={role} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer border ${isSelected ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={e => {
                            let roles = [...(editingTransition.allowed_roles || [])];
                            if (e.target.checked) roles.push(role);
                            else roles = roles.filter(r => r !== role);
                            setEditingTransition({...editingTransition, allowed_roles: roles});
                          }}
                          className="hidden"
                        />
                        {role}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingTransition.requires_comment} onChange={e => setEditingTransition({...editingTransition, requires_comment: e.target.checked})} className="rounded text-purple-500" />
                  <span className="text-sm">บังคับใส่เหตุผล?</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingTransition.auto_notify} onChange={e => setEditingTransition({...editingTransition, auto_notify: e.target.checked})} className="rounded text-purple-500" />
                  <span className="text-sm">Auto Email Notify?</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingTransition(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">ยกเลิก</button>
              <button onClick={handleSaveTransition} className="px-4 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"><Save className="w-4 h-4"/> บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
