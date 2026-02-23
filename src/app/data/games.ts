export interface Game {
  id: string;
  name: string;
  description: string;
  rules?: string;
  color: string;
  sheetGid: number;
}

interface SheetEntry {
  gid: number;
  name: string;
}

interface GamesApiResponse {
  sheets: SheetEntry[];
}

const GAMES_ENDPOINT = "/api/games";
const CACHE_KEY = "between-the-lines:games-cache:v1";
const COLOR_PALETTE = [
  "#FF8C42",
  "#FF6B6B",
  "#FFD93D",
  "#6BCF7F",
  "#4ECDC4",
  "#C77DFF",
  "#74C0FC",
  "#FFA8A8",
  "#B197FC",
  "#69DB7C",
];
const DEFAULT_RULES =
  "Draw cards one by one, answer honestly, and skip any prompt by group agreement.";

const KNOWN_GAME_OVERRIDES: Record<
  string,
  Omit<Game, "sheetGid" | "name"> & { description: string; rules: string }
> = {
  general: {
    id: "general",
    description:
      "A mixed deck of crowd-favorite prompts for easy starts, playful surprises, and all-around fun.",
    rules:
      "Use this as your warm-up deck. Take turns drawing and answering, or skip any question by group agreement.",
    color: "#FF8C42",
  },
  "we're not really strangers": {
    id: "were-not-really-strangers",
    description:
      "Deep questions designed to create meaningful connections and conversations.",
    rules:
      "Draw cards one at a time. Each person answers honestly. Take your time and listen deeply.",
    color: "#FF6B6B",
  },
  hygge: {
    id: "hygge",
    description:
      "Cozy conversation starters that bring warmth and comfort to your gatherings.",
    rules:
      "Create a comfortable atmosphere. Share stories and experiences. Focus on the moment.",
    color: "#FFD93D",
  },
  "who's most likely to": {
    id: "whos-most-likely",
    description:
      "Fun scenarios that reveal what your friends really think about each other.",
    rules:
      "Read the prompt. Everyone points to who they think fits best. The person with most votes explains or takes a sip!",
    color: "#6BCF7F",
  },
  "never have i ever": {
    id: "never-have-i-ever",
    description:
      "Classic game of revealing experiences and creating hilarious moments.",
    rules:
      "Someone reads a card. If you've done it, put a finger down or take a sip. First to put all fingers down loses!",
    color: "#4ECDC4",
  },
  "truth or drink": {
    id: "truth-or-drink",
    description: "Answer truthfully or take a drink. No judgment, just honesty.",
    rules:
      "Draw a card and read it aloud. Answer honestly or take a drink. No follow-up questions allowed!",
    color: "#C77DFF",
  },
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeGameName(name: string): string {
  return name
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function slugifyGameName(name: string): string {
  const slug = normalizeGameName(name)
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "game";
}

function getUniqueGameId(baseId: string, usedIds: Set<string>): string {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  const nextId = `${baseId}-${suffix}`;
  usedIds.add(nextId);
  return nextId;
}

function toDynamicGame(entry: SheetEntry, index: number, usedIds: Set<string>): Game {
  const normalizedName = normalizeGameName(entry.name);
  const override = KNOWN_GAME_OVERRIDES[normalizedName];
  const baseId = override?.id ?? slugifyGameName(entry.name);

  return {
    id: getUniqueGameId(baseId, usedIds),
    name: entry.name,
    description:
      override?.description ??
      `A custom deck synced from your "${entry.name}" sheet in Google Sheets.`,
    rules: override?.rules ?? DEFAULT_RULES,
    color: override?.color ?? COLOR_PALETTE[index % COLOR_PALETTE.length],
    sheetGid: entry.gid,
  };
}

function isValidSheetEntry(value: unknown): value is SheetEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SheetEntry>;
  return (
    typeof candidate.gid === "number" &&
    Number.isFinite(candidate.gid) &&
    candidate.gid > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0
  );
}

function sanitizeGame(value: unknown): Game | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Game>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.description !== "string" ||
    typeof candidate.color !== "string" ||
    typeof candidate.sheetGid !== "number"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    rules: typeof candidate.rules === "string" ? candidate.rules : DEFAULT_RULES,
    color: candidate.color,
    sheetGid: candidate.sheetGid,
  };
}

function loadCachedGames(): Game[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as { games?: unknown[] } | null;
    if (!parsed || !Array.isArray(parsed.games)) {
      return [];
    }

    return parsed.games
      .map((entry) => sanitizeGame(entry))
      .filter((game): game is Game => game !== null);
  } catch {
    return [];
  }
}

function saveCachedGames(gamesToSave: Game[]): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      fetchedAt: Date.now(),
      games: gamesToSave,
    }),
  );
}

function buildGamesFromSheets(sheets: SheetEntry[]): Game[] {
  const usedIds = new Set<string>();
  return sheets.map((sheet, index) => toDynamicGame(sheet, index, usedIds));
}

async function fetchSheetEntries(): Promise<SheetEntry[]> {
  const response = await fetch(GAMES_ENDPOINT, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load game list.");
  }

  const payload = (await response.json()) as Partial<GamesApiResponse>;
  if (!payload || !Array.isArray(payload.sheets)) {
    throw new Error("Invalid game list response.");
  }

  return payload.sheets.filter((entry): entry is SheetEntry => isValidSheetEntry(entry));
}

export const fallbackGames: Game[] = [
  {
    id: "general",
    name: "General",
    description:
      "A mixed deck of crowd-favorite prompts for easy starts, playful surprises, and all-around fun.",
    rules:
      "Use this as your warm-up deck. Take turns drawing and answering, or skip any question by group agreement.",
    color: "#FF8C42",
    sheetGid: 373242684,
  },
  {
    id: "were-not-really-strangers",
    name: "We're Not Really Strangers",
    description:
      "Deep questions designed to create meaningful connections and conversations.",
    rules:
      "Draw cards one at a time. Each person answers honestly. Take your time and listen deeply.",
    color: "#FF6B6B",
    sheetGid: 1444579865,
  },
  {
    id: "hygge",
    name: "Hygge",
    description:
      "Cozy conversation starters that bring warmth and comfort to your gatherings.",
    rules:
      "Create a comfortable atmosphere. Share stories and experiences. Focus on the moment.",
    color: "#FFD93D",
    sheetGid: 780886762,
  },
  {
    id: "whos-most-likely",
    name: "Who's Most Likely to",
    description:
      "Fun scenarios that reveal what your friends really think about each other.",
    rules:
      "Read the prompt. Everyone points to who they think fits best. The person with most votes explains or takes a sip!",
    color: "#6BCF7F",
    sheetGid: 34248412,
  },
  {
    id: "never-have-i-ever",
    name: "Never Have I Ever",
    description:
      "Classic game of revealing experiences and creating hilarious moments.",
    rules:
      "Someone reads a card. If you've done it, put a finger down or take a sip. First to put all fingers down loses!",
    color: "#4ECDC4",
    sheetGid: 1812741269,
  },
  {
    id: "truth-or-drink",
    name: "Truth or Drink",
    description: "Answer truthfully or take a drink. No judgment, just honesty.",
    rules:
      "Draw a card and read it aloud. Answer honestly or take a drink. No follow-up questions allowed!",
    color: "#C77DFF",
    sheetGid: 970782962,
  },
];

export const games: Game[] = fallbackGames;

export async function fetchGames(): Promise<Game[]> {
  try {
    const sheets = await fetchSheetEntries();
    const dynamicGames = buildGamesFromSheets(sheets);

    if (dynamicGames.length === 0) {
      throw new Error("No games found.");
    }

    saveCachedGames(dynamicGames);
    return dynamicGames;
  } catch {
    const cachedGames = loadCachedGames();
    if (cachedGames.length > 0) {
      return cachedGames;
    }

    return fallbackGames;
  }
}

export function getGameById(id: string, sourceGames: Game[] = fallbackGames): Game | undefined {
  return sourceGames.find((game) => game.id === id);
}
