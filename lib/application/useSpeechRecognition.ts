'use client';
// 음성 인식 훅 — Web Speech API (브라우저 내장, 서버 불필요)
// Chrome 한국어 인식 지원
import { useEffect, useRef, useCallback, useState } from 'react';

export type VoiceCommand = 'next' | 'prev' | 'first' | 'last' | 'menu';

type Props = {
  onCommand: (cmd: VoiceCommand) => void;
  enabled: boolean;
};

// 한국어 키워드 → 커맨드 매핑
const KEYWORD_MAP: Record<string, VoiceCommand> = {
  '다음': 'next',
  '넘겨': 'next',
  '앞으로': 'next',
  '뒤로': 'prev',
  '이전': 'prev',
  '목차': 'menu',
  '처음': 'first',
  '첫': 'first',
  '끝': 'last',
  '마지막': 'last',
};

export type SpeechStatus = 'idle' | 'listening' | 'error' | 'unsupported';

export function useSpeechRecognition({ onCommand, enabled }: Props) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [lastHeard, setLastHeard] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onCommandRef = useRef(onCommand);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;      // 계속 듣기
    recognition.interimResults = false; // 확정된 결과만
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setStatus('listening');
    recognition.onerror = (e) => {
      // network 에러는 무시하고 재시작
      if (e.error === 'network') return;
      if (e.error === 'no-speech') return;
      setStatus('error');
    };
    recognition.onend = () => {
      // 활성 상태면 자동 재시작 (continuous 보완)
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* 이미 시작 중 */ }
      }
    };

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result?.isFinal) continue;

        // 여러 대안 중 키워드 매치되는 것 찾기
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j]?.transcript?.trim() ?? '';
          setLastHeard(transcript);

          for (const [keyword, cmd] of Object.entries(KEYWORD_MAP)) {
            if (transcript.includes(keyword)) {
              onCommandRef.current(cmd);
              return;
            }
          }
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus('error');
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // 자동 재시작 방지
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [enabled, start, stop]);

  return { status, lastHeard };
}
