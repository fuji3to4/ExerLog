import type { Language } from "./language";

export function formatDate(date: Date | string, language: Language): string {
  const locale = language === "ja" ? "ja-JP" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(`${date}T00:00:00`) : date);
}

export function formatIntensity(intensity: string, language: Language): string {
  const messages = language === "ja" ? {
    low: "低",
    medium: "中",
    high: "高",
  } : {
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  
  return messages[intensity as keyof typeof messages] ?? intensity;
}

export function formatBodyArea(bodyArea: string, language: Language): string {
  const messages = language === "ja" ? {
    "upper-body": "上半身",
    "lower-body": "下半身",
    "full-body": "全身",
  } : {
    "upper-body": "Upper body",
    "lower-body": "Lower body",
    "full-body": "Full body",
  };
  
  return messages[bodyArea as keyof typeof messages] ?? bodyArea.replace("-", " ");
}

export function formatPurpose(purpose: string, language: Language): string {
  const messages = language === "ja" ? {
    warmup: "ウォームアップ",
    mobility: "モビリティ",
    strength: "筋力",
    recovery: "回復",
    endurance: "持久力",
  } : {
    warmup: "Warmup",
    mobility: "Mobility",
    strength: "Strength",
    recovery: "Recovery",
    endurance: "Endurance",
  };
  
  return messages[purpose as keyof typeof messages] ?? purpose;
}
