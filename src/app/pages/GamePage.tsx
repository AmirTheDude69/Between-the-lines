import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { getGameById } from "../data/games";
import {
  fetchQuestionsByGameId,
  getUnseenQuestions,
  markQuestionSeen,
  Question,
  resetSeenQuestions,
  shuffleQuestions,
} from "../data/questions";
import { InteractiveBackground } from "../components/InteractiveBackground";
import DraggableCardStack from "../components/DraggableCardStack";

interface PlayableDeck {
  deck: Question[];
  didAutoReset: boolean;
}

const STACK_WINDOW_SIZE = 10;

function buildPlayableDeck(gameId: string, questions: Question[]): PlayableDeck {
  const unseen = getUnseenQuestions(gameId, questions);
  if (unseen.length === 0 && questions.length > 0) {
    resetSeenQuestions(gameId);
    return {
      deck: shuffleQuestions(questions),
      didAutoReset: true,
    };
  }

  return {
    deck: shuffleQuestions(unseen),
    didAutoReset: false,
  };
}

function getWindowedCards(
  deckQuestions: Question[],
  activeIndex: number,
  size: number,
): Question[] {
  if (deckQuestions.length === 0) {
    return [];
  }
  return deckQuestions.slice(activeIndex, Math.min(deckQuestions.length, activeIndex + size));
}

function QuestionCard({ question, color }: { question: Question; color: string }) {
  return (
    <article
      className="relative p-10 md:p-14 rounded-3xl border-[8px] min-h-[420px] w-full flex items-center justify-center"
      style={{
        backgroundColor: color,
        borderColor: "#000",
        boxShadow: "14px 14px 0px #000, 0 0 60px rgba(0,0,0,0.35)",
      }}
    >
      <div className="absolute top-4 left-4 w-12 h-12 border-t-[6px] border-l-[6px] border-black" />
      <div className="absolute top-4 right-4 w-12 h-12 border-t-[6px] border-r-[6px] border-black" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b-[6px] border-l-[6px] border-black" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b-[6px] border-r-[6px] border-black" />

      <div
        className="absolute inset-0 opacity-5 rounded-3xl"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 0, transparent 50%)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 text-center">
        <div className="mb-8">
          <div
            className="inline-block px-6 py-2 bg-black text-white font-bold text-lg"
            style={{ fontFamily: "Courier New, monospace" }}
          >
            ❝ QUESTION ❞
          </div>
        </div>
        <p
          className="text-3xl md:text-5xl font-bold leading-tight"
          style={{
            fontFamily: "Courier New, monospace",
            color: "#000",
            textShadow: "3px 3px 0px rgba(255,255,255,0.4)",
          }}
        >
          {question.text}
        </p>
      </div>
    </article>
  );
}

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = gameId ? getGameById(gameId) : undefined;

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [deckQuestions, setDeckQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stackVersion, setStackVersion] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateSeenCount = useCallback(
    (sourceQuestions: Question[]) => {
      if (!gameId) {
        return;
      }
      const unseenCount = getUnseenQuestions(gameId, sourceQuestions).length;
      setSeenCount(sourceQuestions.length - unseenCount);
    },
    [gameId],
  );

  const markSeen = useCallback(
    (question: Question, sourceQuestions: Question[]) => {
      if (!gameId) {
        return;
      }
      markQuestionSeen(gameId, question.id);
      updateSeenCount(sourceQuestions);
    },
    [gameId, updateSeenCount],
  );

  const rebuildDeck = useCallback(
    (source: "shuffle" | "wrap", sourceQuestions: Question[]) => {
      if (!gameId || sourceQuestions.length === 0) {
        return;
      }

      const { deck, didAutoReset } = buildPlayableDeck(gameId, sourceQuestions);
      setDeckQuestions(deck);
      setActiveIndex(0);
      setStackVersion((value) => value + 1);

      if (deck[0]) {
        markSeen(deck[0], sourceQuestions);
      } else {
        updateSeenCount(sourceQuestions);
      }

      if (didAutoReset) {
        setStatusMessage("All questions were shown. Auto-resetting and reshuffling.");
      } else if (source === "shuffle") {
        setStatusMessage("Shuffled your remaining unseen questions.");
      } else {
        setStatusMessage(null);
      }
    },
    [gameId, markSeen, updateSeenCount],
  );

  useEffect(() => {
    if (!gameId || !game) {
      setError("Game not found.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    void (async () => {
      try {
        const questions = await fetchQuestionsByGameId(gameId);
        if (cancelled) {
          return;
        }

        setAllQuestions(questions);
        const { deck, didAutoReset } = buildPlayableDeck(gameId, questions);
        setDeckQuestions(deck);
        setActiveIndex(0);
        setStackVersion((value) => value + 1);

        if (deck[0]) {
          markSeen(deck[0], questions);
        } else {
          updateSeenCount(questions);
        }

        if (didAutoReset) {
          setStatusMessage("All questions were shown. Auto-resetting and reshuffling.");
        }

        setIsLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load questions for this game.";
        setError(message);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, game, markSeen, updateSeenCount]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setStatusMessage(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const advanceDeck = useCallback(() => {
    if (!gameId || !allQuestions.length || deckQuestions.length === 0) {
      return;
    }

    const nextIndex = activeIndex + 1;
    if (nextIndex >= deckQuestions.length) {
      rebuildDeck("wrap", allQuestions);
      return;
    }

    setActiveIndex(nextIndex);
    setStackVersion((value) => value + 1);
    const question = deckQuestions[nextIndex];
    if (question) {
      markSeen(question, allQuestions);
    }
  }, [gameId, allQuestions, deckQuestions, activeIndex, rebuildDeck, markSeen]);

  const handleStackChange = useCallback(
    (_index: number, payload: { direction: "next" | "prev" }) => {
      if (payload.direction !== "next") {
        return;
      }
      advanceDeck();
    },
    [advanceDeck],
  );

  const visibleQuestions = useMemo(
    () => getWindowedCards(deckQuestions, activeIndex, STACK_WINDOW_SIZE),
    [deckQuestions, activeIndex],
  );

  const unseenCount = useMemo(() => {
    if (!allQuestions.length) {
      return 0;
    }
    return Math.max(0, allQuestions.length - seenCount);
  }, [allQuestions.length, seenCount]);

  if (!game) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}
      >
        <div className="text-center">
          <p className="text-white text-xl mb-4">Game not found</p>
          <Link
            to="/"
            className="px-6 py-3 border-2 border-black font-bold"
            style={{ backgroundColor: "#FFD93D", fontFamily: "Courier New, monospace" }}
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8 flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}
    >
      <InteractiveBackground />

      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          zIndex: 2,
        }}
      />

      <div className="max-w-6xl mx-auto w-full mb-8 relative" style={{ zIndex: 10 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 border-4 transition-all hover:scale-105 hover:-rotate-2"
            style={{
              backgroundColor: "#fff",
              borderColor: "#000",
              fontFamily: "Courier New, monospace",
              fontWeight: "bold",
              color: "#000",
              fontSize: "1.1rem",
              boxShadow: "6px 6px 0px #000",
            }}
          >
            <ArrowLeft size={24} />
            BACK
          </Link>

          <div className="flex-1 text-center">
            <div className="inline-block px-6 py-2 border-4 border-dashed mb-3" style={{ borderColor: game.color }}>
              <p className="text-sm font-bold tracking-wider" style={{ fontFamily: "Courier New, monospace", color: "#fff" }}>
                NOW PLAYING
              </p>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold"
              style={{
                fontFamily: "Courier New, monospace",
                color: game.color,
                textShadow: "4px 4px 0px #000",
              }}
            >
              {game.name}
            </h1>
          </div>

          <button
            onClick={() => rebuildDeck("shuffle", allQuestions)}
            disabled={isLoading || allQuestions.length === 0}
            className="flex items-center gap-2 px-6 py-3 border-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:rotate-2"
            style={{
              backgroundColor: game.color,
              borderColor: "#000",
              fontFamily: "Courier New, monospace",
              fontWeight: "bold",
              color: "#000",
              fontSize: "1.1rem",
              boxShadow: "6px 6px 0px #000",
            }}
          >
            <RotateCcw size={24} />
            SHUFFLE
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative py-8" style={{ zIndex: 10 }}>
        {isLoading && (
          <div className="text-center">
            <p className="text-white text-2xl font-bold" style={{ fontFamily: "Courier New, monospace" }}>
              Loading questions...
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center">
            <p className="text-white text-2xl font-bold mb-3" style={{ fontFamily: "Courier New, monospace" }}>
              Could not load this deck.
            </p>
            <p className="text-white/80" style={{ fontFamily: "Courier New, monospace" }}>
              {error}
            </p>
          </div>
        )}

        {!isLoading && !error && deckQuestions.length > 0 && (
          <div className="w-full max-w-5xl">
            <div className="text-center mb-6">
              <div
                className="inline-block px-8 py-3 border-4 border-black"
                style={{
                  backgroundColor: "#fff",
                  fontFamily: "Courier New, monospace",
                  boxShadow: "6px 6px 0px #000",
                }}
              >
                <p className="font-bold text-2xl">
                  Card {Math.min(activeIndex + 1, deckQuestions.length)} / {deckQuestions.length}
                </p>
              </div>
            </div>

            {visibleQuestions.length > 1 ? (
              <DraggableCardStack
                key={`${game.id}-${stackVersion}`}
                stackOffsetX={130}
                stackOffsetY={120}
                visibleCount={4}
                duration={0.75}
                dragThreshold={20}
                appearEffect
                appearDuration={0.6}
                showControls
                controlSize={54}
                controlBgColor="#000000"
                controlColor="#ffffff"
                forwardOnly
                onIndexChange={handleStackChange}
              >
                {visibleQuestions.map((question) => (
                  <QuestionCard key={question.id} question={question} color={game.color} />
                ))}
              </DraggableCardStack>
            ) : (
              visibleQuestions[0] && <QuestionCard question={visibleQuestions[0]} color={game.color} />
            )}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto w-full mt-8 relative" style={{ zIndex: 10 }}>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div
            className="px-6 py-3 border-4 border-black font-bold text-lg"
            style={{
              backgroundColor: "#fff",
              fontFamily: "Courier New, monospace",
              boxShadow: "6px 6px 0px #000",
            }}
          >
            Seen: {seenCount} / {allQuestions.length}
          </div>
          <div
            className="px-6 py-3 border-4 border-black font-bold text-lg"
            style={{
              backgroundColor: game.color,
              fontFamily: "Courier New, monospace",
              boxShadow: "6px 6px 0px #000",
            }}
          >
            Remaining this cycle: {unseenCount}
          </div>
        </div>

        {statusMessage && (
          <div className="mt-6 text-center">
            <div className="inline-block px-8 py-4 border-4 border-dashed" style={{ borderColor: game.color }}>
              <p className="text-lg font-bold" style={{ fontFamily: "Courier New, monospace", color: "#fff" }}>
                {statusMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
