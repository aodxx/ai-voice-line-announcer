import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop, VolumeX, Volume2, User, Globe, Download } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  activeTab: string;
}

export default function Header({ theme, setTheme, activeTab }: HeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can install the PWA
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If the app is already in standalone mode, do not show the button
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt response: ${outcome}`);
    // We can't use the prompt again
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'studio':
        return 'ห้องสังเคราะห์เสียงสตูดิโอ (AI Studio)';
      case 'voice-settings':
        return 'ปรับแต่งลักษณะและโทนเสียง (Voice Tuning)';
      case 'history':
        return 'คลังเสียง & ประวัติงานสร้างเสียง';
      case 'settings':
        return 'ตั้งค่าระบบเชื่อมต่อเอนจิ้นสังเคราะห์';
      default:
        return 'BOTNOI Voice';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'studio':
        return 'สร้างเสียงพูดภาษาไทยและภาษาอังกฤษที่สมบูรณ์และเป็นธรรมชาติที่สุด ด้วยเทคโนโลยีสังเคราะห์ล่าสุด';
      case 'voice-settings':
        return 'ปรับแต่งระดับความเร็ว คีย์เสียง อารมณ์การแสดงออก และสำเนียงภาษาในแบบของคุณ';
      case 'history':
        return 'จัดการไฟล์เสียงและดาวน์โหลดเสียงสังเคราะห์ในสกุลต่าง ๆ ได้ตามต้องการ';
      case 'settings':
        return 'กำหนดคีย์ระบบภายนอกและการเชื่อมต่อ API เพื่อใช้งานแบบพรีเมียม';
      default:
        return 'แพลตฟอร์มสังเคราะห์เสียงและปรับแต่งเสียงพูดครบวงจร';
    }
  };

  return (
    <header id="header-container" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/10 dark:bg-slate-950/10 border-b border-slate-800 p-6 backdrop-blur-md">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>{getTitle()}</span>
          {activeTab === 'studio' && (
            <span className="text-[10px] bg-[#c8502a]/10 border border-[#c8502a]/20 text-[#c8502a] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">LIVE</span>
          )}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {getSubtitle()}
        </p>
      </div>

      <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between">
        {/* Custom PWA Install Button */}
        {showInstallBtn && (
          <button
            id="pwa-install-btn"
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c8502a] to-red-500 hover:from-red-600 hover:to-[#c8502a] text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-900/20 hover:shadow-red-900/40 transition-all duration-300 animate-pulse active:scale-95 cursor-pointer border border-white/10"
            title="ติดตั้งแอปพลิเคชัน AI Voice Studio ลงบนอุปกรณ์ของคุณ"
          >
            <Download className="h-4 w-4" />
            <span>ติดตั้งแอป (PWA)</span>
          </button>
        )}

        {/* Quick Language Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#c8502a]/10 border border-[#c8502a]/20 rounded-full text-xs font-bold text-[#c8502a]">
          <Globe className="h-3.5 w-3.5" />
          <span>รองรับ ภาษาไทย / English</span>
        </div>

        {/* Theme Controller Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/10 shadow-inner">
          <button
            id="theme-light-btn"
            onClick={() => setTheme('light')}
            className={`p-2 rounded-xl transition-all duration-300 ${
              theme === 'light'
                ? 'bg-white dark:bg-slate-800 text-[#c8502a] shadow-sm'
                : 'text-slate-500 hover:text-slate-200'
            }`}
            title="ธีมสว่าง"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            id="theme-dark-btn"
            onClick={() => setTheme('dark')}
            className={`p-2 rounded-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-white dark:bg-slate-800 text-[#c8502a] shadow-sm'
                : 'text-slate-500 hover:text-slate-200'
            }`}
            title="ธีมมืด"
          >
            <Moon className="h-4 w-4" />
          </button>
          <button
            id="theme-system-btn"
            onClick={() => setTheme('system')}
            className={`p-2 rounded-xl transition-all duration-300 ${
              theme === 'system'
                ? 'bg-white dark:bg-slate-800 text-[#c8502a] shadow-sm'
                : 'text-slate-500 hover:text-slate-200'
            }`}
            title="ธีมตามระบบอุปกรณ์"
          >
            <Laptop className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
