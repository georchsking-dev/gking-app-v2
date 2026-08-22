import * as React from 'react';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorLike = { error: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function friendlyMicrophoneError(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed')
    return 'Necesito permiso para usar el micrófono.';
  if (code === 'no-speech')
    return 'No escuché ninguna voz. Inténtalo otra vez.';
  if (code === 'audio-capture')
    return 'No encontré un micrófono disponible.';
  if (code === 'network')
    return 'El reconocimiento de voz no está disponible en este momento.';
  return 'No pude iniciar el reconocimiento de voz.';
}

export function useJorgisVoice(onFinalTranscript: (text: string) => void) {
  const [supported, setSupported] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [level, setLevel] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const onFinalRef = React.useRef(onFinalTranscript);

  React.useEffect(() => { onFinalRef.current = onFinalTranscript; }, [onFinalTranscript]);

  const stopMeter = React.useCallback(() => {
    if (animationFrameRef.current !== null)
      cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (audioContextRef.current)
      void audioContextRef.current.close();
    audioContextRef.current = null;
    setLevel(0);
  }, []);

  React.useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(!!Recognition);
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      setError(null);
      setTranscript('');
      setIsListening(true);
    };
    recognition.onresult = event => {
      let current = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        current += result[0]?.transcript ?? '';
        if (result.isFinal)
          finalText += result[0]?.transcript ?? '';
      }
      setTranscript(current.trim());
      if (finalText.trim())
        onFinalRef.current(finalText.trim());
    };
    recognition.onerror = event => setError(friendlyMicrophoneError(event.error));
    recognition.onend = () => {
      setIsListening(false);
      stopMeter();
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
      stopMeter();
    };
  }, [stopMeter]);

  const startMeter = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(samples);
      let total = 0;
      for (const sample of samples) total += sample;
      setLevel(Math.min(1, total / samples.length / 90));
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  const startListening = React.useCallback(async () => {
    if (!recognitionRef.current || isListening) return false;
    setError(null);
    try {
      await startMeter();
      recognitionRef.current.start();
      return true;
    } catch (cause) {
      stopMeter();
      const code = cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'not-allowed' : '';
      setError(friendlyMicrophoneError(code));
      return false;
    }
  }, [isListening, startMeter, stopMeter]);

  const stopListening = React.useCallback(() => {
    recognitionRef.current?.stop();
    stopMeter();
    setIsListening(false);
  }, [stopMeter]);

  const abortListening = React.useCallback(() => {
    recognitionRef.current?.abort();
    stopMeter();
    setIsListening(false);
  }, [stopMeter]);

  return {
    supported,
    isListening,
    transcript,
    level,
    error,
    startListening,
    stopListening,
    abortListening,
    clearError: () => setError(null),
  };
}
