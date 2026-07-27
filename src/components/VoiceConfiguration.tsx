import React from 'react';
import { EMOTIONS, ACCENTS, STYLES, PROVIDERS } from '../types';
import { Sliders, Activity, Settings, Music, VolumeX, Sparkles } from 'lucide-react';

interface VoiceConfigurationProps {
  provider: 'gemini' | 'openai' | 'elevenlabs';
  setProvider: (provider: 'gemini' | 'openai' | 'elevenlabs') => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
  gender: 'Male' | 'Female' | 'Neutral';
  setGender: (gender: 'Male' | 'Female' | 'Neutral') => void;
  emotion: string;
  setEmotion: (emotion: string) => void;
  accent: string;
  setAccent: (accent: string) => void;
  style: string;
  setStyle: (style: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  pitch: 'Low' | 'Normal' | 'High';
  setPitch: (pitch: 'Low' | 'Normal' | 'High') => void;
  format: 'mp3' | 'm4a' | 'wav';
  setFormat: (format: 'mp3' | 'm4a' | 'wav') => void;
}

const EMOTION_TH: Record<string, string> = {
  'Normal': 'ปกติ / ทั่วไป',
  'Happy': 'มีความสุข / ร่าเริง',
  'Sad': 'เศร้า / ซาบซึ้ง',
  'Excited': 'ตื่นเต้น / มีพลัง',
  'Angry': 'โกรธ / ดุดัน',
  'Calm': 'สงบ / ผ่อนคลาย',
  'Friendly': 'เป็นกันเอง / อบอุ่น',
  'Professional': 'เป็นทางการ / ทางการ',
  'Storytelling': 'เล่าเรื่อง / นิยาย'
};

const ACCENT_TH: Record<string, string> = {
  'Thai Standard': 'ไทยมาตรฐาน (กลาง)',
  'Southern Thai': 'ไทยสำเนียงใต้',
  'Northern Thai': 'ไทยสำเนียงเหนือ',
  'Isan Thai': 'ไทยสำเนียงอีสาน',
  'English US': 'อังกฤษ (สหรัฐอเมริกา)',
  'English UK': 'อังกฤษ (สหราชอาณาจักร)',
  'Australian English': 'อังกฤษ (ออสเตรเลีย)',
  'Singapore English': 'อังกฤษ (สิงคโปร์)'
};

const STYLE_TH: Record<string, string> = {
  'Narrator': 'ผู้บรรยายเรื่อง',
  'News Reader': 'ผู้ประกาศข่าว / ทางการ',
  'Podcast Host': 'พิธีกร / พอดแคสต์',
  'Teacher': 'คุณครู / อธิบายบทเรียน',
  'Customer Service': 'บริการลูกค้า (Call Center)',
  'YouTuber': 'ยูทูบเบอร์ / ครีเอเตอร์',
  'Motivational Speaker': 'นักพูดสร้างแรงบันดาลใจ',
  'Documentary Voice': 'สารคดี / ทางการ'
};

const GENDER_TH: Record<string, string> = {
  'Male': 'ชาย',
  'Female': 'หญิง',
  'Neutral': 'ทั้งหมด'
};

const PITCH_TH: Record<string, string> = {
  'Low': 'ต่ำ',
  'Normal': 'ปกติ',
  'High': 'สูง'
};

const PROVIDER_NAME_TH: Record<string, string> = {
  'gemini': 'Gemini AI Voice (ฟรี)',
  'openai': 'OpenAI TTS (พรีเมียม)',
  'elevenlabs': 'ElevenLabs (เสมือนจริง)'
};

const PROVIDER_DESC_TH: Record<string, string> = {
  'gemini': 'เสียงสังเคราะห์ธรรมชาติคุณภาพสูงของ Google',
  'openai': 'เสียงสมจริงและโต้ตอบเป็นธรรมชาติ',
  'elevenlabs': 'เสียงโคลนสมจริงขั้นสูงสุดระดับสตูดิโอ'
};

export default function VoiceConfiguration({
  provider,
  setProvider,
  selectedVoiceId,
  setSelectedVoiceId,
  gender,
  setGender,
  emotion,
  setEmotion,
  accent,
  setAccent,
  style,
  setStyle,
  speed,
  setSpeed,
  pitch,
  setPitch,
  format,
  setFormat,
}: VoiceConfigurationProps) {
  
  return (
    <div className="space-y-4">
      {/* 1. Provider Select */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c8502a]" />
        
        <div className="flex items-center gap-2 text-[#c8502a] font-black text-xs uppercase tracking-widest pb-2 border-b border-slate-800">
          <Activity className="h-4 w-4 animate-pulse" />
          <span>เอนจิ้นผู้ให้บริการ (Engine Provider)</span>
        </div>
        
        <div className="grid grid-cols-1 gap-2 pt-1 text-slate-300">
          {PROVIDERS.map((p) => {
            const isSelected = provider === p.id;
            return (
              <button
                key={p.id}
                id={`provider-select-${p.id}`}
                onClick={() => {
                  setProvider(p.id as any);
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-[#c8502a]/5 border-[#c8502a] shadow-[0_4px_12px_rgba(200,80,42,0.12)]'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className="min-w-0">
                    <h4 className={`font-black text-xs ${isSelected ? 'text-[#c8502a]' : 'text-slate-300 group-hover:text-white'}`}>
                      {PROVIDER_NAME_TH[p.id] || p.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 group-hover:text-slate-400">
                      {PROVIDER_DESC_TH[p.id] || p.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c8502a] shadow-[0_0_8px_#c8502a] shrink-0 ml-2" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Voice Configuration Parameters */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />

        <div className="flex items-center gap-2 text-[#c8502a] font-black text-xs uppercase tracking-widest pb-2 border-b border-slate-800">
          <Sliders className="h-4 w-4 text-[#c8502a]" />
          <span>ปรับแต่งเสียง (Fine-tune Speech)</span>
        </div>

        <div className="space-y-4">
          {/* Gender Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">เพศและโทนหลัก</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/60">
              {(['Male', 'Female', 'Neutral'] as const).map((g) => (
                <button
                  key={g}
                  id={`gender-btn-${g}`}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-1.5 px-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                    gender === g
                      ? 'bg-[#c8502a] text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {GENDER_TH[g] || g}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">อารมณ์และน้ำเสียง</label>
            <select
              id="emotion-select"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-3 rounded-xl outline-none focus:border-[#c8502a] transition duration-300 cursor-pointer font-bold"
            >
              {EMOTIONS.map((e) => (
                <option key={e} value={e} className="bg-slate-950 text-slate-300 font-bold">
                  🎭 {EMOTION_TH[e] || e}
                </option>
              ))}
            </select>
          </div>

          {/* Accent Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">สำเนียงภาษา / ภูมิภาค</label>
            <select
              id="accent-select"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-3 rounded-xl outline-none focus:border-[#c8502a] transition duration-300 cursor-pointer font-bold"
            >
              {ACCENTS.map((a) => (
                <option key={a} value={a} className="bg-slate-950 text-slate-300 font-bold">
                  📍 {ACCENT_TH[a] || a}
                </option>
              ))}
            </select>
          </div>

          {/* Style Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">สไตล์ลักษณะการพูด</label>
            <select
              id="style-select"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-3 rounded-xl outline-none focus:border-[#c8502a] transition duration-300 cursor-pointer font-bold"
            >
              {STYLES.map((s) => (
                <option key={s} value={s} className="bg-slate-950 text-slate-300 font-bold">
                  🗣️ {STYLE_TH[s] || s}
                </option>
              ))}
            </select>
          </div>

          {/* Output Format Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">สกุลไฟล์เสียงดาวน์โหลด</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/60">
              {(['mp3', 'm4a', 'wav'] as const).map((f) => (
                <button
                  key={f}
                  id={`format-btn-${f}`}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`py-1.5 px-2.5 text-xs font-bold rounded-lg transition-all duration-300 uppercase ${
                    format === f
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Control Slider */}
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ความเร็วในการพูด (Tempo)</span>
              <span className="font-mono font-black text-[#c8502a] text-[10px] bg-[#c8502a]/10 px-2 py-0.5 rounded-md">{speed}x</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full relative border border-slate-850">
              <input
                id="speed-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.25"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#c8502a] to-orange-500 rounded-full"
                style={{ width: `${((speed - 0.5) / 1.5) * 100}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#c8502a] rounded-full shadow-md z-20 pointer-events-none"
                style={{ left: `calc(${((speed - 0.5) / 1.5) * 100}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 font-mono font-bold">
              <span>ช้าสุด (0.5x)</span>
              <span>ปกติ (1.0x)</span>
              <span>เร็วสุด (2.0x)</span>
            </div>
          </div>

          {/* Pitch Control Segment */}
          <div className="space-y-2.5 pt-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">คีย์โทนเสียงสูงต่ำ (Pitch)</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/60">
              {(['Low', 'Normal', 'High'] as const).map((p) => (
                <button
                  key={p}
                  id={`pitch-btn-${p}`}
                  type="button"
                  onClick={() => setPitch(p)}
                  className={`py-1.5 px-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                    pitch === p
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {PITCH_TH[p] || p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

