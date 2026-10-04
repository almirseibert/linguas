/** Fala e escuta usando as APIs nativas do navegador (gratuitas, sem servidor). */

function pickVoice(tag: string): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  const lang = tag.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === lang && /google|natural|neural/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase() === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
  );
}

export function speak(text: string, tag: string, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = tag;
    u.rate = rate;
    const voice = pickVoice(tag);
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

let currentAudio: HTMLAudioElement | null = null;

/** Toca a gravação de um falante nativo; se falhar (offline etc.), usa a voz do navegador. */
export async function playNative(url: string | null | undefined, fallbackText: string, tag: string, rate = 1): Promise<void> {
  speechSynthesis?.cancel();
  currentAudio?.pause();
  if (!url) return speak(fallbackText, tag, rate);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.playbackRate = rate;
  audio.preservesPitch = true; // devagar sem voz de robô grave
  try {
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onpause = () => resolve();
    });
  } catch {
    await speak(fallbackText, tag, rate);
  }
}

// Chrome/Android expõem webkitSpeechRecognition
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const RecognitionCtor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
  .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

export const canListen = Boolean(RecognitionCtor);

/** Escuta uma fala e devolve o texto reconhecido. `stop()` encerra antes. */
export function listen(tag: string): { result: Promise<string>; stop: () => void } {
  if (!RecognitionCtor) return { result: Promise.reject(new Error("Reconhecimento de voz indisponível neste navegador (use o Chrome).")), stop: () => {} };
  const rec = new RecognitionCtor();
  rec.lang = tag;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  const result = new Promise<string>((resolve, reject) => {
    let text = "";
    rec.onresult = (e) => {
      text = Array.from(e.results).map((r) => r[0].transcript).join(" ");
    };
    rec.onerror = (e) => reject(new Error(e.error === "not-allowed" ? "Permita o uso do microfone." : `Erro no microfone: ${e.error}`));
    rec.onend = () => resolve(text);
  });
  rec.start();
  return { result, stop: () => rec.stop() };
}
