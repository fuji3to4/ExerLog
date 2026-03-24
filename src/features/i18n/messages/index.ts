import { en } from "./en";
import { ja } from "./ja";
import type { Language } from "../language";

export type Messages = {
  [K in keyof typeof en]: string;
};

const messages: Record<Language, Messages> = {
  en,
  ja,
};

export function getMessages(language: Language): Messages {
  return messages[language];
}
