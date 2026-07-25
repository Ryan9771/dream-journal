import { format } from "date-fns";

export type Mood = "peaceful" | "joyful" | "curious" | "uneasy" | "sad" | "angry" | "mixed";

export type Insight = {
  summary?: string;
  analysis?: string[];
  themes: string[];
  reflection: string;
  pattern?: string;
  connectionDreamIds?: string[];
  emotionalTone?: Mood;
  intensity?: number;
};

export type Dream = {
  id: string;
  date: string;
  title: string;
  body: string;
  contentHtml?: string;
  mood: Mood;
  insight?: Insight;
};

export const isoDate = (date: Date) => format(date, "yyyy-MM-dd");

export const moodMeta: Record<Mood, { label: string; color: string }> = {
  peaceful: { label: "Peaceful", color: "#80a99d" },
  joyful: { label: "Joyful", color: "#dda65e" },
  curious: { label: "Curious", color: "#9486b0" },
  uneasy: { label: "Uneasy", color: "#c47f73" },
  sad: { label: "Sad", color: "#687796" },
  angry: { label: "Angry", color: "#b96f6b" },
  mixed: { label: "Mixed", color: "#9b7f98" },
};

export const moodKeys = Object.keys(moodMeta) as Mood[];

export const normalizeMood = (value: unknown): Mood => {
  if (value === "heavy") return "sad";
  return moodKeys.includes(value as Mood) ? value as Mood : "curious";
};

const themeAliases: Record<string, string> = {
  curiosity: "exploration",
  direction: "transition",
  movement: "transition",
  possibility: "exploration",
  trust: "self-trust",
};

export const canonicalTheme = (theme: string) =>
  themeAliases[theme.trim().toLowerCase()] || theme.trim().toLowerCase();

export const normalizeDream = (value: unknown): Dream => {
  const dream = value as Dream;
  const insight = dream.insight
    ? {
        ...dream.insight,
        themes: Array.from(new Set((dream.insight.themes || []).map(canonicalTheme))),
        emotionalTone: normalizeMood(dream.insight.emotionalTone || dream.mood),
      }
    : undefined;
  return { ...dream, mood: normalizeMood(dream.mood), insight };
};
