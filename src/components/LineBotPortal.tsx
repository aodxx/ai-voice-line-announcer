import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  Play, 
  Key, 
  ShieldCheck, 
  Sparkles, 
  Volume2, 
  Bot, 
  ExternalLink, 
  Info, 
  AlertCircle,
  Radio,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface LineLog {
  id: string;
  timestamp: string;
  sourceType: string;
  sourceId: string;
  senderName: string;
  rawText: string;
  newsContent: string;
  refinedText: string;
  audioUrl: string;
  status: string;
}

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  hasChannelAccessToken?: boolean;
  hasChannelSecret?: boolean;
  defaultVoice: string;
  enabled: boolean;
}

export default function LineBotPortal() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('line_admin_api_key') || '');
  const [config, setConfig] = useState<LineConfig>({
    channelAccessToken: '',
    channelSecret: '',
    defaultVoice: 'Kore',
    enabled: true,
  });

  const [logs, setLogs] = useState<LineLog[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Token Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ valid: boolean; botInfo?: any; error?: string } | null>(null);

  // Simulator State
  const [simText, setSimText] = useState('@แจ้งข่าว พรุ่งนี้มีการประชุมสมาคมประจำปี เวลา 10:00 น. ขอเชิญสมาชิกทุกท่านเข้าร่วม ณ ห้องประชุมใหญ่');
  const [simSender, setSimSender] = useState('ประธานชมรม');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const webhookUrl = `${window.location.origin}/api/line/webhook`;

  useEffect(() => {
    if (adminKey) {
      fetchConfig();
      fetchLogs();
    }
  }, [adminKey]);

  const adminHeaders = (json = false): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-admin-key': adminKey,
  });

  const saveAdminKey = () => {
    localStorage.setItem('line_admin_api_key', adminKey.trim());
    setAdminKey(adminKey.trim());
    fetchConfig();
    fetchLogs();
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/line/config', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load LINE config:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/line/logs', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load LINE logs:', err);
    }
  };

  const handleVerifyToken = async () => {
    if (!config.channelAccessToken && !config.hasChannelAccessToken) {
      setVerifyStatus({ valid: false, error: 'กรุณากรอก Channel Access Token ก่อนกดตรวจสอบ' });
      return;
    }
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/line/verify-token', {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({ token: config.channelAccessToken }),
      });
      const data = await res.json();
      setVerifyStatus(data);
    } catch (err: any) {
      setVerifyStatus({ valid: false, error: err.message || 'การตรวจสอบการเชื่อมต่อล้มเหลว' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/line/config', {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save LINE config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleRunSimulator = async () => {
    if (!simText.trim()) return;
    setIsSimulating(true);
    setSimError(null);
    setSimResult(null);

    try {
      const res = await fetch('/api/line/test', {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({
          rawText: simText,
          senderName: simSender,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSimResult(data);
        fetchLogs();
      } else {
        setSimError(data.error || 'การทดสอบประมวลผลล้มเหลว');
      }
    } catch (err: any) {
      setSimError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/line/logs', { method: 'DELETE', headers: adminHeaders() });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner */}
      <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl relative overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>ระบบดักจับและกระจายข่าว LINE Bot (Automated News Announcer)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
              เมื่อมีคนพิมพ์คำว่า <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">@แจ้งข่าว [เนื้อหาข่าว]</code> ในกลุ่ม LINE ระบบจะดักจับข้อความโดยอัตโนมัติ ส่งให้ <strong className="text-white">Gemini AI</strong> ขัดเกลาคำพูดเป็นภาษาผู้ประกาศข่าวภาษาไทย แล้วแปลงเป็น <strong className="text-white">เสียงพากย์ (.M4A)</strong> พร้อมส่งกลับเข้ากลุ่ม LINE ในรูปแบบการ์ดข่าวสารทันที!
            </p>
          </div>

          <button
            onClick={handleCopyWebhook}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-lg"
          >
            {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
            <span>{copiedUrl ? 'คัดลอก Webhook URL แล้ว' : 'คัดลอก Webhook URL'}</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Admin API Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="ใส่ ADMIN_API_KEY ที่ตั้งไว้ใน Cloud Run Secret Manager"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
            />
          </div>
          <button
            type="button"
            onClick={saveAdminKey}
            disabled={!adminKey.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-2xl text-xs font-bold text-white"
          >
            เชื่อมต่อหน้าผู้ดูแล
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          ระบบจัดเก็บกุญแจนี้เฉพาะในเบราว์เซอร์เครื่องปัจจุบัน และ Backend จะไม่ส่ง LINE Token หรือ Channel Secret กลับมายังหน้าเว็บ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings & Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Webhook Endpoint Info Box */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Radio className="h-4 w-4 text-[#c8502a]" />
              <span>Webhook Endpoint Address</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-emerald-400 truncate select-all">{webhookUrl}</span>
              <button
                onClick={handleCopyWebhook}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                title="คัดลอก URL"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              คัดลอก URL ด้านบนนี้ไปวางใส่ในช่อง <strong className="text-slate-200">Webhook URL</strong> บน <a href="https://developers.line.me/" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-1">LINE Developers Console <ExternalLink className="h-3 w-3" /></a> แล้วอย่าลืมเปิดปุ่ม <strong className="text-slate-200">Use webhook</strong>
            </p>
          </div>

          {/* Config Form */}
          <form onSubmit={handleSaveConfig} className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" />
                <span>ตั้งค่า LINE Messaging API Tokens</span>
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400">
                    Channel Access Token (Long-Lived)
                  </label>
                  <button
                    type="button"
                    onClick={handleVerifyToken}
                    disabled={isVerifying || (!config.channelAccessToken && !config.hasChannelAccessToken)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
                  >
                    {isVerifying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                    <span>{isVerifying ? 'กำลังตรวจสอบ...' : 'ทดสอบ Token กับ LINE'}</span>
                  </button>
                </div>
                <input
                  type="password"
                  value={config.channelAccessToken}
                  onChange={(e) => setConfig({ ...config, channelAccessToken: e.target.value })}
                  placeholder={config.hasChannelAccessToken ? 'ตั้งค่า Token ใน Cloud Run Secret Manager แล้ว' : 'วาง Channel Access Token สำหรับโหมดพัฒนา...'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
                />
              </div>

              {/* Verify Token Status Feedback Box */}
              {verifyStatus && (
                <div
                  className={`p-3.5 rounded-2xl text-xs border ${
                    verifyStatus.valid
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {verifyStatus.valid ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>เชื่อมต่อกับบัญชี LINE Bot สำเร็จ!</span>
                      </div>
                      {verifyStatus.botInfo && (
                        <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 font-mono">
                          <p>ชื่อบอท: <strong className="text-white">{verifyStatus.botInfo.displayName}</strong></p>
                          <p>Basic ID: <strong className="text-emerald-400">{verifyStatus.botInfo.basicId}</strong></p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-300">Channel Access Token ไม่ถูกต้อง</p>
                        <p className="text-[11px] text-rose-200/80 mt-0.5">{verifyStatus.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Channel Secret
                </label>
                <input
                  type="password"
                  value={config.channelSecret}
                  onChange={(e) => setConfig({ ...config, channelSecret: e.target.value })}
                  placeholder={config.hasChannelSecret ? 'ตั้งค่า Secret ใน Cloud Run Secret Manager แล้ว' : 'วาง Channel Secret สำหรับโหมดพัฒนา...'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  เสียงพากย์เริ่มต้นสำหรับ LINE Bot (Default Voice)
                </label>
                <select
                  value={config.defaultVoice}
                  onChange={(e) => setConfig({ ...config, defaultVoice: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none transition"
                >
                  <option value="Kore">Kore (เสียงผู้หญิง - ผู้ประกาศข่าวมาตรฐาน)</option>
                  <option value="Puck">Puck (เสียงผู้ชาย - นุ่มนวลน่าฟัง)</option>
                  <option value="Charon">Charon (เสียงผู้ชาย - ทุ้มหนักแน่น)</option>
                  <option value="Fenrir">Fenrir (เสียงผู้ชาย - สดใสกระปรี้กระเปร่า)</option>
                  <option value="Aoede">Aoede (เสียงผู้หญิง - นุ่มนวลนุ่มนวล)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-teal-500 hover:to-emerald-600 rounded-2xl font-bold text-xs text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-white" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span>{isSaving ? 'กำลังบันทึก...' : saveSuccess ? 'บันทึกการตั้งค่าเรียบร้อย!' : 'บันทึกการตั้งค่า LINE Bot'}</span>
            </button>
          </form>

          {/* Quick Setup Instructions & Crucial Settings Checklist */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span>ทำไมพิมพ์ใน LINE แล้วบอทไม่ตอบ? (3 จุดสำคัญที่ต้องเช็คใน LINE)</span>
            </h4>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>เปิด "Use Webhook" ใน LINE Developers Console</span>
                </p>
                <p className="text-[11px] text-slate-400 pl-6">
                  เข้าที่แท็บ <strong className="text-white">Messaging API</strong> &rarr; ช่อง <strong className="text-white">Webhook URL</strong> ต้องเปิดสวิตช์ <strong className="text-emerald-400">Use webhook (เปิด)</strong> และกดปุ่ม <strong className="text-white">Verify</strong> จนขึ้น Success
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>ปิด "ข้อความตอบกลับอัตโนมัติ" (Auto-response messages)</span>
                </p>
                <p className="text-[11px] text-slate-400 pl-6">
                  เข้าหน้า <a href="https://manager.line.biz/" target="_blank" rel="noreferrer" className="text-emerald-400 underline">LINE Official Account Manager</a> &rarr; ตั้งค่าตอบรับ (Response Settings) &rarr; แนะนำให้ <strong className="text-rose-400">ปิด "ข้อความตอบกลับอัตโนมัติ" (Off)</strong> เพื่อไม่ให้สมาชิกได้รับคำตอบซ้ำ ทั้งนี้การเปิดข้อความตอบกลับอัตโนมัติไม่ได้ปิดกั้น Webhook
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">3</span>
                  <span>เปิด "อนุญาตให้เข้าร่วมกลุ่มแชท" (Allow join groups)</span>
                </p>
                <p className="text-[11px] text-slate-400 pl-6">
                  เข้าหน้า <strong className="text-white">LINE Official Account Manager</strong> &rarr; ตั้งค่าบัญชี (Account settings) &rarr; การเข้าร่วมกลุ่ม (Group and multi-person chats) &rarr; เลือก <strong className="text-emerald-400">"อนุญาตให้เข้าร่วมกลุ่มแชท" (Allow)</strong>
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-black">4</span>
                  <span>วิธีดูว่า LINE ส่งข้อมูลมาหาเว็บเราหรือยัง</span>
                </p>
                <p className="text-[11px] text-slate-400 pl-6">
                  ลองมองที่กล่อง <strong className="text-emerald-400">"ประวัติการรับ Webhook (Activity Logs)"</strong> ด้านขวามือ หากไม่มีรายการขึ้นเลย แสดงว่า LINE ยังไม่ได้ส่ง HTTP Post มาที่ URL เว็บนี้ (ให้เช็คข้อ 1-3)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Test Simulator & Live Event Logs */}
        <div className="lg:col-span-7 space-y-6">
          {/* LINE Bot Simulator / Playground */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#c8502a]/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#c8502a]" />
                <span>ระบบทดสอบประมวลผล (LINE Bot Simulator)</span>
              </h3>
              <span className="text-[10px] bg-[#c8502a]/10 text-[#c8502a] border border-[#c8502a]/20 px-2 py-0.5 rounded-md font-bold">
                TEST WITHOUT LINE
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  ข้อความตัวอย่างที่รับจาก LINE (ต้องมีคำว่า @แจ้งข่าว)
                </label>
                <textarea
                  rows={3}
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="พิมพ์ข้อความ เช่น @แจ้งข่าว วันนี้มีงานสัมมนาเวลา 14:00 น..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#c8502a] rounded-2xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none transition leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  ชื่อผู้แจ้งข่าวสาร (Sender Name)
                </label>
                <input
                  type="text"
                  value={simSender}
                  onChange={(e) => setSimSender(e.target.value)}
                  placeholder="เช่น ประธานชมรม, แอดมินกลุ่ม"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#c8502a] rounded-2xl px-4 py-2 text-xs text-white focus:outline-none transition"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={isSimulating || !simText.trim()}
                className="w-full py-3 bg-gradient-to-r from-[#c8502a] to-orange-500 hover:from-orange-500 hover:to-[#c8502a] rounded-2xl font-black text-xs text-white shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isSimulating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isSimulating ? 'กำลังให้ Gemini ขัดเกลาคำพูดและสร้างเสียง...' : 'ทดสอบประมวลผล (Gemini + Voice TTS)'}</span>
              </button>
            </div>

            {/* Error state */}
            {simError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{simError}</span>
              </div>
            )}

            {/* Simulation Result Preview */}
            {simResult && (
              <div className="space-y-4 pt-3 border-t border-slate-800 animate-fadeIn">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>ผลลัพธ์การประมวลผลสำเร็จ (Simulated LINE Response):</span>
                </h4>

                {/* Gemini Refined Output Card */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">ข้อความที่ Gemini AI ขัดเกลาคำพูด:</p>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    &ldquo;{simResult.refinedText}&rdquo;
                  </p>
                </div>

                {/* Audio Output Player */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>เสียงสังเคราะห์จาก AI Voice Studio (.M4A):</span>
                  </p>
                  <audio src={simResult.audioUrl} controls className="w-full h-10 rounded-xl bg-slate-900" />
                </div>

                {/* Visual LINE Flex Message Mockup */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">ตัวอย่างการ์ดข่าวสารบน LINE (LINE Flex Card):</p>
                  
                  <div className="max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-[#c8502a] p-3 text-white">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <span>📢 ประกาศข่าวสารสำคัญ</span>
                      </p>
                      <p className="text-[10px] text-orange-100 mt-0.5">ผู้แจ้งข่าว: {simResult.senderName}</p>
                    </div>

                    <div className="p-3.5 space-y-2 bg-slate-900 text-slate-200">
                      <p className="text-[9px] font-bold text-orange-400">ข้อความเรียบเรียงโดย Gemini AI:</p>
                      <p className="text-xs leading-relaxed font-medium">{simResult.refinedText}</p>
                      
                      <div className="pt-2 border-t border-slate-800">
                        <p className="text-[9px] font-bold text-slate-500">ข้อความดั้งเดิม:</p>
                        <p className="text-[11px] text-slate-400">{simResult.newsContent}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 border-t border-slate-850">
                      <a
                        href={simResult.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full block py-2 bg-[#c8502a] hover:bg-orange-600 text-white font-bold text-xs text-center rounded-xl transition"
                      >
                        🔊 กดเพื่อฟังเสียงประกาศข่าว
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Activity Logs */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                <span>ประวัติการรับ Webhook (Activity Logs)</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
                  title="โหลดประวัติใหม่"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleClearLogs}
                  className="p-1.5 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition"
                  title="ล้างประวัติทั้งหมด"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs">
                  ยังไม่มีรายการการดักจับข้อความ Webhook ในระบบ
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                        {log.status}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-300">
                        <span className="text-amber-500">[{log.senderName}]</span>: &ldquo;{log.rawText}&rdquo;
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1 bg-slate-900/80 p-2 rounded-xl border border-slate-850">
                        <strong className="text-slate-300">Gemini:</strong> {log.refinedText}
                      </p>
                    </div>

                    {log.audioUrl && (
                      <div className="pt-1 flex items-center gap-2">
                        <audio src={log.audioUrl} controls className="h-8 w-full rounded-lg bg-slate-900" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
