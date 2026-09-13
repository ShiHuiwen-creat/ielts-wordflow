import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSpeak, speakWord } from './speakWord';

interface UtteranceLike {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
}

const originalSynthesis = window.speechSynthesis;
const originalUtterance = window.SpeechSynthesisUtterance;

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return {
    default: false,
    lang,
    localService: true,
    name,
    voiceURI: name,
  };
}

function installSpeech(voices: SpeechSynthesisVoice[]) {
  const spoken: UtteranceLike[] = [];
  const synthesis = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    speak: vi.fn((utterance: UtteranceLike) => spoken.push(utterance)),
  };

  class FakeUtterance implements UtteranceLike {
    lang = '';
    voice: SpeechSynthesisVoice | null = null;

    constructor(public text: string) {}
  }

  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeUtterance,
  });

  return { synthesis, spoken };
}

afterEach(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: originalSynthesis,
  });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: originalUtterance,
  });
});

describe('speech adapter', () => {
  it('prefers an en-GB voice even when another English voice appears first', () => {
    const american = voice('US English', 'en-US');
    const british = voice('UK English', 'en-GB');
    const { spoken } = installSpeech([american, british]);

    expect(speakWord('allocate')).toBe(true);

    expect(spoken[0]).toMatchObject({ text: 'allocate', lang: 'en-GB', voice: british });
  });

  it('falls back to the first English voice when en-GB is unavailable', () => {
    const chinese = voice('中文', 'zh-CN');
    const english = voice('English', 'en-AU');
    const { spoken } = installSpeech([chinese, english]);

    speakWord('coherent');

    expect(spoken[0]).toMatchObject({ lang: 'en-AU', voice: english });
  });

  it('reports speech unavailable when no English voice exists', () => {
    const { synthesis } = installSpeech([voice('中文', 'zh-CN')]);

    expect(canSpeak()).toBe(false);
    expect(speakWord('coherent')).toBe(false);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('reports unavailability and returns without throwing', () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: undefined,
    });

    expect(canSpeak()).toBe(false);
    expect(speakWord('derive')).toBe(false);
  });

  it('cancels prior speech before speaking the new utterance', () => {
    const { synthesis } = installSpeech([voice('UK English', 'en-GB')]);

    speakWord('derive');

    expect(synthesis.cancel).toHaveBeenCalledOnce();
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(synthesis.cancel.mock.invocationCallOrder[0])
      .toBeLessThan(synthesis.speak.mock.invocationCallOrder[0]);
  });
});
