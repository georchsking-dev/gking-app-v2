import * as React from 'react';

import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import {
  Box, Button, Chip, CircularProgress, IconButton, Sheet, Stack, Textarea, Tooltip, Typography,
} from '@mui/joy';

import { optimaOpenModels } from '~/common/layout/optima/useOptima';
import { isLLMVisible } from '~/common/stores/llms/llms.types';
import { getChatLLMId, useModelsStore } from '~/common/stores/llms/store-llms';
import type { ModelVendorId } from '~/modules/llms/vendors/vendors.registry';

import {
  abortJorgisRequest, appendLocalExchange, askGKing, clearJorgisHistory, loadJorgisHistory,
  type JorgisHistoryMessage, type JorgisImageAttachment,
} from './jorgis-gking';
import { JorgisOrb, type JorgisState } from './JorgisOrb';
import { JorgisSettings } from './JorgisSettings';
import { useJorgisVoice } from './useJorgisVoice';

type Health = { status: string; ollama: boolean; model?: string };
type LocalReply = { response: string; audio_url?: string; payload?: { model_used?: string }; refresh_dashboard?: boolean };
type RequestKind = 'conversation' | 'image' | 'video' | 'music';
type Attachment =
  | { id: string; kind: 'text'; name: string; text: string; size: number }
  | { id: string; kind: 'image'; name: string; mimeType: string; file: File; size: number };

const PREFERENCES_KEY = 'gking.jorgis.preferences.v2';
const LEGACY_PREFERENCES_KEY = 'gking.jorgis.preferences.v1';
const LOCAL_ACTION_PATTERN = /\b(abre|abrir|ejecuta|busca(?:r)? (?:el |un |una )?(?:archivo|carpeta|proyecto)|recu[eé]rdame|recordatorio|alarma|tarea|estado del sistema|hora|fecha|volumen|apaga|reinicia|clima|noticias|git)\b/i;
const STOP_PATTERN = /^(?:jorgis[, ]*)?(?:detente|para|deja de hablar|silencio)$/i;
const LISTEN_PATTERN = /^(?:jorgis[, ]*)?(?:vuelve a escuchar|escucha de nuevo)$/i;
const AUTO_MODEL_PATTERN = /\b(?:modelo |modo )?autom[aá]tico\b/i;
const PROVIDER_NAMES: ReadonlyArray<{ id: ModelVendorId; pattern: RegExp }> = [
  { id: 'openai', pattern: /\b(openai|chatgpt)\b/i },
  { id: 'googleai', pattern: /\b(gemini|google ai)\b/i },
  { id: 'openrouter', pattern: /\bopenrouter\b/i },
  { id: 'groq', pattern: /\bgroq\b/i },
  { id: 'anthropic', pattern: /\b(anthropic|claude)\b/i },
  { id: 'xai', pattern: /\b(xai|grok)\b/i },
  { id: 'mistral', pattern: /\bmistral\b/i },
  { id: 'huggingface', pattern: /\b(hugging ?face)\b/i },
];
const PROVIDER_LABELS: Partial<Record<ModelVendorId, string>> = {
  openai: 'OpenAI', googleai: 'Gemini', openrouter: 'OpenRouter', groq: 'Groq',
  anthropic: 'Anthropic', xai: 'xAI / Grok', mistral: 'Mistral', huggingface: 'Hugging Face',
  ollama: 'Ollama', lmstudio: 'LM Studio', localai: 'LocalAI',
};
const PROVIDER_COMMAND_PATTERN = /\b(usa|usar|utiliza|utilizar|cambia|cambiar|modelo|proveedor|preg[uú]ntale a)\b/i;
const TEXT_FILE_PATTERN = /\.(txt|md|markdown|json|csv|tsv|js|jsx|ts|tsx|css|html|xml|yaml|yml|py|ps1|sql|log)$/i;

function loadPreferences(): { autoSpeak: boolean; continuous: boolean } {
  if (typeof window === 'undefined') return { autoSpeak: true, continuous: true };
  try {
    const current = window.localStorage.getItem(PREFERENCES_KEY);
    const value = JSON.parse(current || window.localStorage.getItem(LEGACY_PREFERENCES_KEY) || '{}');
    return { autoSpeak: value.autoSpeak !== false, continuous: current ? value.continuous !== false : true };
  } catch {
    return { autoSpeak: true, continuous: true };
  }
}

function stripWakeWord(text: string): string {
  return text.trim().replace(/^(?:jorgis|georgie)[,.:;\s]+/i, '').trim();
}

function providerFromCommand(text: string): ModelVendorId | undefined {
  if (!PROVIDER_COMMAND_PATTERN.test(text)) return undefined;
  return PROVIDER_NAMES.find(provider => provider.pattern.test(text))?.id;
}

function providerLabel(provider: ModelVendorId): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

function classifyRequest(text: string): RequestKind {
  if (/\b(crea|crear|genera|generar|haz|dibuja|diseña|edita)\b.{0,35}\b(imagen|foto|ilustraci[oó]n|logo|poster)\b/i.test(text)) return 'image';
  if (/\b(crea|crear|genera|generar|haz)\b.{0,35}\b(video|clip|animaci[oó]n)\b/i.test(text)) return 'video';
  if (/\b(crea|crear|genera|generar|comp[oó]n)\b.{0,35}\b(m[uú]sica|canci[oó]n|audio)\b/i.test(text)) return 'music';
  return 'conversation';
}

function isSupportedTextFile(file: File): boolean {
  return file.type.startsWith('text/') || file.type === 'application/json' || TEXT_FILE_PATTERN.test(file.name);
}

function composeRequest(text: string, attachments: Attachment[]): string {
  if (!attachments.length) return text;
  const files = attachments.map(file => file.kind === 'text'
    ? `\n--- Archivo: ${file.name} ---\n${file.text}`
    : `\n--- Imagen adjunta: ${file.name} ---`).join('\n');
  return `${text}\n\nArchivos adjuntos:${files}`;
}

export function AppGeorgie() {
  const initialPreferences = React.useMemo(loadPreferences, []);
  const [health, setHealth] = React.useState<Health>({ status: 'checking', ollama: false });
  const [assistantState, setAssistantState] = React.useState<JorgisState>('idle');
  const [activity, setActivity] = React.useState('Listo para ayudarte');
  const [prompt, setPrompt] = React.useState('');
  const [history, setHistory] = React.useState<JorgisHistoryMessage[]>([]);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [showComposer, setShowComposer] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = React.useState(initialPreferences.autoSpeak);
  const [continuousConversation, setContinuousConversation] = React.useState(initialPreferences.continuous);
  const [conversationActive, setConversationActive] = React.useState(false);
  const models = useModelsStore(state => state.llms);
  const assignedModelId = useModelsStore(state => state.modelAssignments.primaryChat?.modelId);
  const assignModel = useModelsStore(state => state.assignDomainModelId);
  const activeModelId = assignedModelId ?? getChatLLMId();
  const activeModel = models.find(model => model.id === activeModelId);
  const requestControllerRef = React.useRef<AbortController | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const speakingUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const restartTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationActiveRef = React.useRef(conversationActive);
  const submitRef = React.useRef<(text: string, fromVoice: boolean) => Promise<void>>(async () => undefined);
  const voiceFinalHandler = React.useCallback((text: string) => { void submitRef.current(text, true); }, []);
  const voice = useJorgisVoice(voiceFinalHandler);

  React.useEffect(() => { conversationActiveRef.current = conversationActive; }, [conversationActive]);
  React.useEffect(() => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ autoSpeak, continuous: continuousConversation }));
  }, [autoSpeak, continuousConversation]);

  const refreshHistory = React.useCallback(async () => {
    try { setHistory(await loadJorgisHistory()); } catch { /* IndexedDB can be unavailable in private mode. */ }
  }, []);

  const checkHealth = React.useCallback(async () => {
    try {
      const response = await fetch('/api/georgie/health');
      const data = await response.json();
      setHealth(response.ok ? data : { status: 'offline', ollama: false });
    } catch {
      setHealth({ status: 'offline', ollama: false });
    }
  }, []);

  React.useEffect(() => {
    void checkHealth();
    void refreshHistory();
    const timer = window.setInterval(() => void checkHealth(), 30_000);
    const routeStatus = (event: Event) => {
      if ((event as CustomEvent).detail?.status === 'failover') {
        setAssistantState('executing');
        setActivity('Cambiando automáticamente de modelo…');
      }
    };
    window.addEventListener('gking:route-status', routeStatus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('gking:route-status', routeStatus);
      requestControllerRef.current?.abort();
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [checkHealth, refreshHistory]);

  const restartListening = React.useCallback(() => {
    if (!conversationActiveRef.current) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      setActivity('Listo para escucharte');
      void voice.startListening();
    }, 500);
  }, [voice]);

  const finishSpeaking = React.useCallback(() => {
    setSpeaking(false);
    speakingUtteranceRef.current = null;
    audioRef.current = null;
    setAssistantState('idle');
    setActivity('Listo para ayudarte');
    restartListening();
  }, [restartListening]);

  const speakWithBrowser = React.useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      finishSpeaking();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_]/g, ' '));
    utterance.lang = 'es-MX';
    utterance.rate = 1.02;
    utterance.pitch = .92;
    const voiceMatch = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('es-mx'))
      ?? window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('es'));
    if (voiceMatch) utterance.voice = voiceMatch;
    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;
    speakingUtteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [finishSpeaking]);

  const speakResponse = React.useCallback((text: string, audioUrl?: string) => {
    voice.abortListening();
    setSpeaking(true);
    setAssistantState('speaking');
    setActivity('Jorgis está respondiendo por voz');
    if (!audioUrl) {
      speakWithBrowser(text);
      return;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = finishSpeaking;
    audio.onerror = () => speakWithBrowser(text);
    void audio.play().catch(() => speakWithBrowser(text));
  }, [finishSpeaking, speakWithBrowser, voice]);

  const stopPlayback = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    speakingUtteranceRef.current = null;
    setSpeaking(false);
  }, []);

  const stopEverything = React.useCallback(() => {
    setConversationActive(false);
    voice.abortListening();
    stopPlayback();
    requestControllerRef.current?.abort();
    void abortJorgisRequest();
    setBusy(false);
    setAssistantState('idle');
    setActivity('Conversación detenida');
  }, [stopPlayback, voice]);

  const deliverSimpleReply = React.useCallback(async (userText: string, response: string) => {
    await appendLocalExchange(userText, response);
    await refreshHistory();
    setAssistantState('idle');
    setActivity(response);
    if (autoSpeak) speakResponse(response);
    else restartListening();
  }, [autoSpeak, refreshHistory, restartListening, speakResponse]);

  submitRef.current = async (rawText: string, fromVoice: boolean) => {
    const spokenText = stripWakeWord(rawText);
    const cleanText = spokenText.trim();
    if (!cleanText || busy) return;

    setNotice(null);
    if (STOP_PATTERN.test(rawText.trim()) || STOP_PATTERN.test(cleanText)) {
      stopEverything();
      return;
    }
    if (LISTEN_PATTERN.test(rawText.trim()) || LISTEN_PATTERN.test(cleanText)) {
      setConversationActive(continuousConversation);
      void voice.startListening();
      return;
    }

    if (AUTO_MODEL_PATTERN.test(cleanText) && PROVIDER_COMMAND_PATTERN.test(cleanText)) {
      setPrompt('');
      setShowComposer(false);
      assignModel('primaryChat', undefined);
      await deliverSimpleReply(rawText, 'Entendido. Volví al modo automático.');
      return;
    }
    const requestedProvider = providerFromCommand(cleanText);
    if (requestedProvider && !/[?¿]/.test(cleanText) && cleanText.split(/\s+/).length <= 8) {
      setPrompt('');
      setShowComposer(false);
      const requestedModel = models.find(model => model.vId === requestedProvider && isLLMVisible(model));
      if (!requestedModel) {
        await deliverSimpleReply(rawText, `${providerLabel(requestedProvider)} todavía no tiene modelos configurados. Puedes agregarlo en Configuración.`);
        return;
      }
      assignModel('primaryChat', requestedModel.id);
      await deliverSimpleReply(rawText, `Entendido. Usaré ${requestedModel.label} de ${providerLabel(requestedProvider)}.`);
      return;
    }

    const displayText = rawText.trim();
    const requestText = composeRequest(cleanText, attachments);
    const requestKind = classifyRequest(cleanText);
    const imageAttachments: JorgisImageAttachment[] = attachments
      .filter((file): file is Extract<Attachment, { kind: 'image' }> => file.kind === 'image')
      .map(file => ({ name: file.name, mimeType: file.mimeType, file: file.file }));
    setPrompt('');
    setAttachments([]);
    setShowComposer(false);
    setBusy(true);
    setAssistantState('thinking');
    setActivity('Enviando al modelo activo…');
    if (fromVoice && continuousConversation)
      setConversationActive(true);
    voice.stopListening();

    try {
      let responseText = '';
      let audioUrl: string | undefined;
      let providerError = '';
      const useLocal = !imageAttachments.length && LOCAL_ACTION_PATTERN.test(cleanText) && !providerFromCommand(cleanText);

      if (!useLocal) {
        const route = await askGKing(requestText, imageAttachments, requestKind);
        if (route.available && (route.response || route.mediaCreated)) {
          responseText = route.response || (route.mediaCreated === 'video' ? 'Listo. Creé el video.' : 'Listo. Creé la imagen.');
          setActivity(route.retries
            ? `Respuesta lista · cambié a ${route.model ?? 'otro modelo'}`
            : 'Respuesta lista');
        }
        if (!route.available && route.errors?.length) {
          providerError = route.errors.join('\n');
          console.warn('[Jorgis] El modelo nativo no completó la solicitud.', { errors: route.errors });
        }
      }

      if (!responseText && imageAttachments.length)
        throw new Error('Ningún modelo con visión pudo procesar la imagen.');

      if (!responseText && useLocal) {
        setAssistantState('executing');
        setActivity('Ejecutando una acción local con Jorgis…');
        const controller = new AbortController();
        requestControllerRef.current = controller;
        const response = await fetch('/api/georgie/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: requestText }),
          signal: controller.signal,
        });
        const data = await response.json() as LocalReply & { error?: string };
        if (!response.ok)
          throw new Error(data.error || 'Jorgis no está disponible.');
        responseText = data.response;
        audioUrl = data.audio_url;
        await appendLocalExchange(displayText, responseText);
        if (data.refresh_dashboard) void checkHealth();
      }

      if (!responseText && providerError)
        throw new Error(providerError);
      if (!responseText && requestKind === 'image')
        throw new Error('El modelo activo no generó una imagen. Selecciona un modelo de imágenes de OpenAI o Gemini.');
      if (!responseText && (requestKind === 'video' || requestKind === 'music'))
        throw new Error(`El modelo activo no puede crear ${requestKind === 'video' ? 'video' : 'audio'}. Selecciona un proveedor compatible.`);
      if (!responseText)
        throw new Error('El modelo activo no completó la respuesta. Revisa su API Key o selecciona otro modelo.');

      await refreshHistory();
      setAssistantState('idle');
      setActivity('Respuesta lista');
      if (autoSpeak) speakResponse(responseText, audioUrl);
      else restartListening();
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (!aborted) {
        const friendly = error instanceof Error && /cuota|quota|billing|insufficient|429/i.test(error.message)
          ? 'La clave está configurada, pero el proveedor no tiene cuota o acceso para esta función.'
          : error instanceof Error && /modelo activo|modelo con visión|crear video|crear audio/i.test(error.message)
            ? error.message
            : error instanceof Error && /tiempo|timeout/i.test(error.message)
          ? 'La respuesta tardó demasiado. Inténtalo nuevamente.'
          : error instanceof Error
            ? error.message
            : 'No pude completar esa solicitud.';
        setNotice(friendly);
        setAssistantState('error');
        setActivity(friendly);
      }
    } finally {
      requestControllerRef.current = null;
      setBusy(false);
    }
  };

  const toggleListening = () => {
    if (!voice.supported) {
      setNotice('El reconocimiento de voz requiere Chrome o Edge con permiso de micrófono.');
      setAssistantState('error');
      return;
    }
    if (voice.isListening) {
      voice.stopListening();
      setConversationActive(false);
      setAssistantState('idle');
      setActivity('Escucha detenida');
      return;
    }
    stopPlayback();
    if (continuousConversation) setConversationActive(true);
    setAssistantState('listening');
    setActivity('Jorgis está escuchando');
    void voice.startListening();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted: Attachment[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      if (file.type.startsWith('image/')) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          setNotice(`“${file.name}” usa un formato de imagen no compatible.`);
          continue;
        }
        if (file.size > 8_000_000) {
          setNotice(`“${file.name}” supera el límite de 8 MB.`);
          continue;
        }
        accepted.push({ id: `${file.name}-${file.lastModified}`, kind: 'image', name: file.name, mimeType: file.type, file, size: file.size });
        continue;
      }
      if (!isSupportedTextFile(file)) {
        setNotice(`“${file.name}” todavía no es un formato compatible.`);
        continue;
      }
      if (file.size > 1_500_000) {
        setNotice(`“${file.name}” es demasiado grande para Jorgis.`);
        continue;
      }
      accepted.push({ id: `${file.name}-${file.lastModified}`, kind: 'text', name: file.name, size: file.size, text: await file.text() });
    }
    setAttachments(current => [...current, ...accepted].slice(0, 4));
    if (accepted.length) setShowComposer(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearHistory = async () => {
    await clearJorgisHistory();
    setHistory([]);
    setSettingsOpen(false);
    setActivity('Conversación borrada');
  };

  const orbState: JorgisState = voice.error || notice ? 'error'
    : voice.isListening ? 'listening'
      : speaking ? 'speaking'
        : assistantState;
  const connected = health.status === 'ready';
  const visibleHistory = history.slice(-8);

  return <Box component='main' data-testid='jorgis-app' sx={{ minHeight: '100dvh', color: '#eef5ff', background: 'radial-gradient(circle at 50% 12%, rgba(40, 88, 180, .20), transparent 34%), radial-gradient(circle at 12% 78%, rgba(124, 44, 255, .12), transparent 32%), #030611', position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .18, backgroundImage: 'linear-gradient(rgba(83,197,255,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(83,197,255,.13) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(to bottom, transparent, #000 18%, #000 70%, transparent)' } }}>
    <Box sx={{ position: 'relative', zIndex: 1, width: 'min(980px, 100%)', mx: 'auto', px: { xs: 1.5, sm: 3 }, pb: 3 }}>
      <Stack component='header' direction='row' alignItems='center' justifyContent='space-between' sx={{ minHeight: 72 }}>
        <Stack direction='row' alignItems='center' gap={1.25}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: connected ? '#38ffc2' : '#ff5370', boxShadow: connected ? '0 0 16px #38ffc2' : '0 0 16px #ff5370' }} />
          <Box><Typography level='title-lg' sx={{ letterSpacing: '.18em', fontWeight: 700 }}>JORGIS</Typography><Typography level='body-xs' sx={{ color: 'rgba(224,236,255,.54)' }}>{connected ? 'Asistente conectado' : 'Reconectando al asistente…'}</Typography></Box>
        </Stack>
        <IconButton aria-label='Abrir configuración' onClick={() => setSettingsOpen(true)} sx={{ color: 'rgba(226,239,255,.72)', border: '1px solid rgba(123,207,255,.16)', bgcolor: 'rgba(7,13,31,.56)' }}><SettingsRoundedIcon /></IconButton>
      </Stack>

      <Stack alignItems='center' gap={2} pt={{ xs: 1, sm: 2 }}>
        <Chip variant='soft' startDecorator={<AutoAwesomeRoundedIcon />} sx={{ bgcolor: 'rgba(34, 183, 255, .10)', color: '#9feaff', border: '1px solid rgba(73, 205, 255, .18)' }}>
          Modelo: {activeModel ? `${activeModel.label} · ${providerLabel(activeModel.vId)}` : 'Configurar modelo'}
        </Chip>
        <JorgisOrb state={orbState} level={voice.level} disabled={busy && !voice.isListening} onToggleListening={toggleListening} />
        <Typography aria-live='polite' role='status' level='body-sm' sx={{ minHeight: 24, textAlign: 'center', color: notice || voice.error ? '#ff91a5' : 'rgba(220,235,255,.7)' }}>{voice.error ?? notice ?? activity}</Typography>

        {(voice.transcript || (voice.isListening && !voice.transcript)) && <Sheet variant='soft' sx={{ maxWidth: 620, px: 2, py: 1, borderRadius: 'lg', bgcolor: 'rgba(41, 255, 196, .07)', border: '1px solid rgba(64,255,205,.13)' }}><Typography level='body-sm' sx={{ color: 'rgba(231,255,249,.82)', fontStyle: voice.transcript ? 'normal' : 'italic' }}>{voice.transcript || 'Te escucho…'}</Typography></Sheet>}

        {!!visibleHistory.length && <Sheet data-testid='jorgis-history' sx={{ width: 'min(760px, 100%)', maxHeight: { xs: 220, sm: 270 }, overflowY: 'auto', p: 1.25, borderRadius: 'xl', bgcolor: 'rgba(8, 14, 34, .60)', border: '1px solid rgba(118, 204, 255, .13)', backdropFilter: 'blur(16px)' }}>
          <Stack spacing={1}>{visibleHistory.map(message => <Box key={message.id} sx={{ maxWidth: '88%', alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', px: 1.5, py: 1, borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', bgcolor: message.role === 'user' ? 'rgba(33, 166, 255, .16)' : 'rgba(132, 91, 255, .10)', border: '1px solid', borderColor: message.role === 'user' ? 'rgba(75,199,255,.18)' : 'rgba(161,126,255,.15)' }}><Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'rgba(239,246,255,.9)' }}>{message.text}</Typography>{message.imageUrls?.map((url, index) => <Box key={`${message.id}-image-${index}`} component='img' src={url} alt='Imagen creada por Jorgis' sx={{ display: 'block', width: 'min(420px, 100%)', mt: 1, borderRadius: 'lg', border: '1px solid rgba(117,232,255,.22)' }} />)}{message.hasVideo && <Typography level='body-xs' mt={.75} sx={{ color: '#83f6dc' }}>Video disponible durante esta sesión.</Typography>}</Box>)}</Stack>
        </Sheet>}

        {!!attachments.length && <Stack direction='row' gap={.75} flexWrap='wrap' justifyContent='center'>{attachments.map(file => <Chip key={file.id} variant='outlined' endDecorator={<IconButton size='sm' aria-label={`Quitar ${file.name}`} onClick={() => setAttachments(current => current.filter(item => item.id !== file.id))}><CloseRoundedIcon /></IconButton>}>{file.name}</Chip>)}</Stack>}

        {showComposer && <Sheet sx={{ width: 'min(760px, 100%)', p: 1, borderRadius: 'xl', bgcolor: 'rgba(8, 14, 34, .82)', border: '1px solid rgba(75, 204, 255, .2)', backdropFilter: 'blur(18px)' }}>
          <Stack direction='row' alignItems='flex-end' gap={1}>
            <Textarea autoFocus aria-label='Escribe a Jorgis' placeholder='Escribe lo que necesitas…' minRows={1} maxRows={5} value={prompt} disabled={busy} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitRef.current(prompt, false); } }} sx={{ flex: 1, bgcolor: 'transparent', border: 0, boxShadow: 'none', '--Textarea-focusedThickness': '0px' }} />
            <IconButton aria-label='Enviar mensaje' disabled={!prompt.trim() || busy} onClick={() => void submitRef.current(prompt, false)} sx={{ color: '#5ee8ff', bgcolor: 'rgba(37,180,255,.12)' }}>{busy ? <CircularProgress size='sm' /> : <SendRoundedIcon />}</IconButton>
          </Stack>
        </Sheet>}

        <Stack direction='row' alignItems='center' gap={{ xs: .75, sm: 1.25 }} sx={{ p: .75, borderRadius: 'xl', bgcolor: 'rgba(6, 11, 28, .72)', border: '1px solid rgba(91,199,255,.15)', boxShadow: '0 14px 44px rgba(0,0,0,.32)', backdropFilter: 'blur(20px)' }}>
          <Tooltip title={voice.isListening ? 'Detener micrófono' : 'Micrófono'}><IconButton aria-label={voice.isListening ? 'Detener micrófono' : 'Activar micrófono'} onClick={toggleListening} sx={{ color: voice.isListening ? '#38ffc2' : '#75eaff', bgcolor: voice.isListening ? 'rgba(56,255,194,.14)' : 'rgba(47,184,255,.10)', boxShadow: voice.isListening ? '0 0 20px rgba(56,255,194,.16)' : 'none' }}><MicRoundedIcon /></IconButton></Tooltip>
          <Tooltip title='Escribir'><IconButton aria-label='Escribir mensaje' onClick={() => setShowComposer(value => !value)} sx={{ color: 'rgba(226,239,255,.74)' }}><KeyboardRoundedIcon /></IconButton></Tooltip>
          <Tooltip title='Adjuntar archivo o imagen'><IconButton aria-label='Adjuntar archivo o imagen' onClick={() => fileInputRef.current?.click()} sx={{ color: 'rgba(226,239,255,.74)' }}><AttachFileRoundedIcon /></IconButton></Tooltip>
          <Tooltip title='Configuración'><IconButton aria-label='Configuración' onClick={() => setSettingsOpen(true)} sx={{ color: 'rgba(226,239,255,.74)' }}><SettingsRoundedIcon /></IconButton></Tooltip>
          {speaking && <Tooltip title='Detener voz'><IconButton aria-label='Detener voz' color='danger' onClick={() => { stopPlayback(); setAssistantState('idle'); setActivity('Voz detenida'); }}><VolumeOffRoundedIcon /></IconButton></Tooltip>}
        </Stack>

        {(conversationActive || busy) && <Button size='sm' variant='plain' color='danger' startDecorator={<StopCircleRoundedIcon />} onClick={stopEverything}>Detener conversación</Button>}
      </Stack>
    </Box>

    <input ref={fileInputRef} type='file' hidden multiple accept='image/png,image/jpeg,image/webp,image/gif,text/*,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.ps1,.sql,.yaml,.yml' onChange={event => void handleFiles(event.target.files)} />
    <JorgisSettings
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      autoSpeak={autoSpeak}
      onAutoSpeakChange={setAutoSpeak}
      continuousConversation={continuousConversation}
      onContinuousConversationChange={setContinuousConversation}
      onClearHistory={clearHistory}
      localAvailable={health.ollama}
      localModel={health.model}
      onOpenModels={() => { setSettingsOpen(false); optimaOpenModels(); }}
    />
  </Box>;
}
