import { z } from "zod";
import type { ParseResult } from "./types.js";

const rawSchema = z.string().min(2).max(3000);

export function parseAnswerText(rawText: string, totalQuestions: number): ParseResult {
  const raw = rawSchema.parse(rawText.toUpperCase().replace(/\s+/g, ""));
  const regex = /(\d{1,3})([A-D])/g;
  const parsed: { questionNumber: number; answer: string }[] = [];
  const byQuestion = new Array(totalQuestions).fill("");

  const seen = new Set<number>();

  for (const match of raw.matchAll(regex)) {
    const questionNumber = Number(match[1]);
    const answer = match[2];

    if (questionNumber < 1 || questionNumber > totalQuestions) continue;
    if (seen.has(questionNumber)) continue;

    seen.add(questionNumber);
    parsed.push({ questionNumber, answer });
    byQuestion[questionNumber - 1] = answer;
  }

  if (parsed.length === 0) {
    throw new Error("Javob formati noto'g'ri. Masalan: 1A2B3C");
  }

  return { parsed, byQuestion };
}
