import { en } from "./en";
import { ja } from "./ja";
import type { Language } from "../language";

export type Messages = typeof en;

const messages: Record<Language, Messages> = {
  en,
  ja,
};

export function getMessages(language: Language): Messages {
  return messages[language];
}
