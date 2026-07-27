import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { GDriveFile } from '../lib/gdrive';
import { 
  Play, 
  Trash2, 
  Download, 
  Volume2, 
  Sparkles, 
  Calendar, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  Cloud, 
  CloudOff, 
  CloudLightning, 
  LogIn, 
  LogOut, 
  Loader2, 
  FolderClosed, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface HistoryListProps {
  history: HistoryItem[];
  onPlayItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onDownloadItem: (item: HistoryItem, format: 'mp3' | 'm4a' | 'wav') => void;
  
  // Google Drive integrations
  driveFiles: GDriveFile[];
  isDriveLoading: boolean;
  driveError: string | null;
  driveToken: string | null;
  gdUser: any | null;
  onPlayDriveItem: (file: GDriveFile) => void;
  onDeleteDriveItem: (fileId: string) => void;
  onDownloadDriveItem: (file: GDriveFile) => void;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onRefreshDrive: () => void;
}

const EMOTION_TH: Record<string, string> = {
  'Normal': 'ปกติ / ทั่วไป',
  'Happy': 'มีความสุข / ร่าเริง',
  'Sad': 'เศร้า / ซาบซึ้ง',
  'Excited': 'ตื่นเต้น / มีพลัง',
  'Angry': 'โกรธ / ดุดัน',
  'Calm': 'สงบ / ผ่อนคลาย',
  'Friendly': 'เป็นกันเอง / อบอุ่น',
  'Professional': 'เป็นทางการ / มืออาชีพ',
  'Storytelling': 'เล่าเรื่อง / นิยาย'
};

const ACCENT_TH: Record<string, string> = {
  'Thai Standard': 'ภาษาไทยมาตรฐาน (กลาง)',
  'Southern Thai': 'ภาษาไทยสำเนียงใต้',
  'Northern Thai': 'ภาษาไทยสำเนียงเหนือ',
  'Isan Thai': 'ภาษาไทยสำเนียงอีสาน',
  'English US': 'ภาษาอังกฤษ (สหรัฐอเมริกา)',
  'English UK': 'ภาษาอังกฤษ (สหราชอาณาจักร)',
  'Australian English': 'ภาษาอังกฤษ (ออสเตรเลีย)',
  'Singapore English': 'ภาษาอังกฤษ (สิงคโปร์)'
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

const PITCH_TH: Record<string, string> = {
  'Low': 'ต่ำ',
  'Normal': 'ปกติ',
  'High': 'สูง'
};

// Helper to format bytes
function formatBytes(bytes: number | string | undefined): string {
  if (bytes === undefined) return 'ไม่ทราบขนาด';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num)) return 'ไม่ทราบขนาด';
  if (num === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function HistoryList({ 
  history, 
  onPlayItem, 
  onDeleteItem, 
  onDownloadItem,
  driveFiles,
  isDriveLoading,
  driveError,
  driveToken,
  gdUser,
  onPlayDriveItem,
  onDeleteDriveItem,
  onDownloadDriveItem,
  onConnectDrive,
  onDisconnectDrive,
  onRefreshDrive
}: HistoryListProps) {
  const [subTab, setSubTab] = useState<'local' | 'gdrive'>('local');
  
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'openai':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'elevenlabs':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-5">
      {/* Dynamic Sub-Tab Switcher for Local vs Google Drive Cloud Storage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex bg-slate-950/60 p-1 rounded-2xl border border-slate-800 self-start">
          <button
            onClick={() => setSubTab('local')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'local'
                ? 'bg-[#c8502a] text-white shadow-md shadow-[#c8502a]/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>ประวัติเครื่องนี้ ({history.length})</span>
          </button>
          
          <button
            onClick={() => setSubTab('gdrive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'gdrive'
                ? 'bg-[#c8502a] text-white shadow-md shadow-[#c8502a]/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="h-3.5 w-3.5" />
            <span>คลังคลาวด์ Google Drive {driveToken && `(${driveFiles.length})`}</span>
          </button>
        </div>

        {/* Sync status info for Google Drive */}
        {subTab === 'gdrive' && driveToken && gdUser && (
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">เชื่อมต่อแล้วโดย</span>
              <span className="text-xs font-bold text-[#c8502a] block">{gdUser.email}</span>
            </div>
            
            <button
              onClick={onRefreshDrive}
              disabled={isDriveLoading}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-40 cursor-pointer transition"
              title="ดึงข้อมูลล่าสุด"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isDriveLoading ? 'animate-spin text-[#c8502a]' : ''}`} />
            </button>

            <button
              onClick={onDisconnectDrive}
              className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white text-red-400 transition cursor-pointer"
              title="ยกเลิกการเชื่อมต่อ Drive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Render Local Device History */}
      {subTab === 'local' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-800/40 rounded-3xl p-8 bg-slate-900/10 backdrop-blur-md">
              <Volume2 className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-bounce" />
              <h3 className="font-bold text-slate-400 text-base">ประวัติการสร้างเสียงว่างเปล่า</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2">
                เมื่อคุณสร้างไฟล์เสียงสังเคราะห์จากหน้าสตูดิโอ ประวัติและเสียงของคุณจะถูกบันทึกไว้ที่นี่เพื่อเล่นซ้ำหรือดาวน์โหลดได้ทันที
              </p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  id={`history-item-${item.id}`}
                  className="group bg-slate-900 border border-slate-800/80 p-4 rounded-3xl transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xl hover:border-[#c8502a]/20"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Play Button */}
                    <button
                      id={`play-history-${item.id}`}
                      onClick={() => onPlayItem(item)}
                      className="p-3.5 rounded-2xl bg-[#c8502a]/10 text-[#c8502a] border border-[#c8502a]/20 hover:bg-gradient-to-r hover:from-[#c8502a] hover:to-orange-500 hover:text-white hover:border-transparent transition-all duration-300 self-center shadow-md active:scale-95 cursor-pointer"
                      title="เล่นเสียงสังเคราะห์"
                    >
                      <Play className="h-4.5 w-4.5 fill-current" />
                    </button>

                    {/* Info Metadata */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-200 line-clamp-1">
                          {item.voice}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 rounded-md text-slate-400 font-bold">
                          {item.duration}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 border rounded-full uppercase tracking-wide ${getProviderColor(item.provider)}`}>
                          {item.provider === 'gemini' ? 'Gemini AI' : item.provider === 'openai' ? 'OpenAI' : 'ElevenLabs'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 font-bold">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-bold bg-slate-950/40 p-2.5 rounded-2xl line-clamp-2 leading-relaxed border border-slate-850">
                        &ldquo;{item.fullText || item.text}&rdquo;
                      </p>

                      {/* Settings Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <span className="text-[10px] bg-[#c8502a]/10 text-[#c8502a] px-2.5 py-0.5 rounded-full font-black">
                          🎭 {EMOTION_TH[item.emotion] || item.emotion}
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full font-black">
                          🗣️ {STYLE_TH[item.style] || item.style}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                          📍 {ACCENT_TH[item.accent] || item.accent}
                        </span>
                        <span className="text-[10px] bg-slate-850 text-slate-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          {item.speed}x / {PITCH_TH[item.pitch] || item.pitch}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for download and delete */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end md:justify-start border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                    <div className="flex gap-1.5">
                      {(['mp3', 'm4a', 'wav'] as const).map((ext) => (
                        <button
                          key={ext}
                          id={`download-history-${item.id}-${ext}`}
                          onClick={() => onDownloadItem(item, ext)}
                          className="px-2.5 py-1.5 text-[10px] font-black uppercase rounded-xl bg-slate-950/60 text-slate-400 hover:text-[#c8502a] hover:bg-[#c8502a]/10 border border-slate-800 hover:border-[#c8502a]/20 transition-all duration-300 cursor-pointer"
                          title={`ดาวน์โหลดเป็นไฟล์ ${ext.toUpperCase()}`}
                        >
                          {ext}
                        </button>
                      ))}
                    </div>

                    <button
                      id={`delete-history-${item.id}`}
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all duration-300 ml-2 cursor-pointer"
                      title="ลบไฟล์ประวัตินี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render Google Drive Cloud History */}
      {subTab === 'gdrive' && (
        <div className="space-y-4">
          {!driveToken ? (
            /* Call to Action: Sign in with Google Drive */
            <div className="text-center py-16 border-2 border-dashed border-slate-800/40 rounded-3xl p-8 bg-slate-900/10 backdrop-blur-md">
              <Cloud className="h-12 w-12 text-[#c8502a]/80 mx-auto mb-4 animate-pulse" />
              <h3 className="font-bold text-slate-200 text-base">เข้าสู่ระบบเพื่อเข้าถึง Google Drive</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                เชื่อมโยงบัญชี Google ของคุณเพื่ออัปโหลดไฟล์เสียงทั้งหมดไปยังโฟลเดอร์ส่วนตัวโดยอัตโนมัติ และเข้าถึงคลังเสียงของคุณได้จากทุกอุปกรณ์อย่างไร้ขีดจำกัด
              </p>
              
              <div className="mt-6 flex flex-col items-center justify-center gap-3">
                <button
                  onClick={onConnectDrive}
                  className="flex items-center gap-2.5 px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl text-xs font-black shadow-lg transition duration-300 cursor-pointer active:scale-95"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.28-.19-.57-.27-.87z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>เชื่อมต่อกับ Google Drive</span>
                </button>
                
                <p className="text-[10px] text-slate-500">
                  ไฟล์ทั้งหมดจะถูกบันทึกในโฟลเดอร์ของระบบโดยตรง
                </p>
              </div>
            </div>
          ) : isDriveLoading ? (
            /* Loading State */
            <div className="text-center py-20 bg-slate-900/10 border border-slate-800/60 rounded-3xl backdrop-blur-md">
              <Loader2 className="h-8 w-8 text-[#c8502a] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-bold">กำลังเชื่อมข้อมูลและสแกนโฟลเดอร์ Google Drive...</p>
            </div>
          ) : driveError ? (
            /* Error State */
            <div className="text-center py-16 bg-slate-900/20 border border-red-900/20 rounded-3xl p-8 backdrop-blur-md">
              <CloudLightning className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-300">ไม่สามารถเชื่อมต่อไฟล์คลาวด์ได้</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                {driveError || 'เกิดข้อผิดพลาดด้านเครือข่าย โปรดลองอัปเดตสิทธิ์เชื่อมต่อใหม่อีกครั้ง'}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={onRefreshDrive}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold rounded-xl text-slate-300 cursor-pointer"
                >
                  ลองใหม่อีกครั้ง
                </button>
                <button
                  onClick={onDisconnectDrive}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-xs font-bold rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition cursor-pointer"
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>
          ) : driveFiles.length === 0 ? (
            /* Empty Storage State */
            <div className="text-center py-16 border-2 border-dashed border-slate-800/40 rounded-3xl p-8 bg-slate-900/10 backdrop-blur-md">
              <FolderClosed className="h-12 w-12 text-[#c8502a]/60 mx-auto mb-4" />
              <h3 className="font-bold text-slate-200 text-base">ไม่พบไฟล์เสียงสังเคราะห์ใน Google Drive</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                คุณยังไม่มีเสียงสังเคราะห์บันทึกไว้ในโฟลเดอร์คลาวด์ส่วนตัว <br />
                <span className="text-[#c8502a] font-bold">โฟลเดอร์ที่ตั้งไว้: 1iIhfp12UV5loA6C3FQyQPv0z0gbbTLzI</span>
              </p>
              
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a 
                  href="https://drive.google.com/drive/folders/1iIhfp12UV5loA6C3FQyQPv0z0gbbTLzI"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold"
                >
                  <span>เปิดดูบน Google Drive Web</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                
                <button
                  onClick={onRefreshDrive}
                  className="px-4 py-2 bg-[#c8502a] text-white rounded-xl text-xs font-black shadow"
                >
                  รีเฟรชอัปเดตไฟล์
                </button>
              </div>
            </div>
          ) : (
            /* Drive Files Listing */
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-slate-950/20 border border-slate-850 p-3.5 rounded-2xl text-xs text-slate-400">
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>กำลังซิงค์ไฟล์เรียลไทม์กับโฟลเดอร์ของระบบคลาวด์</span>
                </span>
                <a 
                  href="https://drive.google.com/drive/folders/1iIhfp12UV5loA6C3FQyQPv0z0gbbTLzI"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#c8502a] hover:underline font-bold flex items-center gap-1 text-[11px]"
                >
                  <span>ลิงก์โฟลเดอร์</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="grid gap-3">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    id={`drive-file-item-${file.id}`}
                    className="group bg-slate-900 border border-slate-800/80 p-4 rounded-3xl transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xl hover:border-orange-500/20"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Play Button */}
                      <button
                        onClick={() => onPlayDriveItem(file)}
                        className="p-3.5 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-gradient-to-r hover:from-[#c8502a] hover:to-orange-500 hover:text-white hover:border-transparent transition-all duration-300 self-center shadow-md active:scale-95 cursor-pointer"
                        title="ดึงไฟล์เล่นเสียงแบบสด"
                      >
                        <Play className="h-4.5 w-4.5 fill-current" />
                      </button>

                      {/* Info Metadata */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-100 truncate group-hover:text-white" title={file.name}>
                          {file.name}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 font-mono font-bold text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatBytes(file.size)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono font-bold">
                            <Calendar className="h-3 w-3" />
                            {new Date(file.createdTime).toLocaleString('th-TH', { 
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span>•</span>
                          <span className="text-orange-400 font-black uppercase tracking-wider bg-orange-500/5 border border-orange-500/10 px-2 py-0.5 rounded-md">
                            Google Drive Cloud
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end md:justify-start border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                      <button
                        onClick={() => onDownloadDriveItem(file)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-slate-950/60 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 border border-slate-800 hover:border-orange-500/20 transition-all duration-300 cursor-pointer"
                        title="ดาวน์โหลดไฟล์เสียงจาก Cloud"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>ดาวน์โหลด</span>
                      </button>

                      <button
                        onClick={() => onDeleteDriveItem(file.id)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all duration-300 cursor-pointer"
                        title="ลบออกจาก Google Drive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
