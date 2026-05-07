import { useState, useCallback, useRef, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

const isElectron = typeof window !== 'undefined' && !!window.flowade;

function encodeWAV(float32, sampleRate) {
  const buffer = new ArrayBuffer(44 + float32.length * 2);
  const view = new DataView(buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + float32.length * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, 'data'); view.setUint32(40, float32.length * 2, true);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function transcribeWAV(wavBlob) {
  const apiKey = await window.flowade?.env.get('OPENAI_API_KEY');
  if (!apiKey) return { text: null, error: 'no_key' };

  const formData = new FormData();
  formData.append('file', wavBlob, 'audio.wav');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401) return { text: null, error: 'invalid_key' };
    return { text: null, error: 'api_error' };
  }

  const data = await res.json();
  return { text: data.text?.trim() || null, error: null };
}

export function useVoiceInput({ onInterim, onFinal }) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('');
  const recognitionRef = useRef(null);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const wantActiveRef = useRef(false);
  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const processorRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const busyRef = useRef(false);
  const startWhisperRef = useRef(null);

  onInterimRef.current = onInterim;
  onFinalRef.current = onFinal;

  const stopWhisper = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (contextRef.current) { contextRef.current.close().catch(() => {}); contextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    chunksRef.current = [];
  }, []);

  const sendChunks = useCallback(async () => {
    if (chunksRef.current.length === 0 || busyRef.current) return;
    const chunks = chunksRef.current.splice(0);
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    if (totalLen < 1600) return;

    const merged = new Float32Array(totalLen);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }

    busyRef.current = true;
    setStatus('Transcribing...');

    try {
      const wav = encodeWAV(merged, 16000);
      const { text, error } = await transcribeWAV(wav);

      if (error === 'no_key') {
        setStatus('No OpenAI key — add in Settings > API Keys');
        busyRef.current = false;
        return;
      }
      if (error === 'invalid_key') {
        setStatus('Invalid OpenAI key');
        busyRef.current = false;
        return;
      }
      if (error) {
        setStatus('Transcription failed');
        busyRef.current = false;
        return;
      }

      if (text) {
        onFinalRef.current(text);
        setStatus(wantActiveRef.current ? 'Listening...' : '');
      } else {
        setStatus(wantActiveRef.current ? 'Listening...' : '');
      }
    } catch {
      setStatus('Transcription failed');
    }
    busyRef.current = false;
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (!SpeechRecognition) return false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            onFinalRef.current(transcript);
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          onInterimRef.current(interim);
          setStatus('Hearing you...');
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setStatus('Mic permission denied');
          return;
        }
        if (event.error === 'no-speech') {
          setStatus('No speech detected');
          return;
        }
        if (event.error === 'network' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
          try { recognition.abort(); } catch {}
          recognitionRef.current = null;
          if (wantActiveRef.current) startWhisperRef.current?.();
          return;
        }
        setStatus(`Speech error: ${event.error}`);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        if (wantActiveRef.current) {
          try { recognition.start(); } catch {}
        } else {
          setListening(false);
          setStatus('');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setStatus('Listening...');
      return true;
    } catch {
      return false;
    }
  }, []);

  const startWhisper = useCallback(async () => {
    try {
      setStatus('Starting mic...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      contextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(ctx.destination);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wantActiveRef.current) return;
        const data = e.inputBuffer.getChannelData(0);
        const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
        if (rms > 0.01) {
          chunksRef.current.push(new Float32Array(data));
          setStatus('Hearing you...');
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else if (chunksRef.current.length > 0 && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            sendChunks();
          }, 1200);
        }
      };

      setListening(true);
      setStatus('Listening...');
    } catch (err) {
      setStatus('Mic error: ' + err.message);
      setListening(false);
    }
  }, [sendChunks]);

  startWhisperRef.current = startWhisper;

  const start = useCallback(async () => {
    wantActiveRef.current = true;
    if (isElectron || !startSpeechRecognition()) {
      await startWhisper();
    }
  }, [startSpeechRecognition, startWhisper]);

  const stop = useCallback(() => {
    wantActiveRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (chunksRef.current.length > 0) sendChunks();
    stopWhisper();
    setListening(false);
    setStatus('');
  }, [sendChunks, stopWhisper]);

  const toggle = useCallback(() => {
    if (wantActiveRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => () => { wantActiveRef.current = false; stop(); }, [stop]);

  return { listening, status, toggle };
}
