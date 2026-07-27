import React, { useState } from 'react';
import { Voice, VOICES } from '../types';
import { Play, CheckCircle2, Search, Sparkles, SlidersHorizontal, HelpCircle } from 'lucide-react';

interface VoiceSelectorListProps {
  provider: 'gemini' | 'openai' | 'elevenlabs';
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
  gender: 'Male' | 'Female' | 'Neutral';
  pitch: 'Low' | 'Normal' | 'High';
  speed: number;
}

// Map speaker ID to professional/cute avatars, tags, and languages
const AVATAR_MAP: Record<string, { emoji: string; bg: string; tag: string; flags: string }> = {
  // Gemini voices
  'Kore': { emoji: '👩‍💼', bg: 'from-pink-500 to-rose-600', tag: 'เป็นทางการ / ครู', flags: '🇹🇭 🇺🇸' },
  'Zephyr': { emoji: '👩‍🦰', bg: 'from-amber-400 to-orange-500', tag: 'เล่านิทาน / รีวิว', flags: '🇹🇭 🇺🇸' },
  'Puck': { emoji: '👨', bg: 'from-blue-500 to-indigo-600', tag: 'โฆษณา / ยูทูปเบอร์', flags: '🇹🇭 🇺🇸' },
  'Charon': { emoji: '🧔', bg: 'from-emerald-500 to-teal-600', tag: 'สารคดี / พากย์', flags: '🇹🇭 🇺🇸' },
  'Fenrir': { emoji: '👦', bg: 'from-violet-500 to-purple-600', tag: 'สนุกสนาน / มีพลัง', flags: '🇹🇭 🇺🇸' },

  // OpenAI voices
  'nova': { emoji: '👩', bg: 'from-fuchsia-400 to-rose-500', tag: 'พอดแคสต์ / อบอุ่น', flags: '🇺🇸 🇹🇭' },
  'shimmer': { emoji: '👱‍♀️', bg: 'from-orange-400 to-red-500', tag: 'ผู้ประกาศ / นิยาย', flags: '🇺🇸 🇹🇭' },
  'alloy': { emoji: '🧑', bg: 'from-cyan-500 to-blue-500', tag: 'ตอบรับอัตโนมัติ', flags: '🇺🇸 🇹🇭' },
  'fable': { emoji: '🧑‍🎨', bg: 'from-amber-500 to-red-600', tag: 'ละครวิทยุ / พากย์', flags: '🇺🇸 🇹🇭' },
  'echo': { emoji: '🧔', bg: 'from-indigo-500 to-blue-700', tag: 'นักพากย์ชาย', flags: '🇺🇸 🇹🇭' },
  'onyx': { emoji: '👨‍💼', bg: 'from-slate-600 to-slate-800', tag: 'ทางการ / รายงาน', flags: '🇺🇸 🇹🇭' },

  // ElevenLabs voices
  '21m00Tcm4TlvDq8ikWAM': { emoji: '👩‍🎓', bg: 'from-pink-400 to-pink-600', tag: 'เป็นกันเอง / วล็อก', flags: '🌐 🇺🇸' },
  'EXAVITQu4vr4xnSDgMaL': { emoji: '👧', bg: 'from-teal-400 to-emerald-500', tag: 'พากย์เด็ก / นิทาน', flags: '🌐 🇺🇸' },
  'piTKgcLEGmPEe24gW0SG': { emoji: '👱‍♀️', bg: 'from-violet-400 to-indigo-500', tag: 'คอร์สเรียน / ข่าว', flags: '🌐 🇬🇧' },
  'pNInz6obpgq5paN9Hp7L': { emoji: '👨‍🚀', bg: 'from-sky-500 to-blue-600', tag: 'บรรยายเข้มข้น', flags: '🌐 🇺🇸' },
  'ErXwobaYiN019PkySvjV': { emoji: '🤠', bg: 'from-amber-500 to-orange-600', tag: 'ตื่นเต้น / บล็อก', flags: '🌐 🇺🇸' },
  '2EiwXtPIgmqCXY7m8x4G': { emoji: '👨‍🏫', bg: 'from-zinc-500 to-zinc-700', tag: 'การศึกษา / สาธิต', flags: '🌐 🇺🇸' },
};

const ACCENT_MAP_TH: Record<string, string> = {
  'Multi Accent': 'หลายสำเนียง',
  'US/UK Accent': 'สำเนียงหลัก US/UK',
  'US Accent': 'สำเนียงอเมริกา',
  'UK Accent': 'สำเนียงอังกฤษ',
  'Multi-lingual': 'รองรับหลายภาษา',
  'Thai Standard': 'ไทยกลาง',
  'Southern Thai': 'สำเนียงใต้',
  'Northern Thai': 'สำเนียงเหนือ',
  'Isan Thai': 'สำเนียงอีสาน'
};

export default function VoiceSelectorList({
  provider,
  selectedVoiceId,
  setSelectedVoiceId,
  gender,
  pitch,
  speed,
}: VoiceSelectorListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenderFilter, setActiveGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  // Filter voices based on provider, search query, and gender tabs
  const filteredVoices = VOICES.filter((voice) => {
    const matchesProvider = voice.provider === provider;
    const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (voice.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesGender = true;
    if (activeGenderFilter === 'Male') matchesGender = voice.gender === 'Male';
    if (activeGenderFilter === 'Female') matchesGender = voice.gender === 'Female';

    return matchesProvider && matchesSearch && matchesGender;
  });

  // Play browser sample synthesis
  const handlePlaySample = (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const sampleText = voice.lang.toLowerCase().includes('thai') || voice.provider === 'gemini'
          ? `สวัสดีครับ ยินดีที่ได้รู้จักครับ ผมคือเสียงจำลองอัตโนมัติระดับพรีเมียมของ ${voice.name} ยินดีให้บริการแปลงข้อความของคุณในวันนี้ครับ`
          : `Hello! I am a high fidelity voice character named ${voice.name}, synthesized instantly.`;
        const utterance = new SpeechSynthesisUtterance(sampleText);
        
        // Try to find matching system voice
        const systemVoices = window.speechSynthesis.getVoices();
        const matchingVoice = systemVoices.find(
          (v) =>
            v.name.toLowerCase().includes(voice.name.toLowerCase()) ||
            (voice.gender === 'Female' && v.name.toLowerCase().includes('female')) ||
            (voice.gender === 'Male' && v.name.toLowerCase().includes('male'))
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        
        // Map pitch
        utterance.pitch = pitch === 'Low' ? 0.75 : pitch === 'High' ? 1.25 : 1.0;
        utterance.rate = speed;
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Speech synthesis sample play failed in this browser environment:', err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col h-full min-h-[500px]">
      {/* Grid Title & Provider indicator */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-[#c8502a] animate-pulse" />
          <h3 className="text-sm font-black text-slate-200">เลือกตัวละครเสียง (Voice Library)</h3>
        </div>
        <span className="text-[10px] text-[#c8502a] font-black uppercase bg-[#c8502a]/10 px-2.5 py-0.5 rounded-full border border-[#c8502a]/20">
          {provider === 'gemini' ? 'Gemini AI' : provider === 'openai' ? 'OpenAI' : 'ElevenLabs'}
        </span>
      </div>

      {/* Modern Filter controls: Search and Gender Toggles */}
      <div className="space-y-2.5">
        {/* Real-time Character search box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อตัวละครเสียง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800/80 text-xs px-10 py-2.5 rounded-xl outline-none focus:border-[#c8502a] transition duration-300 placeholder:text-slate-600 text-slate-200"
          />
        </div>

        {/* Gender Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-slate-950/50 rounded-xl border border-slate-800/50">
          {(['All', 'Female', 'Male'] as const).map((filterG) => (
            <button
              key={filterG}
              type="button"
              onClick={() => setActiveGenderFilter(filterG)}
              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all duration-300 ${
                activeGenderFilter === filterG
                  ? 'bg-gradient-to-r from-[#c8502a] to-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {filterG === 'All' ? 'ทั้งหมด' : filterG === 'Female' ? 'หญิง' : 'ชาย'}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Cards Grid - Pure Botnoi Style */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin max-h-[480px]">
        {filteredVoices.length === 0 ? (
          <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800 flex flex-col justify-center items-center gap-2">
            <span className="text-3xl">🏜️</span>
            <p className="text-xs text-slate-500 font-bold">ไม่พบรายชื่อเสียงตามตัวเลือกของคุณ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-3 pb-2">
            {filteredVoices.map((v) => {
              const isSelected = selectedVoiceId === v.id;
              const meta = AVATAR_MAP[v.id] || { emoji: '🎙️', bg: 'from-slate-500 to-slate-700', tag: 'เสียงทั่วไป', flags: '🇹🇭' };

              return (
                <div
                  key={v.id}
                  id={`voice-selector-card-${v.id}`}
                  onClick={() => setSelectedVoiceId(v.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between relative group overflow-hidden select-none min-h-[125px] ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-[#c8502a]/10 border-[#c8502a] shadow-[0_4px_25px_rgba(200,80,42,0.18)]'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  {/* Decorative selection ring top banner */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#c8502a]/30 to-transparent blur-lg pointer-events-none" />
                  )}

                  {/* Upper Row: Avatar, Flags, and Name */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-1">
                      {/* Round Emoji Avatar with matching gradient */}
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${meta.bg} flex items-center justify-center text-lg shadow-inner shrink-0 group-hover:scale-105 transition-all`}>
                        {meta.emoji}
                      </div>

                      {/* Flag and selection tick */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold tracking-tight filter drop-shadow">
                          {meta.flags}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#c8502a] text-white flex items-center justify-center shadow-md">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Speaker name */}
                    <div className="min-w-0">
                      <h4 className={`text-xs font-black truncate ${isSelected ? 'text-[#c8502a]' : 'text-slate-100 group-hover:text-white'}`}>
                        {v.name}
                      </h4>
                      <p className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                        {ACCENT_MAP_TH[v.accent] || v.accent}
                      </p>
                    </div>
                  </div>

                  {/* Lower Row: recommended tag & play preview trigger */}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-900/60">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 group-hover:text-slate-300 max-w-[85px] truncate">
                      {meta.tag}
                    </span>
                    
                    <button
                      id={`play-sample-selector-${v.id}`}
                      type="button"
                      onClick={(e) => handlePlaySample(e, v)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-[#c8502a]/10 hover:text-[#c8502a] border border-slate-800 hover:border-[#c8502a]/20 transition-all duration-300"
                      title="ทดลองฟังตัวอย่างเสียง"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide footer info */}
      <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-600 flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>คลิกปุ่ม ▶️ บนตัวละครเพื่อพรีวิวเสียงพูดออฟไลน์</span>
      </div>
    </div>
  );
}

