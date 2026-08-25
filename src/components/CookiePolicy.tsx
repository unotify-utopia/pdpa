import React from 'react';
import { Shield, Cookie, Settings } from 'lucide-react';

export function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Cookie size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">นโยบายการใช้คุกกี้ (Cookie Policy)</h1>
          <p className="text-gray-500">ปรับปรุงล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Shield size={24} className="text-blue-600" />
              1. คุกกี้คืออะไร ?
            </h2>
            <p>
              คุกกี้ (Cookies) คือ ไฟล์ข้อมูลขนาดเล็กที่ถูกดาวน์โหลดและจัดเก็บไว้ในคอมพิวเตอร์ แท็บเล็ต หรือสมาร์ทโฟนของท่านผ่านทางเว็บเบราว์เซอร์เมื่อท่านเข้าใช้งานเว็บไซต์ 
              คุกกี้ช่วยให้เว็บไซต์สามารถจดจำอุปกรณ์ของท่านและประวัติการใช้งาน เพื่อให้การนำเสนอข้อมูลหน้าเว็บเป็นไปอย่างราบรื่นและตรงกับความต้องการของท่านมากยิ่งขึ้น
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Settings size={24} className="text-blue-600" />
              2. เราใช้คุกกี้เพื่ออะไร ?
            </h2>
            <p>เว็บไซต์ของเราใช้คุกกี้เพื่อวัตถุประสงค์หลายประการ โดยแบ่งออกเป็นประเภทหลักๆ ดังนี้:</p>
            
            <div className="mt-6 space-y-6 pl-4 md:pl-8 border-l-2 border-gray-100">
              <div>
                <h3 className="text-lg font-medium text-gray-900">2.1 คุกกี้ที่จำเป็นอย่างยิ่ง (Strictly Necessary Cookies)</h3>
                <p className="mt-2 text-sm">
                  คุกกี้ประเภทนี้มีความจำเป็นต่อการทำงานของเว็บไซต์ เพื่อให้เว็บไซต์สามารถทำงานได้ตามปกติ มีความปลอดภัย และให้ท่านสามารถเข้าใช้เว็บไซต์ได้ 
                  เช่น การเข้าสู่ระบบ การตั้งค่าความเป็นส่วนตัว คุกกี้ประเภทนี้ไม่สามารถปิดการใช้งานได้ในระบบของเรา
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">2.2 คุกกี้เพื่อการวิเคราะห์ (Analytics Cookies)</h3>
                <p className="mt-2 text-sm">
                  คุกกี้ประเภทนี้จะช่วยให้เราสามารถจดจำและนับจำนวนผู้เข้าเยี่ยมชมเว็บไซต์ ตลอดจนช่วยให้เราทราบถึงพฤติกรรมในการเยี่ยมชมเว็บไซต์ 
                  เพื่อปรับปรุงประสิทธิภาพการทำงานของเว็บไซต์ให้ดียิ่งขึ้น เช่น ช่วยให้ผู้ใช้งานสามารถค้นหาสิ่งที่ต้องการได้อย่างรวดเร็ว
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">2.3 คุกกี้เพื่อการโฆษณาและการตลาด (Marketing Cookies)</h3>
                <p className="mt-2 text-sm">
                  คุกกี้ประเภทนี้จะจดจำการเข้าหน้าเว็บของท่านเพื่อนำเสนอข้อมูล โฆษณา หรือแคมเปญที่เหมาะสมและตรงกับความสนใจของท่านมากที่สุด 
                  รวมถึงจำกัดจำนวนครั้งที่ท่านจะเห็นโฆษณา หากท่านไม่อนุญาตคุกกี้ประเภทนี้ ท่านอาจไม่ได้รับโฆษณาที่ตรงกับความสนใจของท่าน
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. การจัดการคุกกี้</h2>
            <p>
              ท่านสามารถตั้งค่าและจัดการคุกกี้ได้ตลอดเวลา โดยคลิกที่ปุ่ม "ตั้งค่าคุกกี้" ที่บริเวณแถบด้านล่างของเว็บไซต์ หรือผ่านหน้าต่างนี้ 
              นอกจากนี้ ท่านยังสามารถตั้งค่าผ่านเว็บเบราว์เซอร์ของท่านเพื่อบล็อกการทำงานของคุกกี้ได้ (โปรดทราบว่าหากท่านบล็อกคุกกี้ที่จำเป็นทั้งหมด ท่านอาจไม่สามารถเข้าใช้งานบางส่วนของเว็บไซต์เราได้)
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. การเปลี่ยนแปลงนโยบายคุกกี้</h2>
            <p>
              เราอาจทำการปรับปรุงนโยบายคุกกี้นี้เป็นครั้งคราว เพื่อให้สอดคล้องกับการเปลี่ยนแปลงของการให้บริการหรือกฎหมายที่เกี่ยวข้อง 
              เราขอแนะนำให้ท่านตรวจสอบหน้านี้เป็นระยะๆ เพื่อให้ทราบถึงนโยบายคุกกี้ฉบับล่าสุด
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. ติดต่อเรา</h2>
            <p>
              หากท่านมีคำถามเกี่ยวกับนโยบายคุกกี้นี้ หรือต้องการสอบถามเพิ่มเติมเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคล 
              สามารถติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ของเราได้ผ่านช่องทางการติดต่อที่ระบุในเว็บไซต์
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
