

interface CookieBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize: () => void;
  onPolicyClick: () => void;
}

export function CookieBanner({ onAcceptAll, onRejectAll, onCustomize, onPolicyClick }: CookieBannerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[100] p-4 md:p-6 transition-transform transform">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-gray-700">
          <p className="font-semibold mb-1 text-base text-gray-900">🍪 การใช้คุกกี้ (Cookies)</p>
          เราใช้คุกกี้เพื่อพัฒนาประสิทธิภาพ และประสบการณ์ที่ดีในการใช้เว็บไซต์ของคุณ คุณสามารถศึกษารายละเอียดได้ที่{' '}
          <button onClick={onPolicyClick} className="text-blue-600 hover:underline font-medium">
            นโยบายคุกกี้
          </button>{' '}
          และสามารถจัดการความเป็นส่วนตัวของคุณได้เองโดยคลิกที่ "ตั้งค่าคุกกี้"
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
          <button 
            onClick={onCustomize}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ตั้งค่าคุกกี้
          </button>
          <button 
            onClick={onRejectAll}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            ปฏิเสธทั้งหมด
          </button>
          <button 
            onClick={onAcceptAll}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
