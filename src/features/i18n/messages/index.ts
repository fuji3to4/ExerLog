import { en } from "./en";
import { ja } from "./ja";
import type { Language } from "../language";

export type Messages = {
  [K in keyof typeof en]: string;
};

export function isMessageKey(key: string): key is keyof Messages {
  return Object.prototype.hasOwnProperty.call(en, key);
}

const messages: Record<Language, Messages> = {
  en,
  ja,
};

export function getMessages(language: Language): Messages {
  return messages[language];
}
