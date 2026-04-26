import type { Dispatch, SetStateAction } from "react";

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike>;

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

type BrowserWindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

export function createSpeechRecognition(
  setInput: Dispatch<SetStateAction<string>>,
  setDictating: Dispatch<SetStateAction<boolean>>
): SpeechRecognitionLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as BrowserWindowWithSpeechRecognition;
  const SpeechRecognitionCtor =
    browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    return null;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? "")
      .join(" ")
      .trim();

    if (transcript) {
      setInput(() => transcript);
    }
  };

  recognition.onend = () => setDictating(false);
  recognition.onerror = () => setDictating(false);

  return recognition;
}
