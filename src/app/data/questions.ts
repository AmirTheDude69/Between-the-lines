import { getGameById } from "./games";

export interface Question {
  id: string;
  text: string;
  gameId: string;
}

const SHEET_ID = "1-lZ7_s-knQc0itESFkSjR3LuiWc0OWaENDcgAWNVJ0w";
const CACHE_PREFIX = "between-the-lines:question-cache:v1:";
const SEEN_PREFIX = "between-the-lines:seen:v1:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function getCacheKey(gameId: string): string {
  return `${CACHE_PREFIX}${gameId}`;
}

function getSeenKey(gameId: string): string {
  return `${SEEN_PREFIX}${gameId}`;
}

function decodeHtmlEntities(input: string): string {
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  }

  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeQuestionText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashFNV1A(value: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return `${(hash >>> 0).toString(16)}-${value.length}`;
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && csvText[i + 1] === "\n") {
        i += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((cell) => cell.trim() !== ""));
}

function toQuestions(gameId: string, csvText: string): Question[] {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((field) => normalizeQuestionText(field).toLowerCase());
  const questionColumnIndex = header.findIndex((field) => field === "question");
  const columnIndex = questionColumnIndex >= 0 ? questionColumnIndex : 0;
  const dedupe = new Map<string, Question>();

  for (const row of rows.slice(1)) {
    const raw = row[columnIndex] ?? row[0] ?? "";
    const text = normalizeQuestionText(raw);
    if (!text) {
      continue;
    }

    const dedupeKey = text.toLowerCase();
    if (dedupe.has(dedupeKey)) {
      continue;
    }

    dedupe.set(dedupeKey, {
      id: `${gameId}:${hashFNV1A(text)}`,
      text,
      gameId,
    });
  }

  return Array.from(dedupe.values());
}

function loadCachedQuestions(gameId: string): Question[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = localStorage.getItem(getCacheKey(gameId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as { questions?: Question[] } | null;
    if (!parsed || !Array.isArray(parsed.questions)) {
      return [];
    }
    return parsed.questions.filter(
      (question) =>
        typeof question?.id === "string" &&
        typeof question?.text === "string" &&
        question?.gameId === gameId,
    );
  } catch {
    return [];
  }
}

function saveCachedQuestions(gameId: string, questions: Question[]): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getCacheKey(gameId),
    JSON.stringify({
      fetchedAt: Date.now(),
      questions,
    }),
  );
}

export function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getSeenQuestionIds(gameId: string): Set<string> {
  if (!isBrowser()) {
    return new Set();
  }

  const raw = localStorage.getItem(getSeenKey(gameId));
  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveSeenQuestionIds(gameId: string, ids: Set<string>): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(getSeenKey(gameId), JSON.stringify(Array.from(ids)));
}

export function markQuestionSeen(gameId: string, questionId: string): void {
  const seen = getSeenQuestionIds(gameId);
  seen.add(questionId);
  saveSeenQuestionIds(gameId, seen);
}

export function resetSeenQuestions(gameId: string): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(getSeenKey(gameId));
}

export function getUnseenQuestions(gameId: string, questions: Question[]): Question[] {
  const seen = getSeenQuestionIds(gameId);
  return questions.filter((question) => !seen.has(question.id));
}

export async function fetchQuestionsByGameId(gameId: string): Promise<Question[]> {
  const game = getGameById(gameId);
  if (!game) {
    throw new Error("Game not found.");
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${game.sheetGid}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch questions for ${game.name}.`);
    }

    const csvText = await response.text();
    const questions = toQuestions(gameId, csvText);
    if (questions.length === 0) {
      throw new Error(`No questions found for ${game.name}.`);
    }

    saveCachedQuestions(gameId, questions);
    return questions;
  } catch {
    const cached = loadCachedQuestions(gameId);
    if (cached.length > 0) {
      return cached;
    }
    throw new Error(`Unable to load questions for ${game.name}.`);
  }
}
