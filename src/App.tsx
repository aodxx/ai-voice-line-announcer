import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VoiceConfiguration from './components/VoiceConfiguration';
import AudioPreview from './components/AudioPreview';
import HistoryList from './components/HistoryList';
import ApiSettings from './components/ApiSettings';
import VoiceSelectorList from './components/VoiceSelectorList';
import ApiDeveloperPortal from './components/ApiDeveloperPortal';
import LineBotPortal from './components/LineBotPortal';
import { Voice, HistoryItem, VOICES } from './types';
import { Play, RotateCcw, Sparkles, Mic, Volume2, Info, CheckCircle2, FileText, AlertCircle, RefreshCw } from 'lucide-react';

// Google Drive Integration
import { 
  googleSignIn, 
  logoutGD, 
  initAuth, 
  getAccessToken, 
  listDriveFiles, 
  uploadFileToDrive, 
  deleteDriveFile, 
  fetchDriveFileBlob,
  GDriveFile
} from './lib/gdrive';
import { User } from 'firebase/auth';

export default function App() {
  // App navigation state
  const [activeTab, setActiveTab] = useState<string>('studio');
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  // Input states
  const [text, setText] = useState<string>('');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'elevenlabs'>('gemini');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Kore');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Neutral'>('Female');
  const [emotion, setEmotion] = useState<string>('Normal');
  const [accent, setAccent] = useState<string>('Thai Standard');
  const [style, setStyle] = useState<string>('Narrator');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'wav'>('mp3');

  // API Key Overrides state
  const [geminiKey, setGeminiKey] = useState<string>('');

  // Generation status state
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeMetadata, setActiveMetadata] = useState<HistoryItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History list state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Google Drive Integration States
  const [gdToken, setGdToken] = useState<string | null>(null);
  const [gdUser, setGdUser] = useState<User | null>(null);
  const [driveFiles, setDriveFiles] = useState<GDriveFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Botnoi style credits
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('botnoi_user_credits');
    return saved ? parseInt(saved, 10) : 5000;
  });

  useEffect(() => {
    localStorage.setItem('botnoi_user_credits', credits.toString());
  }, [credits]);

  // Load configuration and history on mount
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') as any;
    if (savedTheme) setTheme(savedTheme);

    // API Key overrides
    const savedGemini = localStorage.getItem('gemini_api_key_override') || '';
    setGeminiKey(savedGemini);

    // Fetch initial history
    fetchHistory();

    // Initialize Google Drive authentication state listener
    const unsubscribe = initAuth((user, token) => {
      setGdUser(user);
      setGdToken(token);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-fetch Drive files when token is retrieved
  useEffect(() => {
    if (gdToken) {
      fetchDriveFiles(gdToken);
    } else {
      setDriveFiles([]);
    }
  }, [gdToken]);

  // Theme apply side effect
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;

    const applyTheme = (currentTheme: 'light' | 'dark') => {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      applyTheme(systemTheme);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  // Fetch history list from express backend
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to load history from backend, falling back to local state:', e);
    }
  };

  // Google Drive Action Helpers
  const fetchDriveFiles = async (token: string) => {
    setIsDriveLoading(true);
    setDriveError(null);
    try {
      const files = await listDriveFiles(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Error in fetchDriveFiles:', err);
      setDriveError(err.message || 'ดึงข้อมูลคลังคลาวด์ล้มเหลว');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGdUser(result.user);
        setGdToken(result.accessToken);
        fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setErrorMsg('เชื่อมต่อ Google Drive ล้มเหลว: ' + (err.message || 'ปฏิเสธการเชื่อมโยง'));
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await logoutGD();
      setGdUser(null);
      setGdToken(null);
      setDriveFiles([]);
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  const handlePlayDriveItem = async (file: GDriveFile) => {
    if (!gdToken) return;
    setLoading(true);
    setProgress(0);
    setProgressText('กำลังดึงสตรีมเสียงจาก Google Drive...');
    try {
      const blob = await fetchDriveFileBlob(gdToken, file.id);
      const objectUrl = URL.createObjectURL(blob);
      setAudioUrl(objectUrl);

      // Create simulated HistoryItem so interface looks cohesive
      const simulatedItem: HistoryItem = {
        id: file.id,
        date: file.createdTime,
        text: file.name,
        fullText: file.name,
        voice: 'คลังคลาวด์',
        gender: 'Neutral',
        emotion: 'Normal',
        accent: 'Google Drive',
        style: 'Cloud Storage',
        speed: 1.0,
        pitch: 'Normal',
        duration: 'Cloud File',
        fileSize: file.size ? file.size : 'Unknown',
        filename: file.name,
        url: objectUrl,
        provider: 'gemini'
      };
      setActiveMetadata(simulatedItem);
      setActiveTab('studio');
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('สตรีมไฟล์ล้มเหลว: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDriveItem = async (fileId: string) => {
    if (!gdToken) return;
    const confirmed = window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์เสียงนี้ออกจาก Google Drive? การดำเนินการนี้ไม่สามารถยกเลิกได้');
    if (!confirmed) return;

    try {
      await deleteDriveFile(gdToken, fileId);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileId));
      
      // Clear active preview if playing the deleted one
      if (activeMetadata && activeMetadata.id === fileId) {
        setAudioUrl(null);
        setActiveMetadata(null);
      }
    } catch (err: any) {
      console.error('Failed to delete drive file:', err);
      setErrorMsg('ลบไฟล์เสียงไม่สำเร็จ: ' + err.message);
    }
  };

  const handleDownloadDriveItem = async (file: GDriveFile) => {
    if (!gdToken) return;
    try {
      const blob = await fetchDriveFileBlob(gdToken, file.id);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Failed to download drive file:', err);
      setErrorMsg('ดาวน์โหลดไฟล์จาก Drive ล้มเหลว: ' + err.message);
    }
  };

  // Generate speech call
  const handleGenerateSpeech = async () => {
    if (!text || text.trim() === '') {
      setErrorMsg('กรุณาพิมพ์หรือระบุข้อความก่อนกดสร้างเสียงสังเคราะห์');
      return;
    }
    if (text.length > 10000) {
      setErrorMsg('ข้อความมีความยาวเกินขีดจำกัดสูงสุด 10,000 ตัวอักษร');
      return;
    }
    if (credits < text.length) {
      setErrorMsg(`พอยท์คงเหลือไม่พอ (ข้อความยาว: ${text.length} ตัวอักษร, พอยท์ของคุณ: ${credits}) กรุณากดเติมพอยท์ฟรีเพื่อใช้งานต่อ`);
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setProgress(0);
    setProgressText('กำลังเชื่อมต่อผู้ให้บริการ API...');

    // Progress bar animation mock
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        // Increment depending on progress phase
        if (prev < 30) {
          setProgressText('กำลังเตรียมโมเดลเสียงสังเคราะห์...');
          return prev + 5;
        } else if (prev < 70) {
          setProgressText('กำลังเรนเดอร์เนื้อหาคลื่นเสียง...');
          return prev + 3;
        } else {
          setProgressText('กำลังสร้างสตรีมไฟล์เสียงความละเอียดสูง...');
          return prev + 1;
        }
      });
    }, 150);

    try {
      const payload = {
        text,
        voice: selectedVoiceId,
        gender,
        emotion,
        accent,
        style,
        speed,
        pitch,
        provider,
        format,
        customGeminiKey: geminiKey || undefined,
      };

      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server returned an error generating speech.');
      }

      const result = await response.json();
      setProgress(100);
      setProgressText('สร้างเสียงสังเคราะห์เสร็จสมบูรณ์!');

      // Deduct credits based on text length
      const textCost = text.length;
      setCredits((prev) => Math.max(0, prev - textCost));

      // Set active preview URL
      setAudioUrl(result.audioUrl);
      setActiveMetadata(result.metadata);

      // Reload saved history
      fetchHistory();

      // Auto-upload to Google Drive if token is active
      if (gdToken) {
        try {
          setProgressText('กำลังบันทึกไฟล์เสียงขึ้น Google Drive...');
          await uploadFileToDrive(gdToken, result.audioUrl, result.metadata.filename);
          setProgressText('บันทึกไปยัง Google Drive เรียบร้อย!');
          // Refresh Google Drive files list so it appears in the Cloud History tab
          fetchDriveFiles(gdToken);
        } catch (driveErr: any) {
          console.error('Failed to auto-upload to Google Drive:', driveErr);
        }
      }

    } catch (err: any) {
      clearInterval(progressInterval);
      setErrorMsg(err.message || 'การสร้างเสียงสังเคราะห์ล้มเหลว กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือข้อมูลของคุณ');
    } finally {
      setLoading(false);
    }
  };

  // Trigger file download helper
  const triggerDownload = async (url: string, desiredFilename: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = desiredFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback
      const link = document.createElement('a');
      link.href = url;
      link.download = desiredFilename;
      link.target = '_blank';
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  // Download custom format by potentially re-generating or querying URL
  const handleDownloadFormat = async (selectedFormat: 'mp3' | 'm4a' | 'wav') => {
    if (!activeMetadata) return;

    // Determine target file path name
    const baseFilename = activeMetadata.filename.split('.')[0];
    const targetFilename = `${baseFilename}.${selectedFormat}`;

    // If they ask for the exact format that was already synthesized, download directly
    if (selectedFormat === format) {
      await triggerDownload(activeMetadata.url, targetFilename);
    } else {
      // Re-generate in the requested format
      setIsDownloading(true);
      try {
        const payload = {
          text: activeMetadata.fullText || text,
          voice: activeMetadata.voice,
          gender: activeMetadata.gender,
          emotion: activeMetadata.emotion,
          accent: activeMetadata.accent,
          style: activeMetadata.style,
          speed: activeMetadata.speed,
          pitch: activeMetadata.pitch,
          provider: activeMetadata.provider,
          format: selectedFormat,
          customGeminiKey: geminiKey || undefined,
        };

        const res = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error('Failed to convert speech formats.');
        }

        const data = await res.json();
        await triggerDownload(data.audioUrl, targetFilename);
        fetchHistory();
      } catch (e) {
        console.error(e);
        // Fallback to downloading existing format
        await triggerDownload(activeMetadata.url, activeMetadata.filename);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  // History Actions
  const handlePlayHistoryItem = (item: HistoryItem) => {
    setAudioUrl(item.url);
    setActiveMetadata(item);
    setActiveTab('studio'); // Direct back to main workspace
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Remove from UI
        setHistory((prev) => prev.filter((h) => h.id !== id));
        // Reset current preview if it was the deleted one
        if (activeMetadata && activeMetadata.id === id) {
          setAudioUrl(null);
          setActiveMetadata(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadHistoryItem = async (item: HistoryItem, selectedFormat: 'mp3' | 'm4a' | 'wav') => {
    const baseFilename = item.filename.split('.')[0];
    const targetFilename = `${baseFilename}.${selectedFormat}`;
    
    // If format matches, download directly
    if (item.filename.endsWith(selectedFormat)) {
      await triggerDownload(item.url, targetFilename);
    } else {
      // Create convert/re-generate request for that item
      setIsDownloading(true);
      try {
        const payload = {
          text: item.fullText || item.text,
          voice: item.voice,
          gender: item.gender,
          emotion: item.emotion,
          accent: item.accent,
          style: item.style,
          speed: item.speed,
          pitch: item.pitch,
          provider: item.provider,
          format: selectedFormat,
          customGeminiKey: geminiKey || undefined,
        };

        const res = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          await triggerDownload(data.audioUrl, targetFilename);
          fetchHistory();
        } else {
          // Fallback
          await triggerDownload(item.url, item.filename);
        }
      } catch (e) {
        console.error(e);
        await triggerDownload(item.url, item.filename);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const selectedVoiceName = VOICES.find((v) => v.id === selectedVoiceId)?.name || 'Nova';
  const selectedProviderName = provider === 'gemini' ? 'Gemini AI' : provider === 'openai' ? 'OpenAI TTS' : 'ElevenLabs';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Dynamic Sidebar Container */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedVoiceName={selectedVoiceName}
        selectedProviderName={selectedProviderName}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar controls */}
        <Header theme={theme} setTheme={setTheme} activeTab={activeTab} />

        {/* Workspace views router */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Column 1: Textpad Script Editor & Audio Player (Wide Column) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* 1. Large Text pad input */}
                <section className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col group hover:border-[#c8502a]/30 transition-all duration-300 min-h-[350px]">
                  <div className="absolute top-0 right-0 h-20 w-20 bg-[#c8502a]/5 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Editor Header badge bar */}
                  <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
                    <div className="flex gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-[#c8502a]/10 border border-[#c8502a]/20 text-[9px] text-[#c8502a] font-black uppercase tracking-wider">THAI</span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-black uppercase tracking-wider">ENGLISH</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      ใช้ไป {text.length.toLocaleString()} / 10,000 ตัวอักษร
                    </span>
                  </div>

                  <textarea
                    id="tts-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="พิมพ์หรือวางบทพูดของคุณที่นี่ (เช่น สวัสดีค่ะ ยินดีต้อนรับเข้าสู่สตูดิโอสร้างเสียงสังเคราะห์ AI ดัดแปลงเสียงแบบมืออาชีพ)..."
                    maxLength={10000}
                    className="flex-1 w-full bg-transparent p-6 text-sm md:text-base leading-relaxed outline-none resize-none placeholder:text-slate-600 text-slate-100 font-semibold"
                  />
                  
                  {/* Validation Warning Alert */}
                  {errorMsg && (
                    <div className="mx-6 mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-400 text-xs animate-pulse">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="font-bold">{errorMsg}</span>
                    </div>
                  )}

                  {/* Textarea Bottom Control Tray */}
                  <div className="p-5 flex justify-between items-center bg-slate-950/80 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        <div className="w-7 h-7 rounded-full border border-slate-950 bg-[#c8502a] flex items-center justify-center text-[9px] font-black text-white uppercase shadow-md">
                          {provider.charAt(0)}
                        </div>
                        <div className="w-7 h-7 rounded-full border border-slate-950 bg-amber-500 flex items-center justify-center text-[9px] font-black text-slate-950">
                          HD
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider hidden sm:inline-block">สตูดิโอพร้อมใช้งาน (Studio Mode)</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        id="reset-text-btn"
                        type="button"
                        onClick={() => setText('')}
                        className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition duration-300 cursor-pointer"
                        title="ล้างข้อความทั้งหมด"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        id="generate-speech-btn"
                        type="button"
                        onClick={handleGenerateSpeech}
                        disabled={loading || text.trim() === ''}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#c8502a] to-orange-500 hover:from-orange-500 hover:to-[#c8502a] rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all text-white disabled:opacity-40 disabled:pointer-events-none text-xs cursor-pointer"
                      >
                        {loading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mic className="h-3.5 w-3.5" />
                        )}
                        <span>{loading ? 'กำลังเรนเดอร์เสียง...' : 'สร้างเสียงสังเคราะห์'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Slider Bar */}
                  {loading && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-2 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#c8502a] font-black flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          {progressText}
                        </span>
                        <span className="font-mono font-black text-amber-500 text-[10px]">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#c8502a] to-orange-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* 2. Custom Audio Preview Section */}
                <AudioPreview
                  audioUrl={audioUrl}
                  metadata={activeMetadata}
                  onDownloadFormat={handleDownloadFormat}
                  isDownloading={isDownloading}
                />
              </div>

              {/* Column 2: Voice selector, Credits balance, and Quick Recent History (Side Column) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                {/* Points Balance Widget */}
                <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl flex items-center justify-between shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c8502a]" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">ยอดพอยท์คงเหลือ (Credits)</span>
                    <span className="text-lg font-black text-amber-500 font-mono block mt-0.5">
                      {credits.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">พอยท์</span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCredits(5000);
                      setErrorMsg(null);
                    }}
                    className="px-3 py-1.5 bg-[#c8502a]/10 border border-[#c8502a]/20 text-[#c8502a] hover:bg-[#c8502a] hover:text-white rounded-xl text-[10px] font-black transition-all cursor-pointer duration-300"
                    title="รีเฟรชแต้มใช้งานฟรี 5,000 พอยท์"
                  >
                    เติมพอยท์ฟรี
                  </button>
                </div>

                {/* Voice Profile List */}
                <VoiceSelectorList
                  provider={provider}
                  selectedVoiceId={selectedVoiceId}
                  setSelectedVoiceId={setSelectedVoiceId}
                  gender={gender}
                  pitch={pitch}
                  speed={speed}
                />

                {/* Recent Tracks History Panel */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col h-[280px]">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                    ประวัติคำสั่งเสียงล่าสุด
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
                    {history.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-[10px] font-bold text-slate-600">ยังไม่มีประวัติในระบบ</p>
                      </div>
                    ) : (
                      history.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          id={`quick-history-item-${item.id}`}
                          onClick={() => handlePlayHistoryItem(item)}
                          className="p-2.5 bg-slate-950/40 hover:bg-[#c8502a]/5 border border-slate-850 hover:border-[#c8502a]/20 rounded-xl flex items-center gap-3 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 group-hover:bg-[#c8502a]/10 border border-slate-800 transition-colors">
                            <Play className="w-3 h-3 text-[#c8502a] group-hover:text-[#c8502a] fill-current" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate text-slate-300 group-hover:text-white">
                              &ldquo;{item.text}&rdquo;
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5 uppercase font-bold">
                              {item.voice} • {item.duration}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeTab === 'voice-settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-3xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 h-16 w-16 bg-[#c8502a]/5 rounded-full blur-xl pointer-events-none" />
                <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                  <span>ปรับแต่งความรู้สึก & คุณสมบัติเสียง</span>
                  <span className="text-[9px] bg-[#c8502a]/10 border border-[#c8502a]/20 text-[#c8502a] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">CONFIG</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ตั้งค่าอารมณ์ สำเนียงภาษา ระดับความเร็ว (Tempo) ระดับคีย์เสียงต่ำสูง (Pitch) และผู้ให้บริการเอนจิ้นเบื้องหลัง เพื่อสร้างเอกลักษณ์เสียงที่เหมาะสมที่สุดสำหรับคุณ
                </p>
              </div>
              
              <VoiceConfiguration
                provider={provider}
                setProvider={(p) => {
                  setProvider(p);
                  // Auto select first voice matching the new provider
                  const firstVoice = VOICES.find((v) => v.provider === p);
                  if (firstVoice) {
                    setSelectedVoiceId(firstVoice.id);
                    setGender(firstVoice.gender);
                  }
                }}
                selectedVoiceId={selectedVoiceId}
                setSelectedVoiceId={setSelectedVoiceId}
                gender={gender}
                setGender={setGender}
                emotion={emotion}
                setEmotion={setEmotion}
                accent={accent}
                setAccent={setAccent}
                style={style}
                setStyle={setStyle}
                speed={speed}
                setSpeed={setSpeed}
                pitch={pitch}
                setPitch={setPitch}
                format={format}
                setFormat={setFormat}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">ประวัติการบันทึกเสียงสังเคราะห์</h3>
                  <p className="text-xs text-slate-400 mt-1">เปิดฟังซ้ำ ดาวน์โหลดไฟล์ต้นฉบับ หรือลบประวัติงานสังเคราะห์เสียงของคุณได้ทันที</p>
                </div>
                <button
                  id="reload-history-btn"
                  onClick={fetchHistory}
                  className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition duration-300"
                  title="โหลดประวัติใหม่"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <HistoryList
                history={history}
                onPlayItem={handlePlayHistoryItem}
                onDeleteItem={handleDeleteHistoryItem}
                onDownloadItem={handleDownloadHistoryItem}
                driveFiles={driveFiles}
                isDriveLoading={isDriveLoading}
                driveError={driveError}
                driveToken={gdToken}
                gdUser={gdUser}
                onPlayDriveItem={handlePlayDriveItem}
                onDeleteDriveItem={handleDeleteDriveItem}
                onDownloadDriveItem={handleDownloadDriveItem}
                onConnectDrive={handleConnectDrive}
                onDisconnectDrive={handleDisconnectDrive}
                onRefreshDrive={() => gdToken && fetchDriveFiles(gdToken)}
              />
            </div>
          )}

          {activeTab === 'line-bot' && (
            <LineBotPortal />
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <ApiSettings
                geminiKey={geminiKey}
                setGeminiKey={setGeminiKey}
              />
            </div>
          )}

          {activeTab === 'api-docs' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-3xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 h-16 w-16 bg-[#c8502a]/5 rounded-full blur-xl pointer-events-none" />
                <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                  <span>เชื่อมต่อ API ภายนอก (Developer API Hub)</span>
                  <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">LIVE</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  เชื่อมโยงเอนจิ้นสร้างเสียงสังเคราะห์ของระบบนี้เข้ากับแอปพลิเคชันของคุณ เว็บไซต์ หรือระบบอัตโนมัติภายนอกได้อย่างสะดวกสบายด้วยมาตรฐาน REST API
                </p>
              </div>
              <ApiDeveloperPortal />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
