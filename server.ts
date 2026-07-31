import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  addPersistentLineLog,
  claimWebhookEvent,
  clearPersistentLineLogs,
  convertWavToM4a,
  getAudioDurationMs,
  getPersistentLineLogs,
  publishAudioFile,
} from './server/production.js';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({
  limit: '10mb',
  verify: (req: express.Request, _res, buffer) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(503).json({ error: 'ADMIN_API_KEY is not configured' });
  }
  const suppliedKey = req.header('x-admin-key') || '';
  const expected = Buffer.from(configuredKey);
  const actual = Buffer.from(suppliedKey);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function safeLineConfig(config: LineConfig) {
  return {
    channelAccessToken: '',
    channelSecret: '',
    hasChannelAccessToken: Boolean(config.channelAccessToken),
    hasChannelSecret: Boolean(config.channelSecret),
    defaultVoice: config.defaultVoice,
    enabled: config.enabled,
  };
}

function verifyLineSignature(req: express.Request, channelSecret: string): boolean {
  const signature = req.header('x-line-signature');
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !rawBody || !channelSecret) return false;
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(signature);
  return expectedBuffer.length === suppliedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

// Directories setup
const audioDir = path.join(process.cwd(), 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const historyFile = path.join(audioDir, 'history.json');

// Initialize history.json if it doesn't exist
if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
}

// Helper to read history
function readHistory(): any[] {
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading history file:', e);
  }
  return [];
}

// Helper to write history
function writeHistory(history: any[]) {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Error writing history file:', e);
  }
}

// Helper to prepend standard RIFF/WAVE header to raw 16-bit Mono PCM buffer
function addWavHeader(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // ChunkID: "RIFF"
  header.write('RIFF', 0, 'ascii');
  // ChunkSize
  header.writeUInt32LE(chunkSize, 4);
  // Format: "WAVE"
  header.write('WAVE', 8, 'ascii');
  // Subchunk1ID: "fmt "
  header.write('fmt ', 12, 'ascii');
  // Subchunk1Size: 16 for PCM
  header.writeUInt32LE(16, 16);
  // AudioFormat: 1 for PCM (uncompressed)
  header.writeUInt16LE(1, 20);
  // NumChannels: 1 (mono)
  header.writeUInt16LE(numChannels, 22);
  // SampleRate
  header.writeUInt32LE(sampleRate, 24);
  // ByteRate
  header.writeUInt32LE(byteRate, 28);
  // BlockAlign
  header.writeUInt16LE(blockAlign, 32);
  // BitsPerSample: 16
  header.writeUInt16LE(bitsPerSample, 34);
  // Subchunk2ID: "data"
  header.write('data', 36, 'ascii');
  // Subchunk2Size
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Serve static audio files
app.use('/audio', express.static(audioDir));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API configurations storage setup
const apiConfigFile = path.join(audioDir, 'api_config.json');

// Helper to read API config
function getApiConfig(): { apiKey: string; enabled: boolean } {
  try {
    if (fs.existsSync(apiConfigFile)) {
      const data = fs.readFileSync(apiConfigFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading API config:', e);
  }
  // Create default token if not exists
  const defaultConfig = {
    apiKey: 'bn_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11),
    enabled: true
  };
  try {
    fs.writeFileSync(apiConfigFile, JSON.stringify(defaultConfig, null, 2));
  } catch (e) {
    console.error('Error creating default API config:', e);
  }
  return defaultConfig;
}

// Helper to write API config
function saveApiConfig(config: { apiKey: string; enabled: boolean }) {
  try {
    fs.writeFileSync(apiConfigFile, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error saving API config:', e);
  }
}

// LINE Bot Storage Files
const lineConfigFile = path.join(audioDir, 'line_config.json');
const lineLogsFile = path.join(audioDir, 'line_logs.json');

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  defaultVoice: string;
  enabled: boolean;
}

function getLineConfig(): LineConfig {
  try {
    if (fs.existsSync(lineConfigFile)) {
      const data = fs.readFileSync(lineConfigFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading LINE config:', e);
  }
  return {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    defaultVoice: 'Kore',
    enabled: true,
  };
}

function saveLineConfig(config: LineConfig) {
  try {
    fs.writeFileSync(lineConfigFile, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error saving LINE config:', e);
  }
}

function getLineLogs(): any[] {
  try {
    if (fs.existsSync(lineLogsFile)) {
      const data = fs.readFileSync(lineLogsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading LINE logs:', e);
  }
  return [];
}

function addLineLog(logItem: any) {
  try {
    const logs = getLineLogs();
    logs.unshift(logItem);
    if (logs.length > 50) logs.length = 50;
    fs.writeFileSync(lineLogsFile, JSON.stringify(logs, null, 2));
    void addPersistentLineLog(logItem).catch((error) => {
      console.error('Error persisting LINE log to Supabase:', error);
    });
  } catch (e) {
    console.error('Error adding LINE log:', e);
  }
}

function clearLineLogs() {
  try {
    fs.writeFileSync(lineLogsFile, JSON.stringify([], null, 2));
  } catch (e) {
    console.error('Error clearing LINE logs:', e);
  }
}

interface GenerateVoiceOptions {
  text: string;
  voice?: string;
  gender?: string;
  emotion?: string;
  accent?: string;
  style?: string;
  speed?: string | number;
  pitch?: string;
  provider?: string;
  format?: string;
  customGeminiKey?: string;
  customOpenAIKey?: string;
  customElevenLabsKey?: string;
}

// Reusable speech synthesis helper
async function synthesizeSpeech(options: GenerateVoiceOptions) {
  const {
    text,
    voice,
    gender,
    emotion,
    accent,
    style,
    speed = '1.0',
    pitch,
    provider = 'gemini',
    format = 'mp3',
    customGeminiKey,
    customOpenAIKey,
    customElevenLabsKey,
  } = options;

  if (!text || text.trim() === '') {
     throw new Error('Text content is required');
  }

  if (text.length > 10000) {
     throw new Error('Text exceeds maximum character limit of 10,000');
  }

  // Determine filename with date-time stamp matching requirements
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
  
  // Gemini TTS output is natively WAV, so force .wav extension for Gemini to avoid decoder errors
  const resolvedFormat = provider === 'gemini' ? 'wav' : format;
  const ext = resolvedFormat === 'm4a' ? 'm4a' : resolvedFormat === 'wav' ? 'wav' : 'mp3';
  const filename = `voice_${timestamp}.${ext}`;
  const filePath = path.join(audioDir, filename);

  let audioBuffer: Buffer | null = null;
  let finalProvider = provider;

  // 1. OpenAI TTS API
  const openAIKeyToUse = customOpenAIKey || process.env.OPENAI_API_KEY;
  // 2. ElevenLabs API
  const elevenLabsKeyToUse = customElevenLabsKey || process.env.ELEVENLABS_API_KEY;

  if (provider === 'openai') {
    if (!openAIKeyToUse) {
      throw new Error('OpenAI API Key is not configured. Please provide it or use the default Gemini TTS.');
    }
    const responseFormat = format === 'm4a' ? 'aac' : format === 'wav' ? 'wav' : 'mp3';
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKeyToUse}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice?.toLowerCase() || 'alloy',
        input: text,
        response_format: responseFormat,
        speed: parseFloat(String(speed)) || 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);

  } else if (provider === 'elevenlabs') {
    if (!elevenLabsKeyToUse) {
      throw new Error('ElevenLabs API Key is not configured. Please provide it or use the default Gemini TTS.');
    }
    
    const elevenFormat = format === 'wav' ? 'wav_44100' : 'mp3_44100_128';
    // Voice mapping/default
    const voiceId = voice || '21m00Tcm4TlvDq8ikWAM'; 

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${elevenFormat}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKeyToUse,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);

  } else {
    // DEFAULT: Gemini TTS or Fallback to Gemini 3.1 Flash TTS
    finalProvider = 'gemini';
    
    const geminiClient = customGeminiKey
      ? new GoogleGenAI({
          apiKey: customGeminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })
      : ai;
    
    const promptInstructions = `You are a high-quality Text-To-Speech engine. 
Synthesize the following text precisely. 
Emotion mood: ${emotion || 'ทั่วไป (Neutral)'}. 
Accent pronunciation style: ${accent || 'ภาคกลาง (Central)'}.
Speaking style role: ${style || 'ผู้ประกาศข่าว (Broadcaster)'}.
Pitch tone height: ${pitch || 'ปานกลาง (Medium)'}.

Text:
${text}`;

    // Gemini Text-to-Speech call
    const response = await geminiClient.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: promptInstructions }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const base64Data = inlineData?.data;
    const returnedMimeType = inlineData?.mimeType;
    
    if (!base64Data) {
      throw new Error('Failed to generate speech audio from Gemini model.');
    }

    const rawBuffer = Buffer.from(base64Data, 'base64');
    
    // Parse sample rate from mimeType if present (e.g. audio/x-linear16;rate=24000)
    let sampleRate = 24000;
    if (returnedMimeType) {
      const rateMatch = returnedMimeType.match(/rate=(\d+)/);
      if (rateMatch) {
        sampleRate = parseInt(rateMatch[1], 10);
      }
    }
    
    // Prepend standard WAV header to raw PCM so browser can decode it natively
    audioBuffer = addWavHeader(rawBuffer, sampleRate);
  }

  // Write to file
  fs.writeFileSync(filePath, audioBuffer);

  // Calculate duration
  const durationSeconds = Math.max(1, Math.round((text.length / 15) * (1 / (parseFloat(String(speed)) || 1.0))));
  const minutesPart = Math.floor(durationSeconds / 60);
  const secondsPart = durationSeconds % 60;
  const durationStr = `${minutesPart}:${String(secondsPart).padStart(2, '0')}`;

  const stats = fs.statSync(filePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

  // Store metadata in history
  const historyItem = {
    id: String(Date.now()),
    date: new Date().toISOString(),
    text: text.length > 120 ? text.substring(0, 120) + '...' : text,
    fullText: text,
    voice: voice || 'Kore',
    gender: gender || 'ชาย (Male)',
    emotion: emotion || 'ทั่วไป (Neutral)',
    accent: accent || 'ภาคกลาง (Central)',
    style: style || 'ผู้ประกาศข่าว (Broadcaster)',
    speed: parseFloat(String(speed)) || 1.0,
    pitch: pitch || 'ปานกลาง (Medium)',
    duration: durationStr,
    fileSize: fileSizeMB,
    filename,
    url: `/audio/${filename}`,
    provider: finalProvider,
  };

  const currentHistory = readHistory();
  currentHistory.unshift(historyItem);
  writeHistory(currentHistory);

  return {
    audioUrl: `/audio/${filename}`,
    filename,
    metadata: historyItem,
  };
}

// API endpoint: Get developer API config
app.get('/api/v1/config', (req: express.Request, res: express.Response) => {
  try {
    const config = getApiConfig();
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch API config' });
  }
});

// API endpoint: Rotate developer API Key
app.post('/api/v1/config/rotate', (req: express.Request, res: express.Response) => {
  try {
    const newConfig = {
      apiKey: 'bn_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11),
      enabled: true
    };
    saveApiConfig(newConfig);
    res.json(newConfig);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

// API endpoint: Toggle developer API Key validation
app.post('/api/v1/config/toggle', (req: express.Request, res: express.Response) => {
  try {
    const config = getApiConfig();
    config.enabled = !config.enabled;
    saveApiConfig(config);
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to toggle API security' });
  }
});

// API endpoint: Public External TTS for third parties
app.post('/api/v1/tts', async (req: express.Request, res: express.Response) => {
  try {
    const config = getApiConfig();
    if (config.enabled) {
      const authHeader = req.headers.authorization;
      const apiKeyHeader = req.headers['x-api-key'];
      const queryKey = req.query.apiKey;
      
      let providedKey = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        providedKey = authHeader.substring(7);
      } else if (apiKeyHeader) {
        providedKey = String(apiKeyHeader);
      } else if (queryKey) {
        providedKey = String(queryKey);
      }
      
      if (!providedKey || providedKey !== config.apiKey) {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
        return;
      }
    }

    const result = await synthesizeSpeech(req.body);
    res.json({
      success: true,
      audioUrl: result.audioUrl,
      filename: result.filename,
      duration: result.metadata.duration,
      fileSize: result.metadata.fileSize,
      metadata: result.metadata
    });
  } catch (error: any) {
    console.error('Error in API v1 TTS:', error);
    res.status(500).json({ error: error.message || 'Speech generation failed' });
  }
});

// API endpoint: Internal Generate Speech
app.post('/api/generate-voice', async (req: express.Request, res: express.Response) => {
  try {
    const result = await synthesizeSpeech(req.body);
    res.json({
      success: true,
      audioUrl: result.audioUrl,
      filename: result.filename,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: error.message || 'Speech generation failed' });
  }
});

// API endpoint: Get History
app.get('/api/history', (req: express.Request, res: express.Response) => {
  try {
    const history = readHistory();
    res.json(history);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Helper function to process announcement with Gemini & AI Voice Studio TTS
async function processLineAnnouncement(rawMessageText: string, senderName: string, reqBaseUrl: string) {
  let newsContent = rawMessageText;
  const match = rawMessageText.match(/@แจ้งข่าว\s*([\s\S]*)/i);
  if (match && match[1]) {
    newsContent = match[1].trim();
  } else {
    newsContent = rawMessageText.replace(/@แจ้งข่าว/gi, '').trim();
  }

  if (!newsContent) {
    newsContent = 'ไม่มีรายละเอียดข่าวสารที่ระบุ';
  }

  // Exact prompt required by user
  const geminiPrompt = `คุณเป็นผู้ประกาศข่าวมืออาชีพ แปลงข้อความนี้ให้อ่านออกเสียงราบรื่น เพิ่มคำนำ เรียนสมาชิกทุกท่าน ระบุชื่อผู้แจ้ง ใช้ภาษาไทยกลางสุภาพ ไม่เกิน 300 ตัวอักขระ ไม่มีอักขระพิเศษหรือ emoji และตอบเฉพาะข้อความที่แปลงแล้วเท่านั้น`;
  const geminiInput = `ชื่อผู้แจ้ง: ${senderName || 'สมาชิก'}\nเนื้อหาข่าวสาร: ${newsContent}`;

  let refinedText = '';
  try {
    const geminiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            { text: geminiPrompt },
            { text: geminiInput }
          ]
        }
      ]
    });
    refinedText = geminiRes.text?.trim() || '';
  } catch (err: any) {
    console.error('Error calling Gemini for news refining:', err);
    refinedText = `เรียนสมาชิกทุกท่าน คุณ${senderName || 'สมาชิก'} ได้แจ้งข่าวสาร: ${newsContent}`;
  }

  // Clean out formatting markers
  refinedText = refinedText.replace(/[\*\_~`#]/g, '').trim();

  // Synthesize Speech with AI Voice Studio
  const lineConfig = getLineConfig();
  const voiceToUse = lineConfig.defaultVoice || 'Kore';

  const ttsResult = await synthesizeSpeech({
    text: refinedText,
    voice: voiceToUse,
    style: 'ผู้ประกาศข่าว (Broadcaster)',
    provider: 'gemini',
    format: 'mp3',
  });

  const wavPath = path.join(audioDir, ttsResult.filename);
  const lineAudioPath = await convertWavToM4a(wavPath);
  const fullAudioUrl = await publishAudioFile(lineAudioPath, reqBaseUrl);
  const durationMs = await getAudioDurationMs(lineAudioPath);

  const audioMessage = {
    type: 'audio',
    originalContentUrl: fullAudioUrl,
    duration: durationMs
  };

  const flexMessage = {
    type: 'flex',
    altText: `📢 ประกาศข่าวสาร: ${newsContent.substring(0, 35)}...`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#c8502a',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '📢 ประกาศข่าวสารสำคัญ',
            weight: 'bold',
            color: '#ffffff',
            size: 'md'
          },
          {
            type: 'text',
            text: `ผู้แจ้งข่าว: ${senderName || 'สมาชิก'}`,
            color: '#ffedd5',
            size: 'xs',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0f172a',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: 'ข้อความเรียบเรียงโดย Gemini AI:',
            weight: 'bold',
            color: '#f97316',
            size: 'xs'
          },
          {
            type: 'text',
            text: refinedText,
            color: '#f8fafc',
            size: 'sm',
            wrap: true,
            margin: 'sm'
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#334155'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'ข้อความดั้งเดิม:',
                weight: 'bold',
                color: '#64748b',
                size: 'xs'
              },
              {
                type: 'text',
                text: newsContent,
                color: '#94a3b8',
                size: 'xs',
                wrap: true,
                margin: 'xs'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#020617',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🔊 กดเพื่อฟังเสียงประกาศข่าว',
              uri: fullAudioUrl
            },
            style: 'primary',
            color: '#c8502a',
            height: 'sm'
          }
        ]
      }
    }
  };

  return {
    newsContent,
    senderName,
    refinedText,
    audioUrl: fullAudioUrl,
    filename: path.basename(lineAudioPath),
    durationMs,
    audioMessage,
    flexMessage,
  };
}

// API endpoint: Get LINE Bot Config
app.get('/api/line/config', requireAdmin, (req: express.Request, res: express.Response) => {
  try {
    const config = getLineConfig();
    res.json(safeLineConfig(config));
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch LINE config' });
  }
});

// API endpoint: Verify LINE Channel Access Token with LINE API
app.post('/api/line/verify-token', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.body;
    const accessToken = token || getLineConfig().channelAccessToken;

    if (!accessToken) {
      return res.status(400).json({ valid: false, error: 'กรุณากรอก Channel Access Token ก่อนทดสอบ' });
    }

    const lineRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    });

    if (lineRes.ok) {
      const botInfo = await lineRes.json();
      res.json({
        valid: true,
        botInfo: {
          displayName: botInfo.displayName,
          basicId: botInfo.basicId,
          pictureUrl: botInfo.pictureUrl,
          chatMode: botInfo.chatMode,
          markAsReadMode: botInfo.markAsReadMode,
        },
      });
    } else {
      const errData = await lineRes.json().catch(() => ({}));
      res.json({
        valid: false,
        error: errData.message || `LINE API Error (${lineRes.status}) - Token อาจไม่ถูกต้องหรือหมดอายุ`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message || 'ไม่สามารถเชื่อมต่อกับ LINE API Server ได้' });
  }
});

// API endpoint: Save LINE Bot Config
app.post('/api/line/config', requireAdmin, (req: express.Request, res: express.Response) => {
  try {
    const { channelAccessToken, channelSecret, defaultVoice, enabled } = req.body;
    const config = getLineConfig();
    if (process.env.NODE_ENV !== 'production') {
      config.channelAccessToken = channelAccessToken || config.channelAccessToken;
      config.channelSecret = channelSecret || config.channelSecret;
    }
    config.defaultVoice = defaultVoice || config.defaultVoice;
    config.enabled = enabled !== undefined ? enabled : config.enabled;
    if (process.env.NODE_ENV !== 'production') saveLineConfig(config);
    res.json({ success: true, config: safeLineConfig(config) });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to save LINE config' });
  }
});

// API endpoint: Get LINE Logs
app.get('/api/line/logs', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const logs = await getPersistentLineLogs() || getLineLogs();
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch LINE logs' });
  }
});

// API endpoint: Clear LINE Logs
app.delete('/api/line/logs', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    await clearPersistentLineLogs();
    clearLineLogs();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to clear LINE logs' });
  }
});

// API endpoint: Test LINE Announcement processing (Simulator)
app.post('/api/line/test', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { rawText = '@แจ้งข่าว พรุ่งนี้มีการประชุมเวลา 10:00 น.', senderName = 'ประธานกลุ่ม' } = req.body;
    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`;

    const result = await processLineAnnouncement(rawText, senderName, baseUrl);

    // Save to log
    addLineLog({
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      sourceType: 'test_simulator',
      sourceId: 'simulator_user',
      senderName,
      rawText,
      newsContent: result.newsContent,
      refinedText: result.refinedText,
      audioUrl: result.audioUrl,
      status: 'Test Executed (Simulator)',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in LINE test simulator:', error);
    res.status(500).json({ error: error.message || 'LINE test processing failed' });
  }
});

// API endpoint: LINE Webhook Receiver
app.post('/api/line/webhook', async (req: express.Request, res: express.Response) => {
  try {
    const config = getLineConfig();
    if (!verifyLineSignature(req, config.channelSecret)) {
      return res.status(401).json({ error: 'Invalid LINE webhook signature' });
    }

    // Acknowledge after authenticity is confirmed. Audio generation continues asynchronously.
    res.status(200).json({ status: 'accepted' });

    if (!config.enabled) {
      console.log('LINE bot is currently disabled in config');
      return;
    }

    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`;
    const events = req.body.events || [];

    if (events.length === 0) {
      // LINE Developer Console "Verify" button sends empty events array
      addLineLog({
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        sourceType: 'line_verify_test',
        sourceId: 'console_verification',
        senderName: 'LINE System',
        rawText: '[LINE Webhook Verification Call]',
        newsContent: 'LINE Verified Connection Successfully',
        refinedText: 'Webhook URL ตอบรับ 200 OK จาก LINE Console เรียบร้อยแล้ว',
        audioUrl: '',
        status: 'LINE Webhook Verification Passed (200 OK)',
      });
      return;
    }

    for (const event of events) {
      if (!(await claimWebhookEvent(event.webhookEventId))) {
        console.log(`Ignoring duplicate LINE webhook event: ${event.webhookEventId}`);
        continue;
      }

      const sourceType = event.source?.type || 'unknown';
      const sourceId = event.source?.groupId || event.source?.roomId || event.source?.userId || 'unknown';
      const userId = event.source?.userId;
      const groupId = event.source?.groupId;

      // Log join/follow/other events if needed
      if (event.type !== 'message' || event.message?.type !== 'text') {
        addLineLog({
          id: String(Date.now()),
          timestamp: new Date().toISOString(),
          sourceType,
          sourceId,
          senderName: 'LINE Event',
          rawText: `[Event Type: ${event.type}]`,
          newsContent: `Received event type: ${event.type}`,
          refinedText: 'ข้ามการประมวลผล (ไม่ใช่ข้อความตัวอักษร)',
          audioUrl: '',
          status: 'Ignored Non-Text Event',
        });
        continue;
      }

      const rawText = event.message.text || '';

      // Check if message contains @แจ้งข่าว
      if (/^\s*@แจ้งข่าว(?:\s|$)/i.test(rawText)) {
        let senderName = 'สมาชิกในกลุ่ม';

        if (config.channelAccessToken && userId) {
          try {
            let profileUrl = `https://api.line.me/v2/bot/profile/${userId}`;
            if (groupId) {
              profileUrl = `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`;
            } else if (event.source?.roomId) {
              profileUrl = `https://api.line.me/v2/bot/room/${event.source.roomId}/member/${userId}`;
            }
            const profileRes = await fetch(profileUrl, {
              headers: {
                Authorization: `Bearer ${config.channelAccessToken}`,
              },
            });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData.displayName) {
                senderName = profileData.displayName;
              }
            }
          } catch (err) {
            console.warn('Could not fetch LINE user profile:', err);
          }
        }

        const result = await processLineAnnouncement(rawText, senderName, baseUrl);

        let replyStatus = 'Simulated / Logged';

        if (config.channelAccessToken) {
          let sentSuccess = false;

          // Attempt 1: Try Reply API first using replyToken
          if (event.replyToken) {
            try {
              const replyRes = await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${config.channelAccessToken}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [
                    result.audioMessage,
                    result.flexMessage,
                  ],
                }),
              });

              if (replyRes.ok) {
                replyStatus = 'ส่งข้อความตอบกลับเข้า LINE สำเร็จ (Reply 200 OK)';
                sentSuccess = true;
              } else {
                const errText = await replyRes.text();
                console.warn('LINE Reply API failed:', errText);
                replyStatus = `Reply Failed: ${errText}`;
              }
            } catch (replyErr: any) {
              console.warn('LINE Reply API Error:', replyErr);
              replyStatus = `Reply Error: ${replyErr.message}`;
            }
          }

          // Attempt 2: Fallback to Push Message API if Reply failed or had no replyToken
          if (!sentSuccess && sourceId && sourceId !== 'unknown') {
            try {
              const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${config.channelAccessToken}`,
                },
                body: JSON.stringify({
                  to: sourceId,
                  messages: [
                    result.audioMessage,
                    result.flexMessage,
                  ],
                }),
              });

              if (pushRes.ok) {
                replyStatus = 'ส่งข้อความพุชเข้ากลุ่ม LINE สำเร็จ (Push Fallback 200 OK)';
                sentSuccess = true;
              } else {
                const pushErrText = await pushRes.text();
                console.warn('LINE Push API failed:', pushErrText);
                replyStatus += ` | Push Fallback Failed: ${pushErrText}`;
              }
            } catch (pushErr: any) {
              console.warn('LINE Push API Error:', pushErr);
              replyStatus += ` | Push Error: ${pushErr.message}`;
            }
          }
        } else {
          replyStatus = 'ยังไม่ได้ใส่ Channel Access Token ในระบบ';
        }

        addLineLog({
          id: String(Date.now()),
          timestamp: new Date().toISOString(),
          sourceType,
          sourceId,
          senderName,
          rawText,
          newsContent: result.newsContent,
          refinedText: result.refinedText,
          audioUrl: result.audioUrl,
          status: replyStatus,
        });
      } else {
        // Log received text messages that don't start with @แจ้งข่าว
        addLineLog({
          id: String(Date.now()),
          timestamp: new Date().toISOString(),
          sourceType,
          sourceId,
          senderName: 'สมาชิกในกลุ่ม',
          rawText,
          newsContent: 'ข้อความทั่วไป (ไม่มี @แจ้งข่าว)',
          refinedText: 'ข้ามการประมวลผล (ไม่มีคำสำคัญ @แจ้งข่าว)',
          audioUrl: '',
          status: 'Ignored (Missing @แจ้งข่าว keyword)',
        });
      }
    }
  } catch (error: any) {
    console.error('Error in async LINE webhook handler:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'LINE webhook processing failed' });
    }
  }
});

app.get('/healthz', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-voice-line-announcer',
    timestamp: new Date().toISOString(),
  });
});

// API endpoint: Delete History Item
app.delete('/api/history/:id', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    let history = readHistory();
    const item = history.find((h) => h.id === id);
    if (item) {
      const filePath = path.join(audioDir, item.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      history = history.filter((h) => h.id !== id);
      writeHistory(history);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'History item not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to delete history item' });
  }
});

// Start server
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
