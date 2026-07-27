export interface Voice {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Neutral';
  lang: string;
  accent: string;
  provider: 'gemini' | 'openai' | 'elevenlabs';
  sampleUrl?: string;
  description?: string;
}

export interface HistoryItem {
  id: string;
  date: string;
  text: string;
  fullText?: string;
  voice: string;
  gender: 'Male' | 'Female' | 'Neutral';
  emotion: string;
  accent: string;
  style: string;
  speed: number;
  pitch: string;
  duration: string;
  fileSize: string;
  filename: string;
  url: string;
  provider: 'gemini' | 'openai' | 'elevenlabs';
}

export interface GeneratorSettings {
  text: string;
  voiceId: string;
  gender: 'Male' | 'Female' | 'Neutral';
  emotion: string;
  accent: string;
  style: string;
  speed: number;
  pitch: 'Low' | 'Normal' | 'High';
  provider: 'gemini' | 'openai' | 'elevenlabs';
  format: 'mp3' | 'm4a' | 'wav';
}

export const PROVIDERS = [
  { id: 'gemini', name: 'Gemini AI Voice (Built-in)', description: 'No API key required. High fidelity natural voice synthesis.' },
  { id: 'openai', name: 'OpenAI TTS', description: 'Requires OpenAI API Key. Realistic multi-speaker voices.' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Requires ElevenLabs API Key. Ultimate hyper-realistic voices.' },
];

export const EMOTIONS = [
  'Normal', 'Happy', 'Sad', 'Excited', 'Angry', 'Calm', 'Friendly', 'Professional', 'Storytelling'
];

export const ACCENTS = [
  'Thai Standard', 'Southern Thai', 'Northern Thai', 'Isan Thai',
  'English US', 'English UK', 'Australian English', 'Singapore English'
];

export const STYLES = [
  'Narrator', 'News Reader', 'Podcast Host', 'Teacher', 'Customer Service', 'YouTuber', 'Motivational Speaker', 'Documentary Voice'
];

export const VOICES: Voice[] = [
  // Gemini voices
  { id: 'Kore', name: 'Kore', gender: 'Female', lang: 'Thai / English', accent: 'Multi Accent', provider: 'gemini', description: 'Warm and professional tone' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', lang: 'Thai / English', accent: 'Multi Accent', provider: 'gemini', description: 'Friendly and conversational storytelling' },
  { id: 'Puck', name: 'Puck', gender: 'Male', lang: 'Thai / English', accent: 'Multi Accent', provider: 'gemini', description: 'Deep, engaging and articulate' },
  { id: 'Charon', name: 'Charon', gender: 'Male', lang: 'Thai / English', accent: 'Multi Accent', provider: 'gemini', description: 'Professional, calm documentary style' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', lang: 'Thai / English', accent: 'Multi Accent', provider: 'gemini', description: 'Energetic and upbeat speaker' },

  // OpenAI voices
  { id: 'nova', name: 'Nova', gender: 'Female', lang: 'English / Thai', accent: 'US/UK Accent', provider: 'openai', description: 'Bright, professional and pleasant' },
  { id: 'shimmer', name: 'Shimmer', gender: 'Female', lang: 'English / Thai', accent: 'US Accent', provider: 'openai', description: 'Professional narrator' },
  { id: 'alloy', name: 'Alloy', gender: 'Neutral', lang: 'English / Thai', accent: 'US Accent', provider: 'openai', description: 'Balanced and highly versatile' },
  { id: 'fable', name: 'Fable', gender: 'Neutral', lang: 'English / Thai', accent: 'UK Accent', provider: 'openai', description: 'Expressive and narrative-focused' },
  { id: 'echo', name: 'Echo', gender: 'Male', lang: 'English / Thai', accent: 'US/UK Accent', provider: 'openai', description: 'Warm, deep and authoritative' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', lang: 'English / Thai', accent: 'US Accent', provider: 'openai', description: 'Deep, rich and reassuring' },

  // ElevenLabs voices
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female', lang: 'Multi-lingual', accent: 'US Accent', provider: 'elevenlabs', description: 'Friendly and conversational' },
  { id: 'EXAVITQu4vr4xnSDgMaL', name: 'Bella', gender: 'Female', lang: 'Multi-lingual', accent: 'US Accent', provider: 'elevenlabs', description: 'Soft, clear and comforting narration' },
  { id: 'piTKgcLEGmPEe24gW0SG', name: 'Nicole', gender: 'Female', lang: 'Multi-lingual', accent: 'UK Accent', provider: 'elevenlabs', description: 'Clear, crisp corporate speaker' },
  { id: 'pNInz6obpgq5paN9Hp7L', name: 'Adam', gender: 'Male', lang: 'Multi-lingual', accent: 'US Accent', provider: 'elevenlabs', description: 'Deep, expressive narration' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male', lang: 'Multi-lingual', accent: 'US Accent', provider: 'elevenlabs', description: 'Excited, friendly storyteller' },
  { id: '2EiwXtPIgmqCXY7m8x4G', name: 'Clyde', gender: 'Male', lang: 'Multi-lingual', accent: 'US Accent', provider: 'elevenlabs', description: 'Crisp and clean instructional voice' },
];
