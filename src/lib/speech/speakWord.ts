function findBritishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find(({ lang }) => lang.toLowerCase() === 'en-gb');
}

export function canSpeak(): boolean {
  if (typeof window === 'undefined'
    || window.speechSynthesis === undefined
    || typeof window.SpeechSynthesisUtterance !== 'function') {
    return false;
  }

  try {
    return findBritishVoice(window.speechSynthesis.getVoices()) !== undefined;
  } catch {
    return false;
  }
}

export function subscribeToSpeechAvailability(
  listener: (available: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || window.speechSynthesis === undefined) {
    return () => undefined;
  }

  const synthesis = window.speechSynthesis;
  const handleVoicesChanged = () => listener(canSpeak());

  synthesis.addEventListener('voiceschanged', handleVoicesChanged);
  handleVoicesChanged();
  return () => synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
}

export function speakWord(word: string): boolean {
  if (!canSpeak()) {
    return false;
  }

  try {
    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();
    const selectedVoice = findBritishVoice(voices);
    if (selectedVoice === undefined) {
      return false;
    }
    const utterance = new window.SpeechSynthesisUtterance(word);

    utterance.lang = selectedVoice.lang;
    utterance.voice = selectedVoice;

    synthesis.cancel();
    synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
