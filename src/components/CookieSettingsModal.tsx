import { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: CookiePreferences) => void;
  initialPreferences?: CookiePreferences;
  onPolicyClick: () => void;
}

export function CookieSettingsModal({ isOpen, onClose, onSave, initialPreferences, onPolicyClick }: CookieSettingsModalProps) {
  const [preferences, setPreferences] = useState<CookiePreferences>(
    initialPreferences || { necessary: true, analytics: false, marketing: false }
  );

  if (!isOpen) return null;

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot toggle necessary cookies
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">ตั้งค่าความเป็นส่วนตัวของคุกกี้</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-6">
            เว็บไซต์ของเราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งานของคุณ คุณสามารถเลือกตั้งค่าความยินยอมการใช้คุกกี้ได้โดยเปิดหรือปิดการใช้งานคุกกี้ในแต่ละประเภทด้านล่าง สำหรับรายละเอียดเพิ่มเติม โปรดอ่าน{' '}
            <button onClick={() => { onClose(); onPolicyClick(); }} className="text-blue-600 hover:underline">นโยบายคุกกี้</button>
            {' '}ของเรา
          </p>

          <div className="space-y-4">
            {/* Necessary Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    คุกกี้ที่จำเป็นอย่างยิ่ง (Strictly Necessary Cookies)
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">จำเป็น</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    คุกกี้ประเภทนี้มีความจำเป็นต่อการทำงานของเว็บไซต์ เพื่อให้เว็บไซต์สามารถทำงานได้ตามปกติ มีความปลอดภัย และให้ท่านสามารถเข้าใช้เว็บไซต์ได้ เช่น การเข้าสู่ระบบ การตั้งค่าความเป็นส่วนตัว (ไม่สามารถปิดการใช้งานได้)
                  </p>
                </div>
                <div className="ml-4">
                  <div className="w-11 h-6 bg-blue-600 rounded-full flex items-center p-1 cursor-not-allowed opacity-80">
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform translate-x-5 flex items-center justify-center">
                       <Check size={12} className="text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">คุกกี้เพื่อการวิเคราะห์ (Analytics Cookies)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    คุกกี้ประเภทนี้จะช่วยให้เราสามารถจดจำและนับจำนวนผู้เข้าเยี่ยมชมเว็บไซต์ตลอดจนช่วยให้เราทราบถึงพฤติกรรมในการเยี่ยมชมเว็บไซต์ เพื่อปรับปรุงประสิทธิภาพการทำงานของเว็บไซต์ให้ดียิ่งขึ้น
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 mt-1">
                  <button 
                    onClick={() => handleToggle('analytics')}
                    className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${preferences.analytics ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${preferences.analytics ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">คุกกี้เพื่อการโฆษณาและการตลาด (Marketing Cookies)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    คุกกี้ประเภทนี้จะจดจำการเข้าหน้าเว็บของท่านเพื่อนำเสนอข้อมูล โฆษณา หรือแคมเปญที่เหมาะสมและตรงกับความสนใจของท่านมากที่สุด หากท่านไม่อนุญาตคุกกี้ประเภทนี้ ท่านอาจไม่ได้รับโฆษณาที่ตรงกับความสนใจของท่าน
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 mt-1">
                  <button 
                    onClick={() => handleToggle('marketing')}
                    className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${preferences.marketing ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${preferences.marketing ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
