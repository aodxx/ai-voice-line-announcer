import React, { useState, useEffect } from 'react';
import { Key, Copy, RefreshCw, Check, Code, Terminal, BookOpen, Shield, ShieldAlert, Globe, Server, CheckCircle2 } from 'lucide-react';

export default function ApiDeveloperPortal() {
  const [apiKey, setApiKey] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
  const apiEndpoint = `${originUrl}/api/v1/tts`;

  useEffect(() => {
    fetchApiConfig();
  }, []);

  const fetchApiConfig = async () => {
    try {
      const res = await fetch('/api/v1/config');
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setEnabled(data.enabled);
      }
    } catch (e) {
      console.error('Failed to load API config:', e);
    }
  };

  const handleRotateKey = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตและสร้าง API Key ชุดใหม่? คีย์เก่าทั้งหมดที่ผู้อื่นกำลังใช้อยู่จะถูกยกเลิกการใช้งานทันที!')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/config/rotate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setEnabled(data.enabled);
        showTemporaryMessage('สร้างและอัปเดต API Key ชุดใหม่เรียบร้อยแล้ว!');
      }
    } catch (e) {
      console.error('Failed to rotate API key:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSecurity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/config/toggle', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        showTemporaryMessage(
          data.enabled 
            ? 'เปิดใช้งานระบบความปลอดภัยแล้ว: ผู้เรียกใช้งานภายนอกจำเป็นต้องส่ง API Key ใน Header' 
            : 'ปิดระบบความปลอดภัยสำเร็จ: เปิดให้คนอื่นเรียกใช้ API ได้อย่างเสรีโดยไม่ต้องใช้คีย์คุม!'
        );
      }
    } catch (e) {
      console.error('Failed to toggle API security:', e);
    } finally {
      setLoading(false);
    }
  };

  const showTemporaryMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const curlExample = `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\${enabled ? `\n  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\` : ''}
  -d '{
    "text": "สวัสดีค่ะ ยินดีต้อนรับเข้าสู่ระบบสร้างเสียงสังเคราะห์อัจฉริยะ",
    "voice": "Kore",
    "provider": "gemini",
    "emotion": "สดใส (Happy)",
    "accent": "ภาคกลาง (Central)",
    "style": "ผู้ประกาศข่าว (Broadcaster)",
    "speed": 1.0,
    "pitch": "ปานกลาง (Medium)",
    "format": "mp3"
  }'`;

  const nodeExample = `const fetchTTS = async () => {
  const response = await fetch("${apiEndpoint}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",${enabled ? `\n      "X-API-Key": "${apiKey || 'YOUR_API_KEY'}"` : ''}
    },
    body: JSON.stringify({
      text: "สวัสดีค่ะ ยินดีต้อนรับเข้าสู่ระบบสร้างเสียงสังเคราะห์อัจฉริยะ",
      voice: "Kore",
      provider: "gemini",
      emotion: "สดใส (Happy)",
      accent: "ภาคกลาง (Central)",
      style: "ผู้ประกาศข่าว (Broadcaster)",
      speed: 1.0,
      pitch: "ปานกลาง (Medium)",
      format: "mp3"
    })
  });

  const data = await response.json();
  if (data.success) {
    console.log("Audio URL:", "${originUrl}" + data.audioUrl);
  } else {
    console.error("Failed:", data.error);
  }
};

fetchTTS();`;

  const pythonExample = `import requests

url = "${apiEndpoint}"
headers = {
    "Content-Type": "application/json",${enabled ? `\n    "X-API-Key": "${apiKey || 'YOUR_API_KEY'}"` : ''}
}

payload = {
    "text": "สวัสดีค่ะ ยินดีต้อนรับเข้าสู่ระบบสร้างเสียงสังเคราะห์อัจฉริยะ",
    "voice": "Kore",
    "provider": "gemini",
    "emotion": "สดใส (Happy)",
    "accent": "ภาคกลาง (Central)",
    "style": "ผู้ประกาศข่าว (Broadcaster)",
    "speed": 1.0,
    "pitch": "ปานกลาง (Medium)",
    "format": "mp3"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data.get("success"):
    print("ดาวน์โหลดเสียงได้ที่:", "${originUrl}" + data["audioUrl"])
else:
    print("ข้อผิดพลาด:", data.get("error"))`;

  const responseExample = `{
  "success": true,
  "audioUrl": "/audio/voice_2026-06-25_143000.mp3",
  "filename": "voice_2026-06-25_143000.mp3",
  "duration": "0:04",
  "fileSize": "0.12 MB",
  "metadata": {
    "id": "1782390123910",
    "date": "2026-06-25T14:30:00.000Z",
    "text": "สวัสดีค่ะ ยินดีต้อนรับ...",
    "fullText": "สวัสดีค่ะ ยินดีต้อนรับเข้าสู่ระบบสร้างเสียงสังเคราะห์อัจฉริยะ",
    "voice": "Kore",
    "gender": "ชาย (Male)",
    "emotion": "สดใส (Happy)",
    "accent": "ภาคกลาง (Central)",
    "style": "ผู้ประกาศข่าว (Broadcaster)",
    "speed": 1.0,
    "pitch": "ปานกลาง (Medium)",
    "duration": "0:04",
    "fileSize": "0.12 MB",
    "filename": "voice_2026-06-25_143000.mp3",
    "url": "/audio/voice_2026-06-25_143000.mp3",
    "provider": "gemini"
  }
}`;

  return (
    <div id="developer-portal" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch select-none">
      
      {/* Column Left: Credentials Manager & Security Toggles */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        
        {/* Connection Token Control */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c8502a]" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[#c8502a] font-black text-xs uppercase tracking-wider">
              <Key className="h-5 w-5" />
              <span>กุญแจเชื่อมโยงภายนอก (API Credentials)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
              enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {enabled ? 'SECURED' : 'PUBLIC ACCESS'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            หากคุณเปิดการใช้งานคีย์ภายนอก คนอื่นหรือซอฟต์แวร์ที่นำ API ไปเชื่อมต่อจำเป็นต้องแนบกุญแจ API Key ส่วนตัวนี้ใน Header เพื่อใช้งานโควต้าของระบบนี้
          </p>

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-white text-[11px] font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Key display input bar */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">คีย์เชื่อมต่อระบบหลัก (Private Token)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={apiKey || 'ยังไม่ได้สร้างรหัสคีย์...'}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs font-mono p-3.5 rounded-2xl outline-none font-bold pr-10"
                />
                {apiKey && (
                  <button
                    onClick={() => copyToClipboard(apiKey, 'key')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    title="คัดลอก API Token"
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions button list */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleToggleSecurity}
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black border transition-all duration-300 cursor-pointer ${
                enabled 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {enabled ? 'ปิดการตรวจสอบคีย์' : 'เปิดตรวจสอบคีย์แบบปลอดภัย'}
            </button>

            <button
              onClick={handleRotateKey}
              disabled={loading}
              className="py-3 px-3.5 rounded-2xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition duration-300 flex items-center justify-center cursor-pointer"
              title="สร้างคีย์รหัสใหม่"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* API Endpoint overview Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          
          <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-wider">
            <Server className="h-5 w-5" />
            <span>เส้นทางเรียกใช้ (Endpoint Address)</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">METHOD</span>
              <span className="px-3 py-1.5 rounded-lg bg-[#c8502a]/10 border border-[#c8502a]/20 text-[#c8502a] text-xs font-black inline-block">POST</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">URL ADDRESS</span>
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex items-center justify-between text-xs font-mono font-bold text-slate-300 break-all select-all">
                <span>{apiEndpoint}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical overview list */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 text-[#c8502a] font-black text-xs uppercase tracking-wider">
            <BookOpen className="h-5 w-5" />
            <span>คำอธิบายพารามิเตอร์ (Payload)</span>
          </div>

          <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed font-semibold max-h-[300px] overflow-y-auto pr-1">
            <div className="border-b border-slate-850 pb-2.5">
              <span className="font-mono text-[#c8502a] font-bold">text</span> <span className="text-[10px] text-slate-500 italic">(string, required)</span>
              <p className="mt-0.5 text-[11px]">บทความหรือข้อความภาษาไทย/อังกฤษที่ต้องการสังเคราะห์เสียง ยาวสูงสุด 10,000 ตัวอักษร</p>
            </div>
            <div className="border-b border-slate-850 pb-2.5">
              <span className="font-mono text-amber-400 font-bold">voice</span> <span className="text-[10px] text-slate-500 italic">(string, optional)</span>
              <p className="mt-0.5 text-[11px]">ชื่อของโปรไฟล์เสียงจำลอง (เช่น Kore, Puck, Fenrir หรือ ID ของ ElevenLabs)</p>
            </div>
            <div className="border-b border-slate-850 pb-2.5">
              <span className="font-mono text-indigo-400 font-bold">provider</span> <span className="text-[10px] text-slate-500 italic">(string, optional)</span>
              <p className="mt-0.5 text-[11px]">ระบุผู้ให้บริการของเสียงหลัก ตัวเลือกคือ: <code className="text-slate-200">gemini</code>, <code className="text-slate-200">openai</code>, <code className="text-slate-200">elevenlabs</code></p>
            </div>
            <div className="border-b border-slate-850 pb-2.5">
              <span className="font-mono text-slate-200 font-bold">speed</span> <span className="text-[10px] text-slate-500 italic">(number, optional)</span>
              <p className="mt-0.5 text-[11px]">อัตราความเร็วในการพูด ช่วงที่แนะนำอยู่ระหว่าง <code className="text-slate-200">0.25</code> ถึง <code className="text-slate-200">4.0</code> (ค่าเริ่มต้นคือ 1.0)</p>
            </div>
            <div className="border-b border-slate-850 pb-2.5">
              <span className="font-mono text-slate-200 font-bold">format</span> <span className="text-[10px] text-slate-500 italic">(string, optional)</span>
              <p className="mt-0.5 text-[11px]">นามสกุลของไฟล์ผลลัพธ์ที่จะจัดเก็บ: <code className="text-slate-200">mp3</code>, <code className="text-slate-200">wav</code>, <code className="text-slate-200">m4a</code></p>
            </div>
          </div>
        </div>

      </div>

      {/* Column Right: Code Playground & Response Visualizer */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        
        {/* Copyable Quickstart Snippets */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5 text-slate-200 font-black text-xs uppercase tracking-wider">
              <Code className="h-5 w-5 text-[#c8502a]" />
              <span>ตัวอย่างโค้ดเรียกใช้งาน (Quickstart Code)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider hidden sm:inline-block">
              รองรับ MULTI-LANGUAGE
            </span>
          </div>

          {/* cURL Block */}
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-[#c8502a] flex items-center gap-1.5 bg-[#c8502a]/10 px-2.5 py-1 rounded-lg">
                <Terminal className="h-3.5 w-3.5" />
                cURL Bash Command
              </span>
              <button
                onClick={() => copyToClipboard(curlExample, 'curl')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-850 transition duration-300"
              >
                {copiedCode === 'curl' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedCode === 'curl' ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4.5 rounded-2xl text-[11px] font-mono font-bold text-slate-300 leading-relaxed overflow-x-auto border border-slate-850 text-left min-h-[140px] max-h-[220px]">
              {curlExample}
            </pre>
          </div>

          {/* Javascript Block */}
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-amber-500 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                <Code className="h-3.5 w-3.5" />
                JavaScript (Fetch API Node.js / Browser)
              </span>
              <button
                onClick={() => copyToClipboard(nodeExample, 'node')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-850 transition duration-300"
              >
                {copiedCode === 'node' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedCode === 'node' ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4.5 rounded-2xl text-[11px] font-mono font-bold text-slate-300 leading-relaxed overflow-x-auto border border-slate-850 text-left min-h-[180px] max-h-[260px]">
              {nodeExample}
            </pre>
          </div>

          {/* Python Block */}
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-blue-400 flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                <Code className="h-3.5 w-3.5" />
                Python (Requests Client)
              </span>
              <button
                onClick={() => copyToClipboard(pythonExample, 'python')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-850 transition duration-300"
              >
                {copiedCode === 'python' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedCode === 'python' ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4.5 rounded-2xl text-[11px] font-mono font-bold text-slate-300 leading-relaxed overflow-x-auto border border-slate-850 text-left min-h-[180px] max-h-[260px]">
              {pythonExample}
            </pre>
          </div>

        </div>

        {/* Expected JSON Response Block */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 text-slate-200 font-black text-xs uppercase tracking-wider">
              <Terminal className="h-5 w-5 text-emerald-500" />
              <span>ผลลัพธ์ตอบรับที่คาดหมาย (Expected JSON Response)</span>
            </div>
            <button
              onClick={() => copyToClipboard(responseExample, 'response')}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-850 transition duration-300"
            >
              {copiedCode === 'response' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCode === 'response' ? 'คัดลอกผลลัพธ์' : 'คัดลอก'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-4.5 rounded-2xl text-[11px] font-mono font-bold text-slate-300 leading-relaxed overflow-x-auto border border-slate-850 text-left max-h-[220px]">
            {responseExample}
          </pre>
        </div>

      </div>

    </div>
  );
}
