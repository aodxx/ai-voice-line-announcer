import React from 'react';
import { Mic, History, Settings, Sparkles, Volume2, Key, HelpCircle, Activity, Sliders, Code, MessageSquare } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedVoiceName: string;
  selectedProviderName: string;
}

export default function Sidebar({ activeTab, setActiveTab, selectedVoiceName, selectedProviderName }: SidebarProps) {
  const menuItems = [
    { id: 'studio', name: 'ห้องอัดเสียง (Studio)', icon: Mic, description: 'แปลงข้อความเป็นเสียงสังเคราะห์' },
    { id: 'voice-settings', name: 'ปรับแต่งเสียง (Voice Config)', icon: Sliders, description: 'ปรับอารมณ์ สำเนียง และความถี่เสียง' },
    { id: 'line-bot', name: 'LINE Bot (แจ้งข่าว)', icon: MessageSquare, description: 'ดักจับข้อความ LINE @แจ้งข่าว และสร้างเสียงตอบกลับอัตโนมัติ' },
    { id: 'history', name: 'คลังเสียงส่วนตัว (My Library)', icon: History, description: 'ไฟล์เสียงทั้งหมดที่บันทึกไว้' },
    { id: 'settings', name: 'การเชื่อมต่อ (API Key)', icon: Key, description: 'กำหนดค่าคีย์เอนจิ้นภายนอก' },
    { id: 'api-docs', name: 'เชื่อมต่อ API (Developer)', icon: Code, description: 'คู่มือและรหัสเชื่อมโยงสำหรับนักพัฒนา' },
  ];

  return (
    <aside id="sidebar-container" className="w-full bg-slate-900 text-slate-100 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xl relative z-40 select-none">
      {/* Botnoi Voice Style Header Glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#c8502a] via-orange-500 to-amber-500" />
      
      {/* Left side: Brand Logo - Botnoi Style */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-[#c8502a] to-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
          <Volume2 className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#c8502a] bg-[#c8502a]/10 px-1.5 py-0.5 rounded-md">PRO</span>
            <span className="text-[9px] text-slate-400 font-bold tracking-wider">v3.1.2</span>
          </div>
          <h1 className="text-base font-black tracking-tight text-white uppercase flex items-center gap-1">
            BOTNOI <span className="text-[#c8502a]">Voice</span>
          </h1>
        </div>
      </div>

      {/* Middle side: Navigation Menu (Horizontal Row) */}
      <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl transition-all duration-300 text-left group border text-xs font-bold cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#c8502a]/15 to-orange-500/10 text-white border-[#c8502a]/30 shadow-[0_4px_12px_rgba(200,80,42,0.15)]'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-white'
              }`}
              title={item.description}
            >
              <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#c8502a]' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <span>{item.name.split(' (')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Right side: Compact Status Indicator & Help Center */}
      <div className="flex items-center gap-4">
        {/* Active Voice Card */}
        <div className="flex items-center gap-2.5 bg-slate-950/40 border border-slate-800/80 rounded-2xl px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c8502a] to-amber-500 flex items-center justify-center font-bold text-white shadow-md text-[10px] shrink-0">
            {selectedVoiceName ? selectedVoiceName.charAt(0) : 'V'}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-black text-slate-200 truncate leading-none">{selectedVoiceName || 'ยังไม่ได้เลือก'}</p>
            <p className="text-[8px] text-slate-500 truncate uppercase mt-0.5 font-bold leading-none">{selectedProviderName}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" title="ONLINE" />
        </div>

        {/* Documentation Link */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" title="ศูนย์ช่วยเหลือและคู่มือการใช้">
          <HelpCircle className="h-4 w-4" />
        </div>
      </div>
    </aside>
  );
}

