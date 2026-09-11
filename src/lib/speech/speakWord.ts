export function canSpeak(): boolean {
  return typeof window !== 'undefined'
    && window.speechSynthesis !== undefined
    && typeof window.SpeechSynthesisUtterance === 'function';
}

export function speakWord(word: string): boolean {
  if (!canSpeak()) {
    return false;
  }

  try {
    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();
    const britishVoice = voices.find(({ lang }) => lang.toLowerCase() === 'en-gb');
    const englishVoice = voices.find(({ lang }) => lang.toLowerCase().startsWith('en'));
    const selectedVoice = britishVoice ?? englishVoice;
    const utterance = new window.SpeechSynthesisUtterance(word);

    utterance.lang = selectedVoice?.lang ?? 'en-GB';
    utterance.voice = selectedVoice ?? null;

    synthesis.cancel();
    synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
