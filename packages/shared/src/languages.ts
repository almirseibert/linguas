export type LangCode = "en" | "es";

export interface LanguageConfig {
  code: LangCode;
  name: string; // nome em português
  nativeName: string;
  flag: string;
  /** BCP-47 usado para TTS e reconhecimento de voz */
  speechTag: string;
  /** Instrução de variante passada à IA */
  variantNote: string;
}

export const LANGUAGES: Record<LangCode, LanguageConfig> = {
  en: {
    code: "en",
    name: "Inglês",
    nativeName: "English",
    flag: "🇺🇸",
    speechTag: "en-US",
    variantNote: "Use everyday General American English.",
  },
  es: {
    code: "es",
    name: "Espanhol (Espanha)",
    nativeName: "Español",
    flag: "🇪🇸",
    speechTag: "es-ES",
    variantNote:
      "Use Peninsular Spanish (Spain, castellano): use 'vosotros' for informal plural, Spain vocabulary (ordenador, coche, móvil, zumo, vale) and Spain expressions. Never use Latin American variants.",
  },
};

export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];

export function isLang(v: unknown): v is LangCode {
  return typeof v === "string" && v in LANGUAGES;
}
