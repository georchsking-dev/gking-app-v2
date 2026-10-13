import * as React from 'react';
import {
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Mic,
  MicOff,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Volume2,
  Paperclip,
  X,
  Moon,
  Sun,
  Menu,
  ChevronDown,
  Wand2,
  RefreshCw,
  Download,
  SlidersHorizontal,
  Code2,
  BookOpen,
  PenTool,
  BrainCircuit,
  Network,
  Eye,
  EyeOff,
  ArrowUp,
  Maximize2,
} from 'lucide-react';
import { getNineRouterConfig, saveNineRouterConfig, NineRouterConfig } from './nineRouter';

export interface ChatMsg {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: string;
  provider?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMsg[];
}

const ROLES = [
  {
    id: 'general',
    name: 'Asistente General',
    icon: Sparkles,
    prompt:
      'Eres Gemini, un modelo de IA de Google cálido, amigable, reflexivo y muy útil. Responde en español con claridad y empatía.',
  },
  {
    id: 'coder',
    name: 'Programador Experto',
    icon: Code2,
    prompt:
      'Eres un Ingeniero de Software Senior en Google. Proporciona código limpio, moderno, buenas prácticas, tipado estricto y explicaciones precisas.',
  },
  {
    id: 'creative',
    name: 'Escritor Creativo',
    icon: PenTool,
    prompt:
      'Eres un escritor y narrador creativo galardonado. Usa lenguaje evocador, metáforas ricas, ritmo dinámico e imaginación desbordante.',
  },
  {
    id: 'tutor',
    name: 'Tutor Educativo',
    icon: BookOpen,
    prompt:
      'Eres un profesor comprensivo y pedagógico. Explica cualquier concepto paso a paso con analogías cotidianas y preguntas didácticas.',
  },
  {
    id: 'analyst',
    name: 'Estratega & Análisis',
    icon: BrainCircuit,
    prompt:
      'Eres un consultor estratégico de alto nivel. Analiza problemas complejos con rigor lógico, datos, pros/contras y pasos accionables.',
  },
];

const MODELS = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tag: 'Recomendado',
    desc: 'Equilibrio perfecto entre velocidad y razonamiento para tareas cotidianas.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    tag: 'Razonamiento complejo',
    desc: 'Máxima capacidad intelectual para matemáticas, código y análisis profundo.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra rápido',
    desc: 'Velocidad de respuesta instantánea para consultas rápidas y resúmenes.',
  },
];

const SUGGESTIONS = [
  {
    title: 'Explicar concepto',
    desc: '¿Cómo funciona la computación cuántica?',
    icon: BrainCircuit,
  },
  {
    title: 'Escribir código',
    desc: 'Crea una API REST moderna con Next.js y TypeScript',
    icon: Code2,
  },
  {
    title: 'Crear imagen',
    desc: 'Genera un paisaje futurista con Imagen 3',
    icon: ImageIcon,
    mode: 'image',
  },
  {
    title: 'Generar video',
    desc: 'Secuencia cinematográfica 4K con Veo 3',
    icon: Video,
    mode: 'video',
  },
];

export function GeminiUI(props: { onSwitchToClassic?: () => void }) {
  const [isDark, setIsDark] = React.useState(true);
  const [activeMode, setActiveMode] = React.useState<'chat' | 'image' | 'video' | 'live'>('chat');

  // Model & Role
  const [selectedModel, setSelectedModel] = React.useState('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = React.useState(ROLES[0].id);
  const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = React.useState(false);

  // 9Router Modal
  const [is9RouterOpen, setIs9RouterOpen] = React.useState(false);
  const [nineRouterConfig, setNineRouterConfig] = React.useState<NineRouterConfig>(getNineRouterConfig);
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<string | null>(null);

  // Conversations
  const [conversations, setConversations] = React.useState<Conversation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gk_gemini_conversations');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'default',
        title: 'Nueva conversación',
        createdAt: new Date().toISOString(),
        messages: [],
      },
    ];
  });
  const [currentChatId, setCurrentChatId] = React.useState('default');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Chat inputs
  const [inputPrompt, setInputPrompt] = React.useState('');
  const [attachedImage, setAttachedImage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Image Studio
  const [imagePrompt, setImagePrompt] = React.useState('');
  const [imageMode, setImageMode] = React.useState<'create' | 'edit'>('create');
  const [imageAspectRatio, setImageAspectRatio] = React.useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [inputEditImage, setInputEditImage] = React.useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = React.useState<Array<{ url: string; prompt: string }>>([]);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);

  // Video Studio (Veo 3)
  const [videoPrompt, setVideoPrompt] = React.useState('');
  const [videoAspectRatio, setVideoAspectRatio] = React.useState<'16:9' | '9:16'>('16:9');
  const [isGeneratingVideo, setIsGeneratingVideo] = React.useState(false);
  const [videoResult, setVideoResult] = React.useState<{ uri?: string; message?: string } | null>(null);

  // Gemini Live Voice
  const [isLiveListening, setIsLiveListening] = React.useState(false);
  const [liveTranscript, setLiveTranscript] = React.useState('');
  const [liveStatus, setLiveStatus] = React.useState('Toca para comenzar a hablar');
  const recognitionRef = React.useRef<any>(null);

  // Save conversations
  React.useEffect(() => {
    try {
      localStorage.setItem('gk_gemini_conversations', JSON.stringify(conversations));
    } catch {
      // ignore
    }
  }, [conversations]);

  const currentChat = conversations.find((c) => c.id === currentChatId) || conversations[0];

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isLoading]);

  // Adjust textarea height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

  const handleNewChat = () => {
    const newId = 'chat-' + Date.now();
    const newConv: Conversation = {
      id: newId,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setConversations([newConv, ...conversations]);
    setCurrentChatId(newId);
    setActiveMode('chat');
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = conversations.filter((c) => c.id !== id);
    if (filtered.length === 0) {
      handleNewChat();
    } else {
      setConversations(filtered);
      if (currentChatId === id) {
        setCurrentChatId(filtered[0].id);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt && !attachedImage) return;

    const userMessage: ChatMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: prompt,
      image: attachedImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...currentChat.messages, userMessage];
    const title = currentChat.messages.length === 0 ? prompt.slice(0, 32) || 'Consulta visual' : currentChat.title;

    setConversations((prev) =>
      prev.map((c) => (c.id === currentChat.id ? { ...c, title, messages: updatedMessages } : c)),
    );

    setInputPrompt('');
    const currentAttachment = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const activeRoleConfig = ROLES.find((r) => r.id === selectedRole);
      const res = await fetch('/api/gemini/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
          model: selectedModel,
          systemInstruction: activeRoleConfig?.prompt,
          image: currentAttachment || undefined,
          nineRouter: nineRouterConfig,
        }),
      });

      const data = await res.json();
      const modelReply: ChatMsg = {
        id: 'msg-' + (Date.now() + 1),
        role: 'model',
        text: data.text || 'Sin respuesta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentChat.id ? { ...c, messages: [...updatedMessages, modelReply] } : c,
        ),
      );
    } catch (err: any) {
      const errReply: ChatMsg = {
        id: 'msg-err-' + Date.now(),
        role: 'model',
        text: `⚠️ Error: ${err?.message || 'No se pudo comunicar con el servicio.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === currentChat.id ? { ...c, messages: [...updatedMessages, errReply] } : c)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          mode: imageMode,
          aspectRatio: imageAspectRatio,
          inputImage: inputEditImage || undefined,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImages((prev) => [{ url: data.imageUrl, prompt: imagePrompt }, ...prev]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setIsGeneratingVideo(true);
    setVideoResult(null);
    try {
      const res = await fetch('/api/gemini/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
        }),
      });
      const data = await res.json();
      setVideoResult(data);
    } catch (err: any) {
      setVideoResult({ message: `Error: ${err?.message}` });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const toggleLiveVoice = () => {
    if (isLiveListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsLiveListening(false);
      setLiveStatus('Conversación en pausa.');
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Tu navegador no tiene activado el reconocimiento de voz web.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsLiveListening(true);
      setLiveStatus('Escuchando... Di algo');
    };

    recognition.onresult = async (event: any) => {
      let finalSpeech = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSpeech += event.results[i][0].transcript;
        } else {
          setLiveTranscript(event.results[i][0].transcript);
        }
      }

      if (finalSpeech.trim()) {
        setLiveTranscript(finalSpeech);
        setLiveStatus('Gemini está pensando...');
        try {
          const res = await fetch('/api/gemini/router', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', text: finalSpeech }],
              model: 'gemini-3.8-flash',
              systemInstruction: 'Responde de forma hablada, natural, cálida y concisa.',
              nineRouter: nineRouterConfig,
            }),
          });
          const data = await res.json();
          const reply = data.text || 'Entendido.';
          setLiveStatus(reply);
          handleSpeak(reply);
        } catch {
          setLiveStatus('No pude responder en este momento.');
        }
      }
    };

    recognition.onerror = () => {
      setIsLiveListening(false);
      setLiveStatus('Micrófono inactivo.');
    };

    recognition.onend = () => {
      setIsLiveListening(false);
    };

    recognition.start();
  };

  const handleUpdate9Router = (key: keyof NineRouterConfig, value: any) => {
    const updated = saveNineRouterConfig({ [key]: value });
    setNineRouterConfig(updated);
  };

  const handlePresetSelect = (preset: 'local' | 'tunnel' | 'tailscale') => {
    let endpoint = 'http://localhost:20128/v1';
    if (preset === 'tunnel') endpoint = 'https://ai.tu-dominio.com/v1';
    if (preset === 'tailscale') endpoint = 'http://100.x.x.x:20128/v1';
    handleUpdate9Router('type', preset);
    handleUpdate9Router('endpoint', endpoint);
  };

  // Color tokens
  const bgMain = isDark ? '#131314' : '#F0F4F9';
  const bgCard = isDark ? '#1E1F20' : '#FFFFFF';
  const bgInput = isDark ? '#1E1F20' : '#FFFFFF';
  const textPrimary = isDark ? '#E3E3E3' : '#1F1F1F';
  const textSecondary = isDark ? '#9AA0A6' : '#5F6368';
  const borderCol = isDark ? '#2D2F31' : '#E0E2E7';

  return (
    <div
      style={{
        backgroundColor: bgMain,
        color: textPrimary,
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. Header (Gemini Minimalist & Elegant) */}
      <header
        style={{
          height: '60px',
          borderBottom: `1px solid ${borderCol}`,
          backgroundColor: bgCard,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 30,
          flexShrink: 0,
        }}
      >
        {/* Left: Sidebar toggle + GK Emblem & Gemini text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '8px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Barra lateral"
          >
            <Menu style={{ width: '20px', height: '20px' }} />
          </button>

          {/* Golden GK Logo Emblem (Vintage Mic & Golden Letters) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FDE68A 0%, #D97706 50%, #78350F 100%)',
                boxShadow: '0 2px 10px rgba(217, 119, 6, 0.35)',
                border: '2px solid rgba(253, 230, 138, 0.5)',
              }}
            >
              <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#FFF', fontSize: '15px' }}>
                GK
              </span>
              <Mic
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '14px',
                  height: '14px',
                  color: '#451A03',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '18px',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #60A5FA, #818CF8, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Gemini
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
                  color: isDark ? '#FCD34D' : '#92400E',
                }}
              >
                GKing
              </span>
            </div>
          </div>
        </div>

        {/* Center: Prominent Creative Mode Switchers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px',
            borderRadius: '9999px',
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${borderCol}`,
          }}
        >
          <button
            onClick={() => setActiveMode('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: activeMode === 'chat' ? '#2563EB' : 'transparent',
              color: activeMode === 'chat' ? '#FFFFFF' : textSecondary,
            }}
          >
            <MessageSquare style={{ width: '14px', height: '14px' }} />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveMode('image')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: activeMode === 'image' ? '#4F46E5' : 'transparent',
              color: activeMode === 'image' ? '#FFFFFF' : textSecondary,
            }}
          >
            <ImageIcon style={{ width: '14px', height: '14px' }} />
            <span>Imagen Studio</span>
          </button>

          <button
            onClick={() => setActiveMode('video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: activeMode === 'video' ? '#9333EA' : 'transparent',
              color: activeMode === 'video' ? '#FFFFFF' : textSecondary,
            }}
          >
            <Video style={{ width: '14px', height: '14px' }} />
            <span>Veo 3 Video</span>
          </button>

          <button
            onClick={() => setActiveMode('live')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: activeMode === 'live' ? '#D97706' : 'transparent',
              color: activeMode === 'live' ? '#FFFFFF' : textSecondary,
            }}
          >
            <Mic style={{ width: '14px', height: '14px' }} />
            <span>Gemini Live</span>
          </button>
        </div>

        {/* Right: 9Router + Model Selector + Dark/Light Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 9Router Button */}
          <button
            onClick={() => setIs9RouterOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: `1px solid ${nineRouterConfig.enabled ? 'rgba(249, 115, 22, 0.4)' : borderCol}`,
              backgroundColor: nineRouterConfig.enabled ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              color: nineRouterConfig.enabled ? '#FB923C' : textSecondary,
            }}
            title="Configurar 9Router Proxy"
          >
            <Network style={{ width: '14px', height: '14px' }} />
            <span>9Router</span>
            {nineRouterConfig.enabled && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#34D399',
                  boxShadow: '0 0 8px #34D399',
                }}
              />
            )}
          </button>

          {/* Model Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setIsModelMenuOpen(!isModelMenuOpen);
                setIsRoleMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${borderCol}`,
                backgroundColor: bgCard,
                color: textPrimary,
              }}
            >
              <Sparkles style={{ width: '13px', height: '13px', color: '#60A5FA' }} />
              <span>{MODELS.find((m) => m.id === selectedModel)?.name}</span>
              <ChevronDown style={{ width: '13px', height: '13px', color: textSecondary }} />
            </button>

            {isModelMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '6px',
                  width: '280px',
                  borderRadius: '16px',
                  padding: '8px',
                  backgroundColor: bgCard,
                  border: `1px solid ${borderCol}`,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                  zIndex: 50,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, padding: '4px 8px' }}>
                  MODELOS DE GEMINI
                </div>
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setIsModelMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: selectedModel === m.id ? (isDark ? '#263859' : '#DBEAFE') : 'transparent',
                      color: selectedModel === m.id ? '#93C5FD' : textPrimary,
                      cursor: 'pointer',
                      marginBottom: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(59,130,246,0.15)' }}>
                        {m.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Persona / Role Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setIsRoleMenuOpen(!isRoleMenuOpen);
                setIsModelMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${borderCol}`,
                backgroundColor: bgCard,
                color: textPrimary,
              }}
              title="Rol del Asistente"
            >
              <SlidersHorizontal style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
            </button>

            {isRoleMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '6px',
                  width: '240px',
                  borderRadius: '16px',
                  padding: '8px',
                  backgroundColor: bgCard,
                  border: `1px solid ${borderCol}`,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                  zIndex: 50,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, padding: '4px 8px' }}>
                  ROLES Y PERSONALIDADES
                </div>
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRole(r.id);
                        setIsRoleMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: selectedRole === r.id ? (isDark ? '#3D311E' : '#FEF3C7') : 'transparent',
                        color: selectedRole === r.id ? '#FDE68A' : textPrimary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      <Icon style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
                      <span>{r.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              padding: '8px',
              borderRadius: '12px',
              border: `1px solid ${borderCol}`,
              backgroundColor: bgCard,
              color: textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Cambiar tema"
          >
            {isDark ? (
              <Sun style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
            ) : (
              <Moon style={{ width: '14px', height: '14px', color: '#3B82F6' }} />
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Content Frame */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <aside
            style={{
              width: '260px',
              borderRight: `1px solid ${borderCol}`,
              backgroundColor: bgCard,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* New Chat Button */}
            <div style={{ padding: '12px' }}>
              <button
                onClick={handleNewChat}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(90deg, #2563EB, #4F46E5)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                <span>Nuevo chat</span>
              </button>
            </div>

            {/* Recent Conversations */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, padding: '4px 8px' }}>
                RECENTES
              </div>
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCurrentChatId(c.id);
                    setActiveMode('chat');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: currentChatId === c.id && activeMode === 'chat'
                      ? (isDark ? '#282A2C' : '#E9EEF6')
                      : 'transparent',
                    color: currentChatId === c.id && activeMode === 'chat' ? '#60A5FA' : textPrimary,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <MessageSquare style={{ width: '14px', height: '14px', flexShrink: 0, opacity: 0.6 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(c.id, e)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: textSecondary,
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    title="Eliminar chat"
                  >
                    <Trash2 style={{ width: '12px', height: '12px' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Sidebar Bottom: 9Router status */}
            <div style={{ padding: '12px', borderTop: `1px solid ${borderCol}` }}>
              <button
                onClick={() => setIs9RouterOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: `1px solid ${borderCol}`,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  color: textSecondary,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Network style={{ width: '14px', height: '14px', color: '#FB923C' }} />
                  <span style={{ fontWeight: 600 }}>9Router Proxy</span>
                </div>
                <span style={{ fontWeight: 700, color: nineRouterConfig.enabled ? '#34D399' : textSecondary }}>
                  {nineRouterConfig.enabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </aside>
        )}

        {/* 3. Center Canvas (Chat, Image, Video, Live) */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: bgMain,
          }}
        >
          {/* ================= CHAT MODE ================= */}
          {activeMode === 'chat' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
              }}
            >
              {/* Thread (Scrollable Area) */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {currentChat.messages.length === 0 ? (
                  /* Gemini Welcome Hero */
                  <div
                    style={{
                      margin: 'auto',
                      maxWidth: '680px',
                      width: '100%',
                      padding: '24px 0',
                    }}
                  >
                    <div style={{ marginBottom: '24px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#60A5FA',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginBottom: '16px',
                        }}
                      >
                        <Sparkles style={{ width: '13px', height: '13px' }} />
                        <span>Potenciado con Gemini 3.5, Imagen 3 & Veo 3</span>
                      </div>

                      <h1
                        style={{
                          fontSize: '40px',
                          fontWeight: 800,
                          lineHeight: '1.15',
                          letterSpacing: '-0.03em',
                          background: 'linear-gradient(90deg, #60A5FA 0%, #A78BFA 50%, #F59E0B 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          margin: '0 0 12px 0',
                        }}
                      >
                        Hola, ¿en qué puedo ayudarte hoy?
                      </h1>

                      <p style={{ fontSize: '15px', color: textSecondary, margin: 0, lineHeight: 1.5 }}>
                        Haz una consulta, crea imágenes con Imagen 3, genera videos cinemáticos con Veo 3 o
                        conversa por voz en tiempo real.
                      </p>
                    </div>

                    {/* Suggestions Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {SUGGESTIONS.map((s, idx) => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (s.mode === 'image') setActiveMode('image');
                              else if (s.mode === 'video') setActiveMode('video');
                              else handleSendMessage(s.desc);
                            }}
                            style={{
                              padding: '16px',
                              borderRadius: '20px',
                              border: `1px solid ${borderCol}`,
                              backgroundColor: bgCard,
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              cursor: 'pointer',
                              color: textPrimary,
                              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            }}
                          >
                            <div
                              style={{
                                padding: '10px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                color: '#60A5FA',
                                flexShrink: 0,
                              }}
                            >
                              <Icon style={{ width: '16px', height: '16px' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.title}</div>
                              <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                                {s.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Messages List */
                  <div style={{ maxWidth: '768px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {currentChat.messages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {m.role === 'model' && (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                            }}
                          >
                            <Sparkles style={{ width: '16px', height: '16px', color: '#FFF' }} />
                          </div>
                        )}

                        <div
                          style={{
                            maxWidth: '82%',
                            borderRadius: '20px',
                            padding: '16px 20px',
                            backgroundColor: m.role === 'user'
                              ? (isDark ? '#282A2C' : '#2563EB')
                              : bgCard,
                            color: m.role === 'user'
                              ? '#FFFFFF'
                              : textPrimary,
                            border: `1px solid ${m.role === 'user' ? 'transparent' : borderCol}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            fontSize: '14px',
                            lineHeight: 1.6,
                          }}
                        >
                          {m.image && (
                            <div style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden' }}>
                              <img src={m.image} alt="Adjunto" style={{ maxWidth: '100%', borderRadius: '12px' }} />
                            </div>
                          )}

                          <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                          {m.role === 'model' && (
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '8px',
                                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '11px',
                                color: textSecondary,
                              }}
                            >
                              <button
                                onClick={() => handleCopy(m.text, m.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: textSecondary,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                {copiedId === m.id ? (
                                  <>
                                    <Check style={{ width: '13px', height: '13px', color: '#34D399' }} />
                                    <span style={{ color: '#34D399' }}>Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy style={{ width: '13px', height: '13px' }} />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleSpeak(m.text)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: textSecondary,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                <Volume2 style={{ width: '13px', height: '13px' }} />
                                <span>Escuchar</span>
                              </button>

                              {m.provider && (
                                <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: isDark ? '#282A2C' : '#E5E7EB' }}>
                                  {m.provider}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {m.role === 'user' && (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D97706, #78350F)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontWeight: 900,
                              fontSize: '11px',
                              color: '#FFF',
                            }}
                          >
                            GK
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sparkles style={{ width: '16px', height: '16px', color: '#FFF' }} />
                        </div>
                        <div
                          style={{
                            padding: '12px 18px',
                            borderRadius: '16px',
                            backgroundColor: bgCard,
                            border: `1px solid ${borderCol}`,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: textSecondary,
                          }}
                        >
                          <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                          <span>Gemini está respondiendo...</span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Pinned Bottom Floating Prompt Pill Bar (Authentic Google Gemini Bar) */}
              <div
                style={{
                  padding: '12px 16px 16px 16px',
                  backgroundColor: 'transparent',
                  flexShrink: 0,
                }}
              >
                <div style={{ maxWidth: '768px', width: '100%', margin: '0 auto' }}>
                  {/* Attachment thumbnail */}
                  {attachedImage && (
                    <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                      <img
                        src={attachedImage}
                        alt="Adjunto"
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #3B82F6' }}
                      />
                      <button
                        onClick={() => setAttachedImage(null)}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          backgroundColor: '#EF4444',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                  )}

                  {/* Capsule / Pill Shape Input Box */}
                  <div
                    style={{
                      borderRadius: '28px',
                      backgroundColor: bgInput,
                      border: `1px solid ${borderCol}`,
                      boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '8px 12px',
                      gap: '8px',
                    }}
                  >
                    {/* Attachment button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '10px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: textSecondary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Adjuntar imagen"
                    >
                      <Paperclip style={{ width: '18px', height: '18px' }} />
                    </button>

                    {/* Auto-expanding Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={inputPrompt}
                      onChange={(e) => setInputPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Escribe un mensaje a Gemini..."
                      rows={1}
                      style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        color: textPrimary,
                        fontSize: '14px',
                        lineHeight: 1.5,
                        padding: '8px 4px',
                        minHeight: '36px',
                        maxHeight: '160px',
                        fontFamily: 'inherit',
                      }}
                    />

                    {/* Gemini Live voice button */}
                    <button
                      onClick={() => setActiveMode('live')}
                      style={{
                        padding: '10px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: '#F59E0B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Gemini Live Voice"
                    >
                      <Mic style={{ width: '18px', height: '18px' }} />
                    </button>

                    {/* Send Button */}
                    <button
                      disabled={isLoading || (!inputPrompt.trim() && !attachedImage)}
                      onClick={() => handleSendMessage()}
                      style={{
                        padding: '10px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: inputPrompt.trim() || attachedImage ? '#2563EB' : (isDark ? '#282A2C' : '#E5E7EB'),
                        color: inputPrompt.trim() || attachedImage ? '#FFFFFF' : textSecondary,
                        cursor: inputPrompt.trim() || attachedImage ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      title="Enviar mensaje"
                    >
                      <ArrowUp style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>

                  {/* Gemini Disclaimer */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '11px',
                      color: textSecondary,
                      marginTop: '6px',
                    }}
                  >
                    Gemini puede cometer errores. Verifica la información importante.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= IMAGEN STUDIO MODE ================= */}
          {activeMode === 'image' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ImageIcon style={{ width: '24px', height: '24px', color: '#818CF8' }} />
                      Imagen Studio
                    </h2>
                    <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                      Crea y edita imágenes de alta fidelidad con <code style={{ color: '#818CF8' }}>gemini-nano-banana-2.1</code>
                    </p>
                  </div>

                  <div style={{ display: 'flex', padding: '4px', borderRadius: '12px', backgroundColor: bgCard, border: `1px solid ${borderCol}` }}>
                    <button
                      onClick={() => setImageMode('create')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: imageMode === 'create' ? '#4F46E5' : 'transparent',
                        color: imageMode === 'create' ? '#FFFFFF' : textSecondary,
                      }}
                    >
                      Crear nueva
                    </button>
                    <button
                      onClick={() => setImageMode('edit')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: imageMode === 'edit' ? '#4F46E5' : 'transparent',
                        color: imageMode === 'edit' ? '#FFFFFF' : textSecondary,
                      }}
                    >
                      Editar existente
                    </button>
                  </div>
                </div>

                {imageMode === 'edit' && (
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Imagen de referencia para editar</div>
                    {inputEditImage ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={inputEditImage} alt="Base" style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '12px' }} />
                        <button
                          onClick={() => setInputEditImage(null)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            backgroundColor: '#EF4444',
                            color: '#FFF',
                            borderRadius: '50%',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          <X style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const r = new FileReader();
                            r.onload = () => setInputEditImage(r.result as string);
                            r.readAsDataURL(f);
                          }
                        }}
                        style={{ fontSize: '12px' }}
                      />
                    )}
                  </div>
                )}

                {/* Aspect ratio */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Relación de aspecto</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['1:1', '16:9', '9:16', '4:3'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setImageAspectRatio(r)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${imageAspectRatio === r ? '#4F46E5' : borderCol}`,
                          backgroundColor: imageAspectRatio === r ? '#4F46E5' : 'transparent',
                          color: imageAspectRatio === r ? '#FFFFFF' : textPrimary,
                        }}
                      >
                        {r === '1:1' ? '1:1 Cuadrado' : r === '16:9' ? '16:9 Paisaje' : r === '9:16' ? '9:16 Vertical' : '4:3'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt bar */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}`, display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                    placeholder="Describe la imagen artística que deseas generar con Gemini..."
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: `1px solid ${borderCol}`,
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: textPrimary,
                      outline: 'none',
                    }}
                  />
                  <button
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    onClick={handleGenerateImage}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      backgroundColor: '#4F46E5',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isGeneratingImage ? <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : <Wand2 style={{ width: '14px', height: '14px' }} />}
                    <span>{imageMode === 'create' ? 'Generar' : 'Editar'}</span>
                  </button>
                </div>

                {/* Gallery */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: textSecondary, marginBottom: '12px' }}>CREACIONES RECIENTES</div>
                  {generatedImages.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', borderRadius: '16px', border: `1px dashed ${borderCol}`, color: textSecondary, fontSize: '13px' }}>
                      Las imágenes generadas aparecerán aquí.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                      {generatedImages.map((img, i) => (
                        <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${borderCol}`, backgroundColor: bgCard }}>
                          <img src={img.url} alt={img.prompt} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                          <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '11px', color: textSecondary, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {img.prompt}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <a
                                href={img.url}
                                download={`gemini-image-${i}.png`}
                                style={{
                                  flex: 1,
                                  textAlign: 'center',
                                  padding: '6px',
                                  borderRadius: '8px',
                                  backgroundColor: isDark ? '#282A2C' : '#E5E7EB',
                                  color: textPrimary,
                                  fontSize: '11px',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                              >
                                Descargar
                              </a>
                              <button
                                onClick={() => {
                                  setInputEditImage(img.url);
                                  setImageMode('edit');
                                }}
                                style={{
                                  flex: 1,
                                  padding: '6px',
                                  borderRadius: '8px',
                                  backgroundColor: '#4F46E5',
                                  color: '#FFF',
                                  border: 'none',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Editar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= VEO 3 VIDEO MODE ================= */}
          {activeMode === 'video' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
              <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video style={{ width: '24px', height: '24px', color: '#A855F7' }} />
                    Veo 3 Video Studio
                  </h2>
                  <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                    Genera video cinematográfico a partir de texto con <code style={{ color: '#A855F7' }}>veo-3.1-fast-generate-preview</code>
                  </p>
                </div>

                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Formato cinematográfico</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => setVideoAspectRatio('16:9')}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1px solid ${videoAspectRatio === '16:9' ? '#9333EA' : borderCol}`,
                        backgroundColor: videoAspectRatio === '16:9' ? 'rgba(147, 51, 234, 0.15)' : 'transparent',
                        color: videoAspectRatio === '16:9' ? '#C084FC' : textPrimary,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>16:9 Paisaje Horizontal</div>
                      <div style={{ fontSize: '11px', color: textSecondary }}>Pantallas y YouTube</div>
                    </button>

                    <button
                      onClick={() => setVideoAspectRatio('9:16')}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1px solid ${videoAspectRatio === '9:16' ? '#9333EA' : borderCol}`,
                        backgroundColor: videoAspectRatio === '9:16' ? 'rgba(147, 51, 234, 0.15)' : 'transparent',
                        color: videoAspectRatio === '9:16' ? '#C084FC' : textPrimary,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>9:16 Vertical Móvil</div>
                      <div style={{ fontSize: '11px', color: textSecondary }}>Reels, Shorts y TikTok</div>
                    </button>
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Indicaciones para la toma Veo 3</div>
                  <textarea
                    rows={3}
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Ejemplo: Dron en cámara lenta sobrevolando una ciudad cyberpunk con lluvia de luces de neón reflejadas en el asfalto, 4K..."
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: `1px solid ${borderCol}`,
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: textPrimary,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      disabled={isGeneratingVideo || !videoPrompt.trim()}
                      onClick={handleGenerateVideo}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        background: 'linear-gradient(90deg, #9333EA, #4F46E5)',
                        color: '#FFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isGeneratingVideo ? <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : <Video style={{ width: '14px', height: '14px' }} />}
                      <span>Generar Video</span>
                    </button>
                  </div>
                </div>

                {videoResult && (
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#C084FC', marginBottom: '8px' }}>Resultado Veo 3</div>
                    {videoResult.videoUri ? (
                      <video controls src={videoResult.videoUri} style={{ width: '100%', borderRadius: '12px' }} />
                    ) : (
                      <div style={{ fontSize: '12px', color: textSecondary }}>
                        {videoResult.message || 'Solicitud enviada a Veo 3.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= GEMINI LIVE MODE ================= */}
          {activeMode === 'live' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
              <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    color: '#F59E0B',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Mic style={{ width: '13px', height: '13px' }} />
                  <span>Gemini Live (gemini-3.8-live)</span>
                </div>

                <h2 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Conversación por Voz</h2>
                <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>Habla con libertad. Gemini responderá al instante con voz.</p>

                {/* Animated Orb */}
                <div
                  onClick={toggleLiveVoice}
                  style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: isLiveListening
                      ? 'linear-gradient(135deg, #3B82F6, #8B5CF6, #F59E0B)'
                      : 'linear-gradient(135deg, #27272A, #3F3F46)',
                    boxShadow: isLiveListening ? '0 0 50px rgba(59, 130, 246, 0.6)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  <div
                    style={{
                      width: '150px',
                      height: '150px',
                      borderRadius: '50%',
                      backgroundColor: bgMain,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isLiveListening ? (
                      <>
                        <Mic style={{ width: '36px', height: '36px', color: '#F59E0B' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em' }}>EN VIVO</span>
                      </>
                    ) : (
                      <>
                        <MicOff style={{ width: '36px', height: '36px', color: textSecondary }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, letterSpacing: '0.1em' }}>PAUSADO</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ padding: '14px 20px', borderRadius: '16px', backgroundColor: bgCard, border: `1px solid ${borderCol}`, width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', marginBottom: '4px' }}>
                    {isLiveListening ? 'TRANSCRIPCIÓN EN TIEMPO REAL' : 'ESTADO'}
                  </div>
                  <div style={{ fontSize: '13px', fontStyle: 'italic', color: textPrimary }}>
                    {liveTranscript || liveStatus}
                  </div>
                </div>

                <button
                  onClick={toggleLiveVoice}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '9999px',
                    backgroundColor: isLiveListening ? '#EF4444' : '#2563EB',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  }}
                >
                  {isLiveListening ? 'Detener conversación' : 'Iniciar conversación'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. 9Router Configuration Modal (Matches Screenshot) */}
      {is9RouterOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '24px',
              backgroundColor: bgCard,
              border: `1px solid ${borderCol}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FB923C' }}>
                  <Network style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>9Router Proxy</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(249, 115, 22, 0.2)', color: '#FB923C' }}>
                      v0.5.95
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: textSecondary }}>AI Infrastructure Management</div>
                </div>
              </div>
              <button
                onClick={() => setIs9RouterOpen(false)}
                style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Toggle switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '14px', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${borderCol}` }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Enrutar a través de 9Router</div>
                  <div style={{ fontSize: '11px', color: textSecondary }}>Envía las solicitudes al proxy local o de túnel</div>
                </div>
                <button
                  onClick={() => handleUpdate9Router('enabled', !nineRouterConfig.enabled)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: nineRouterConfig.enabled ? '#EA580C' : (isDark ? '#3F3F46' : '#D1D5DB'),
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: nineRouterConfig.enabled ? '23px' : '3px',
                      transition: 'all 0.2s',
                    }}
                  />
                </button>
              </div>

              {/* Endpoint Preset buttons */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, marginBottom: '6px' }}>
                  TIPO DE PUNTO FINAL (PRESET)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {(['local', 'tunnel', 'tailscale'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetSelect(preset)}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        border: `1px solid ${nineRouterConfig.type === preset ? '#EA580C' : borderCol}`,
                        backgroundColor: nineRouterConfig.type === preset ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                        color: nineRouterConfig.type === preset ? '#FB923C' : textPrimary,
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoint URL Input */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, marginBottom: '6px' }}>
                  API ENDPOINT (URL)
                </div>
                <input
                  type="text"
                  value={nineRouterConfig.endpoint}
                  onChange={(e) => handleUpdate9Router('endpoint', e.target.value)}
                  placeholder="http://localhost:20128/v1"
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: `1px solid ${borderCol}`,
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: textPrimary,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* API Key */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, marginBottom: '6px' }}>
                  API KEY DE 9ROUTER (OPCIONAL)
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={nineRouterConfig.apiKey}
                    onChange={(e) => handleUpdate9Router('apiKey', e.target.value)}
                    placeholder="sk-9router-..."
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: `1px solid ${borderCol}`,
                      borderRadius: '12px',
                      padding: '10px 40px 10px 14px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: textPrimary,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      border: 'none',
                      background: 'transparent',
                      color: textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    {showApiKey ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                  </button>
                </div>
              </div>

              {testStatus && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.25)', fontSize: '12px', color: '#FB923C' }}>
                  {testStatus}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setTestStatus('Probando conexión con ' + nineRouterConfig.endpoint + '...');
                  fetch('/api/gemini/router', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messages: [{ role: 'user', text: 'ping' }],
                      nineRouter: nineRouterConfig,
                    }),
                  })
                    .then((r) => r.json())
                    .then((d) => setTestStatus('✅ Conexión probada: ' + (d.provider || 'OK')))
                    .catch((e) => setTestStatus('⚠️ Error: ' + e.message));
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${borderCol}`,
                  background: 'transparent',
                  color: textPrimary,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Probar conexión
              </button>

              <button
                onClick={() => setIs9RouterOpen(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#EA580C',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
