import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export type NotifyType = 'success' | 'warning' | 'error' | 'confirm';

interface NotifyModalProps {
  open: boolean;
  title: string;
  message: string;
  type: NotifyType;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export function NotifyModal({ open, title, message, type, onConfirm, onCancel, onClose }: NotifyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`p-4 flex items-center gap-3 ${
          type === 'success' ? 'bg-emerald-50 text-emerald-700' :
          type === 'warning' ? 'bg-amber-50 text-amber-700' :
          type === 'error' ? 'bg-rose-50 text-rose-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {type === 'success' && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
          {type === 'warning' && <AlertCircle className="h-6 w-6 text-amber-600" />}
          {type === 'error' && <XCircle className="h-6 w-6 text-rose-600" />}
          {type === 'confirm' && <AlertCircle className="h-6 w-6 text-blue-600" />}
          <h3 className="font-bold">{title}</h3>
        </div>
        <div className="p-5">
          <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
          {type === 'confirm' ? (
            <>
              <button
                onClick={() => {
                  onCancel?.();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ยืนยัน
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              ตกลง
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
