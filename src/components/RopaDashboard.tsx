import React from 'react';
import type { User, RopaActivity } from '../types';
import { Plus, Database, Clock, FileCheck, CheckCircle2, ChevronRight, Search } from 'lucide-react';

interface RopaDashboardProps {
  activeUser: User;
  activities: RopaActivity[];
  onCreateNew: () => void;
  onEdit: (id: string) => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'ฉบับร่าง',
  PENDING_REVIEW: 'รอตรวจสอบ',
  APPROVED: 'อนุมัติแล้ว',
};

export default function RopaDashboard({ activeUser, activities, onCreateNew, onEdit }: RopaDashboardProps) {
  
  // DPO sees all, Owners see their department's or all if small org. For now, filter by role if needed.
  // The API already filters by org_id.
  
  const stats = {
    total: activities.length,
    approved: activities.filter(a => a.status === 'APPROVED').length,
    pending: activities.filter(a => a.status === 'PENDING_REVIEW').length,
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-brand-600" />
            ระบบบันทึกกิจกรรมการประมวลผล (RoPA)
          </h1>
          <p className="text-sm text-slate-500 mt-1">จัดการและบันทึกกิจกรรมที่เกี่ยวข้องกับข้อมูลส่วนบุคคล</p>
        </div>
        
        {(activeUser.role === 'owner' || activeUser.role === 'admin' || activeUser.role === 'dpo') && (
          <button 
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            สร้างรายการบันทึกใหม่
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">กิจกรรมทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">รอตรวจสอบ (DPO)</p>
            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">อนุมัติแล้ว</p>
            <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-slate-400" />
            รายการ RoPA ขององค์กร
          </h2>
          <div className="relative w-full md:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหากิจกรรม..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900 mb-1">ยังไม่มีรายการประมวลผล</p>
            <p className="text-sm">เริ่มต้นสร้าง ROPA ฉบับแรกของคุณเพื่อบันทึกกิจกรรมข้อมูลส่วนบุคคล</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">ชื่อกิจกรรม (Activity Name)</th>
                  <th className="px-6 py-4">แผนก</th>
                  <th className="px-6 py-4">ฐานกฎหมาย</th>
                  <th className="px-6 py-4">ข้อมูลที่เก็บ</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map(activity => (
                  <tr key={activity.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{activity.activity_name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{activity.purpose}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {activity.department_name || 'ไม่ระบุ'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{activity.legal_basis_name || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(activity.category_names || []).slice(0, 2).map((cat, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] whitespace-nowrap">
                            {cat}
                          </span>
                        ))}
                        {(activity.category_names?.length || 0) > 2 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
                            +{(activity.category_names?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[activity.status || 'DRAFT']}`}>
                        {statusLabels[activity.status || 'DRAFT']}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => activity.id && onEdit(activity.id)}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                        title="ดูรายละเอียด/แก้ไข"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
