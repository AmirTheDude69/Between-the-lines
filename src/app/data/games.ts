export interface Game {
  id: string;
  name: string;
  description: string;
  rules?: string;
  color: string;
  sheetGid: number;
}

export const games: Game[] = [
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

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id);
}
