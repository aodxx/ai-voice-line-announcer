import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, Download, FileText, Calendar, HardDrive, Clock, Headphones, RefreshCw } from 'lucide-react';
import { HistoryItem } from '../types';

interface AudioPreviewProps {
  audioUrl: string | null;
  metadata: HistoryItem | null;
  onDownloadFormat: (format: 'mp3' | 'm4a' | 'wav') => void;
  isDownloading: boolean;
}

export default function AudioPreview({ audioUrl, metadata, onDownloadFormat, isDownloading }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset states on audioUrl change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
    setIsPlaying(!isPlaying);
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  if (!audioUrl || !metadata) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl text-center space-y-3 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 h-16 w-16 bg-[#c8502a]/5 rounded-full blur-xl pointer-events-none" />
        <Headphones className="h-10 w-10 text-slate-600 mx-auto animate-bounce" />
        <h4 className="text-sm font-semibold text-slate-400">ระบบคลังเสียงและทดลองฟังเสียงสังเคราะห์</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          เลือกตัวละครเสียง พิมพ์สคริปต์ที่ต้องการ แล้วกดปุ่ม <span className="text-[#c8502a] font-bold">&quot;สร้างเสียงสังเคราะห์&quot;</span> ด้านบน เพื่อฟังและดาวน์โหลดไฟล์เสียงมาสเตอร์ที่นี่
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
      {/* Soundwave Glowing Deco */}
      <div className="absolute top-0 right-0 h-32 w-32 bg-[#c8502a]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#c8502a]/10 rounded-xl flex items-center justify-center text-[#c8502a] border border-[#c8502a]/20">
            <Headphones className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#c8502a] tracking-wider uppercase block">เครื่องควบคุมการเล่นเสียง (Audio Workspace)</span>
            <span className="text-xs font-black text-slate-200 truncate block max-w-[240px] mt-0.5">{metadata.filename}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#c8502a]/10 border border-[#c8502a]/20 text-[9px] text-[#c8502a] font-black tracking-wider uppercase">
            {metadata.provider === 'gemini' ? 'Gemini AI' : metadata.provider === 'openai' ? 'OpenAI' : 'ElevenLabs'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-black tracking-wider uppercase">
            {metadata.voice}
          </span>
        </div>
      </div>

      {/* Hidden Native Audio */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          const errCode = e.currentTarget?.error?.code;
          const errMsg = e.currentTarget?.error?.message;
          console.warn('Audio element failed to load or decode source:', audioUrl, { code: errCode, message: errMsg });
        }}
      />

      {/* Main Player UI Controls */}
      <div className="flex flex-col md:flex-row items-center gap-5">
        {/* Play/Pause round button */}
        <button
          id="audio-play-pause-btn"
          onClick={togglePlay}
          className="w-14 h-14 bg-gradient-to-r from-[#c8502a] to-orange-500 hover:from-orange-500 hover:to-[#c8502a] rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all duration-300 active:scale-95 text-white"
          title={isPlaying ? 'หยุดชั่วคราว' : 'เล่น'}
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
        </button>

        <button
          id="audio-stop-btn"
          onClick={stopAudio}
          className="p-3 bg-slate-950/60 hover:bg-slate-950 rounded-2xl text-slate-400 border border-slate-800 transition-all"
          title="หยุดเล่น"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>

        {/* Duration bar and Seek slider */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ความก้าวหน้าเสียงเล่น</span>
            <span className="text-xs font-mono font-black text-[#c8502a]">
              {formatTime(currentTime)} / {formatTime(duration || 12)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full relative overflow-hidden border border-slate-850">
            <input
              id="audio-seekbar"
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#c8502a] to-orange-500 rounded-full"
              style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}
            />
          </div>
        </div>

        {/* Sound Wave Animation Visualizer */}
        <div className="hidden md:flex items-end gap-1 h-7">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-[#c8502a]/80 transition-all duration-300 ${
                isPlaying ? 'animate-pulse' : 'h-1'
              }`}
              style={{
                height: isPlaying ? `${Math.max(4, Math.random() * 28)}px` : '4px',
                animationDelay: `${i * 90}ms`,
                animationDuration: '500ms'
              }}
            />
          ))}
        </div>
      </div>

      {/* Metadata Metrics Bento Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800 text-center sm:text-left">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">ความยาวเสียง</span>
          <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{formatTime(duration) || metadata.duration}</p>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800 text-center sm:text-left">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">ขนาดไฟล์</span>
          <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{metadata.fileSize || '0.2 MB'}</p>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800 text-center sm:text-left">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">สปีด / พิช</span>
          <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{metadata.speed}x • {metadata.pitch === 'Low' ? 'ต่ำ' : metadata.pitch === 'High' ? 'สูง' : 'ปกติ'}</p>
        </div>
      </div>

      {/* 6. Dynamic Download Formats Section */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ดาวน์โหลดไฟล์เสียงมาสเตอร์ (Download Audio Master)</h4>
        <div className="grid grid-cols-3 gap-2">
          {(['mp3', 'm4a', 'wav'] as const).map((f) => (
            <button
              key={f}
              id={`download-${f}-btn`}
              onClick={() => onDownloadFormat(f)}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-2xl bg-slate-950/60 hover:bg-[#c8502a]/10 hover:text-[#c8502a] text-slate-200 border border-slate-800 hover:border-[#c8502a]/20 transition-all duration-300 disabled:opacity-40 text-xs font-bold"
            >
              {isDownloading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#c8502a]" />
              ) : (
                <Download className="h-3.5 w-3.5 text-[#c8502a]" />
              )}
              <span className="uppercase">{f}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
