import React from 'react';
import { Key, Eye, EyeOff, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ApiSettingsProps {
  geminiKey: string;
  setGeminiKey: (key: string) => void;
}

export default function ApiSettings({
  geminiKey,
  setGeminiKey,
}: ApiSettingsProps) {
  const [showGemini, setShowGemini] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleSaveToLocalStorage = () => {
    localStorage.setItem('gemini_api_key_override', geminiKey);
    setStatusMessage('บันทึกคีย์ Gemini API Key ลงในระบบเซสชันนี้สำเร็จเรียบร้อยแล้ว!');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleClearKeys = () => {
    setGeminiKey('');
    localStorage.removeItem('gemini_api_key_override');
    setStatusMessage('ล้างค่า API Key สำเร็จ และสลับกลับไปใช้เอนจิ้นฟรีของระบบหลัก เรียบร้อยแล้ว!');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c8502a]" />
        
        <div className="flex items-center gap-2 text-[#c8502a] font-black text-sm">
          <Key className="h-5 w-5" />
          <span className="uppercase tracking-wider">ระบบความปลอดภัยและกุญแจเชื่อมต่อ (Credentials)</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          ระบบสตูดิโอได้เชื่อมต่อเอนจิ้นกลางความไวสูงเอาไว้เรียบร้อยแล้ว หากคุณต้องการกำหนดสิทธิ์และขยายลิมิตคำยาว ๆ 
          คุณสามารถกรอกและสลับใช้ **Gemini API Key ส่วนตัว** ของตนเองได้ทันที คีย์นี้จะข้ามโควต้าเอนจิ้นส่วนกลางและใช้โควต้าบัญชีนักพัฒนาของคุณโดยตรง
        </p>

        {/* Dynamic Status notification bar */}
        {statusMessage && (
          <div className="bg-[#c8502a]/10 border border-[#c8502a]/30 p-3.5 rounded-2xl flex items-center gap-2.5 text-white text-xs animate-bounce">
            <CheckCircle2 className="h-4.5 w-4.5 text-[#c8502a] shrink-0" />
            <span className="font-bold text-[#c8502a]">{statusMessage}</span>
          </div>
        )}

        {/* Advisory Warning */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed font-bold">
            <span>ประกาศความปลอดภัย:</span> ข้อมูล API Key จะถูกเก็บบันทึกไว้อย่างปลอดภัยในเบราว์เซอร์ส่วนตัวของคุณ (Local Storage) และจะประมวลผลเซิร์ฟเวอร์แบบลับ (Server-to-Server) เท่านั้น โดยจะไม่เปิดเผยรหัสใด ๆ สู่บุคคลภายนอกอย่างสมบูรณ์
          </div>
        </div>

        {/* Input fields */}
        <div className="space-y-4">
          {/* Gemini Key Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wide">สลับใช้ Gemini API Key ส่วนตัว</label>
              <span className="text-[10px] text-slate-500 font-mono font-bold">ขึ้นต้นด้วย &apos;AIzaSy&apos;</span>
            </div>
            <div className="relative">
              <input
                id="gemini-key-input"
                type={showGemini ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-[#c8502a] text-slate-200 text-xs p-3.5 rounded-2xl outline-none font-mono pr-12 transition duration-300 font-bold"
              />
              <button
                id="toggle-gemini-key"
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              id="save-keys-btn"
              type="button"
              onClick={handleSaveToLocalStorage}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#c8502a] to-orange-500 hover:from-orange-500 hover:to-[#c8502a] text-white font-black text-xs transition duration-300 active:scale-95 shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              เปิดใช้งานคีย์ส่วนตัว
            </button>
            <button
              id="clear-keys-btn"
              type="button"
              onClick={handleClearKeys}
              className="py-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-black text-xs transition duration-300 cursor-pointer"
            >
              ล้างรหัสและกลับไปใช้ของระบบหลัก
            </button>
          </div>
        </div>
      </div>

      {/* Info Help Block */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-[#c8502a] font-black text-xs uppercase tracking-wider">
          <HelpCircle className="h-4 w-4" />
          <span>ขอรับ Gemini API Key ฟรีได้ที่ไหน?</span>
        </div>
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed font-bold">
          <p>
            - **Google AI Studio Portal:** สมัครและลงทะเบียนเพื่อรับคีย์นักพัฒนาแบบไม่มีค่าใช้จ่ายได้โดยตรงที่หน้าเว็บอย่างเป็นทางการ [Google AI Studio (https://aistudio.google.com/)](https://aistudio.google.com/)
          </p>
          <p>
            - **คำอธิบายโมเดล:** เราประมวลผลเสียงจำลองสมจริงขั้นสูง ผ่านตัวจำลองชั้นเยี่ยม `gemini-3.1-flash-tts-preview` ซึ่งให้โทนเสียง อารมณ์ และสำเนียงที่ดีที่สุดในอุตสาหกรรม ณ ขณะนี้
          </p>
        </div>
      </div>
    </div>
  );
}
