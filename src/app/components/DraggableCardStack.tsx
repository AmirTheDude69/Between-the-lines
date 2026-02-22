import React, { useEffect, useId, useMemo, useRef, useState } from "react";

const GSAP_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/gsap.min.js";
const DRAGGABLE_SRC =
  "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/Draggable.min.js";
const CUSTOM_EASE_SRC =
  "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/CustomEase.min.js";

type TriggerType = "drag" | "button" | "keyboard";
type DirectionType = "next" | "prev";

interface IndexChangePayload {
  direction: DirectionType;
  wrapped: boolean;
  trigger: TriggerType;
}

interface DraggableCardStackProps {
  children: React.ReactNode;
  stackOffsetX?: number;
  stackOffsetY?: number;
  visibleCount?: number;
  duration?: number;
  dragThreshold?: number;
  appearEffect?: boolean;
  appearDuration?: number;
  showControls?: boolean;
  controlSize?: number;
  controlBgColor?: string;
  controlColor?: string;
  controlIcon?: string;
  forwardOnly?: boolean;
  onIndexChange?: (index: number, payload: IndexChangePayload) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadScript(src: string, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error(`No document available for ${src}`));
      return;
    }

    let timeoutId = 0;
    const finish = (fn: () => void): void => {
      window.clearTimeout(timeoutId);
      fn();
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      const status = existing.dataset.status;
      if (status === "loaded") {
        resolve();
        return;
      }
      if (status === "error") {
        existing.remove();
      } else {
        existing.addEventListener("load", () => finish(resolve), { once: true });
        existing.addEventListener(
          "error",
          () => finish(() => reject(new Error(`Failed to load ${src}`))),
          { once: true },
        );
        timeoutId = window.setTimeout(() => {
          reject(new Error(`Timed out loading ${src}`));
        }, timeoutMs);
        return;
      }
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.status = "loading";
    script.onload = () => {
      script.dataset.status = "loaded";
      finish(resolve);
    };
    script.onerror = () => {
      script.dataset.status = "error";
      finish(() => reject(new Error(`Failed to load ${src}`)));
    };
    document.head.appendChild(script);

    timeoutId = window.setTimeout(() => {
      script.dataset.status = "error";
      reject(new Error(`Timed out loading ${src}`));
    }, timeoutMs);
  });
}

function useContainerWidth(
  ref: React.RefObject<HTMLDivElement>,
  hasChildren: boolean,
): number {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    let raf = 0;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const measured =
          entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        if (measured > 0) {
          window.cancelAnimationFrame(raf);
          raf = window.requestAnimationFrame(() => {
            setWidth((previous) => (Math.abs(previous - measured) > 0.5 ? measured : previous));
          });
        }
      }
    });

    observer.observe(element);
    const rect = element.getBoundingClientRect();
    if (rect.width > 0) {
      setWidth(rect.width);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [ref, hasChildren]);

  return width;
}

export default function DraggableCardStack({
  children,
  stackOffsetX = 120,
  stackOffsetY = 120,
  visibleCount = 4,
  duration = 0.75,
  dragThreshold = 20,
  appearEffect = true,
  appearDuration = 0.6,
  showControls = true,
  controlSize = 48,
  controlBgColor = "#1a1a2e",
  controlColor = "#ffffff",
  controlIcon = "",
  forwardOnly = false,
  onIndexChange,
}: DraggableCardStackProps): JSX.Element {
  const safeVisibleCountProp = clamp(Math.round(visibleCount), 2, 20);
  const safeDuration = clamp(duration, 0.1, 4);
  const safeDragThreshold = clamp(dragThreshold, 1, 95);
  const safeControlSize = clamp(controlSize, 24, 120);
  const safeAppearDuration = clamp(appearDuration, 0.1, 3);

  const [ready, setReady] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const animateNextRef = useRef<(trigger?: TriggerType) => void>(() => {});
  const animatePrevRef = useRef<(trigger?: TriggerType) => void>(() => {});
  const uniqueId = `dcs-${useId().replace(/:/g, "")}`;

  const hasChildren = React.Children.count(children) > 0;
  const containerWidth = useContainerWidth(stackRef, hasChildren);
  const childArray = useMemo(() => React.Children.toArray(children), [children]);
  const childCount = childArray.length;

  const responsive = useMemo(() => {
    const isMobile = containerWidth < 768;
    const isSmall = containerWidth < 480;
    const scale = isMobile ? Math.max(0.65, containerWidth / 768) : 1;
    const resize = (value: number): number => value * scale;

    return {
      stackOffsetX: resize(
        isSmall ? stackOffsetX * 0.3 : isMobile ? stackOffsetX * 0.5 : stackOffsetX,
      ),
      stackOffsetY: resize(
        isSmall ? stackOffsetY * 0.3 : isMobile ? stackOffsetY * 0.5 : stackOffsetY,
      ),
      controlSize: Math.max(36, resize(safeControlSize)),
      gap: resize(isMobile ? 20 : 32),
      controlGap: resize(6),
      stackPaddingLeft: isSmall ? 12 : isMobile ? 16 : 0,
    };
  }, [containerWidth, stackOffsetX, stackOffsetY, safeControlSize]);

  const displayItems = useMemo(() => {
    if (childArray.length === 0) {
      return [];
    }

    const minNeeded = Math.max(safeVisibleCountProp + 1, 5);
    if (childArray.length >= minNeeded) {
      return childArray;
    }

    const result: React.ReactNode[] = [];
    const setsNeeded = Math.ceil(minNeeded / childArray.length);
    for (let i = 0; i < setsNeeded * childArray.length; i += 1) {
      result.push(childArray[i % childArray.length]);
    }
    return result;
  }, [childArray, safeVisibleCountProp]);

  const totalCount = displayItems.length;

  useEffect(() => {
    setReady(false);
    if (totalCount < 2 || typeof window === "undefined") {
      setReady(true);
      return;
    }

    const state: {
      draggable: any;
      timelines: any[];
      keyDown: ((event: KeyboardEvent) => void) | null;
      observer: IntersectionObserver | null;
      cardElements: HTMLElement[];
    } = {
      draggable: null,
      timelines: [],
      keyDown: null,
      observer: null,
      cardElements: [],
    };

    let cancelled = false;

    const init = async (): Promise<void> => {
      try {
        const globalWindow = window as typeof window & {
          gsap?: any;
          Draggable?: any;
          CustomEase?: any;
        };

        if (!globalWindow.gsap) {
          await loadScript(GSAP_SRC);
        }
        if (cancelled) {
          return;
        }

        const pluginLoads: Promise<void>[] = [];
        if (!globalWindow.Draggable) {
          pluginLoads.push(loadScript(DRAGGABLE_SRC));
        }
        if (!globalWindow.CustomEase) {
          pluginLoads.push(loadScript(CUSTOM_EASE_SRC));
        }
        await Promise.all(pluginLoads);
        if (cancelled) {
          return;
        }

        const gsap = globalWindow.gsap;
        const DraggablePlugin = globalWindow.Draggable;
        const CustomEasePlugin = globalWindow.CustomEase;
        if (!gsap || !DraggablePlugin) {
          return;
        }

        gsap.registerPlugin(DraggablePlugin, CustomEasePlugin);
        if (CustomEasePlugin) {
          try {
            CustomEasePlugin.create("stackEase", "0.625, 0.05, 0, 1");
          } catch {
            // no-op: ease already exists
          }
        }

        const mainEase = CustomEasePlugin ? "stackEase" : "power2.out";
        const list = listRef.current;
        const stackElement = stackRef.current;
        if (!list || !stackElement) {
          return;
        }

        const cardElements = Array.from(
          list.querySelectorAll<HTMLElement>("[data-card-item]"),
        );
        state.cardElements = cardElements;
        if (cardElements.length < 2) {
          setReady(true);
          return;
        }

        const total = cardElements.length;
        const logicalTotal = childCount > 0 ? childCount : total;
        const safeVisibleCount = Math.min(safeVisibleCountProp, total - 1);
        let activeIndex = 0;
        let isAnimating = false;
        let dragCard: HTMLElement | null = null;
        let limitX = 1;
        let limitY = 1;
        let isActive = true;

        const mod = (n: number, m: number): number => ((n % m) + m) % m;
        const toLogical = (index: number): number => mod(index, logicalTotal);
        const cardAt = (offset: number): HTMLElement =>
          cardElements[mod(activeIndex + offset, total)];
        const offsetSteps = Math.max(1, safeVisibleCount - 1);
        const offsetX = `${responsive.stackOffsetX / offsetSteps}px`;
        const offsetY = `${responsive.stackOffsetY / offsetSteps}px`;

        const getUnitValue = (value: string, depth: number): string => {
          const numeric = parseFloat(value) || 0;
          const unit = value.replace(/[0-9.-]/g, "") || "px";
          return `${numeric * depth}${unit}`;
        };

        const emitIndexChange = (
          nextActiveIndex: number,
          payload: IndexChangePayload,
        ): void => {
          if (!onIndexChange || logicalTotal < 1) {
            return;
          }
          onIndexChange(toLogical(nextActiveIndex), payload);
        };

        const updateDragLimits = (): void => {
          if (!dragCard) {
            return;
          }
          const rect = dragCard.getBoundingClientRect();
          limitX = rect.width || 1;
          limitY = rect.height || 1;
        };

        const applyState = (): void => {
          cardElements.forEach((card) => {
            gsap.set(card, {
              opacity: 0,
              pointerEvents: "none",
              zIndex: 0,
              x: 0,
              y: 0,
              xPercent: 0,
              yPercent: 0,
            });
          });

          for (let depth = 0; depth < safeVisibleCount; depth += 1) {
            const card = cardAt(depth);
            const xValue = getUnitValue(offsetX, depth);
            const yValue = getUnitValue(offsetY, depth);
            const styleState: Record<string, string | number> = {
              opacity: 1,
              zIndex: 999 - depth,
              pointerEvents: depth === 0 ? "auto" : "none",
            };

            if (offsetX.includes("%")) {
              styleState.xPercent = parseFloat(xValue);
            } else {
              styleState.x = xValue;
            }
            if (offsetY.includes("%")) {
              styleState.yPercent = parseFloat(yValue);
            } else {
              styleState.y = yValue;
            }

            gsap.set(card, styleState);
          }

          dragCard = cardAt(0);
          gsap.set(dragCard, { touchAction: "none" });
          updateDragLimits();

          if (state.draggable) {
            state.draggable.kill();
            state.draggable = null;
          }

          const magnetize = (raw: number, limit: number): number => {
            const sign = Math.sign(raw) || 1;
            const absolute = Math.abs(raw);
            return sign * limit * Math.tanh(absolute / limit);
          };

          const draggableInstance = DraggablePlugin.create(dragCard, {
            type: "x,y",
            inertia: false,
            onPress() {
              if (isAnimating || !dragCard) {
                return;
              }
              gsap.killTweensOf(dragCard);
              gsap.set(dragCard, { zIndex: 2000, opacity: 1 });
            },
            onDrag() {
              if (isAnimating || !dragCard) {
                return;
              }
              const x = magnetize(this.x, limitX);
              const y = magnetize(this.y, limitY);
              gsap.set(dragCard, { x, y, opacity: 1 });
            },
            onRelease() {
              if (isAnimating || !dragCard) {
                return;
              }

              const currentX = gsap.getProperty(dragCard, "x");
              const currentY = gsap.getProperty(dragCard, "y");
              const percentX = (Math.abs(currentX) / limitX) * 100;
              const percentY = (Math.abs(currentY) / limitY) * 100;
              if (Math.max(percentX, percentY) >= safeDragThreshold) {
                animateNext(true, currentX, currentY, "drag");
                return;
              }

              gsap.to(dragCard, {
                x: 0,
                y: 0,
                opacity: 1,
                duration: 1,
                ease: "elastic.out(1, 0.7)",
                onComplete: applyState,
              });
            },
          });

          state.draggable = draggableInstance?.[0] ?? null;
        };

        const pruneTimeline = (timeline: any): void => {
          const index = state.timelines.indexOf(timeline);
          if (index !== -1) {
            state.timelines.splice(index, 1);
          }
        };

        const animateNext = (
          fromDrag = false,
          releaseX = 0,
          releaseY = 0,
          trigger: TriggerType = "button",
        ): void => {
          if (isAnimating) {
            return;
          }

          isAnimating = true;
          const outgoing = cardAt(0);
          const incomingBack = cardAt(safeVisibleCount);
          const previousLogical = toLogical(activeIndex);
          const nextActive = mod(activeIndex + 1, total);
          const nextLogical = toLogical(nextActive);
          const wrapped = nextLogical === 0 && previousLogical === logicalTotal - 1;

          const timeline = gsap.timeline({
            defaults: { duration: safeDuration, ease: mainEase },
            onComplete: () => {
              pruneTimeline(timeline);
              activeIndex = nextActive;
              applyState();
              isAnimating = false;
              emitIndexChange(activeIndex, {
                direction: "next",
                wrapped,
                trigger,
              });
            },
          });

          state.timelines.push(timeline);

          gsap.set(outgoing, { zIndex: 2000, opacity: 1 });
          if (fromDrag) {
            gsap.set(outgoing, { x: releaseX, y: releaseY });
          }

          timeline.to(outgoing, { yPercent: 200 }, 0);
          timeline.to(
            outgoing,
            { opacity: 0, duration: safeDuration * 0.2, ease: "none" },
            safeDuration * 0.4,
          );

          for (let depth = 1; depth < safeVisibleCount; depth += 1) {
            const xValue = getUnitValue(offsetX, depth - 1);
            const yValue = getUnitValue(offsetY, depth - 1);
            const move: Record<string, string | number> = { zIndex: 999 - (depth - 1) };

            if (offsetX.includes("%")) {
              move.xPercent = parseFloat(xValue);
            } else {
              move.x = xValue;
            }
            if (offsetY.includes("%")) {
              move.yPercent = parseFloat(yValue);
            } else {
              move.y = yValue;
            }
            timeline.to(cardAt(depth), move, 0);
          }

          const backX = getUnitValue(offsetX, safeVisibleCount);
          const backY = getUnitValue(offsetY, safeVisibleCount);
          const startX = getUnitValue(offsetX, safeVisibleCount - 1);
          const startY = getUnitValue(offsetY, safeVisibleCount - 1);
          const incomingSet: Record<string, string | number> = {
            opacity: 0,
            zIndex: 999 - safeVisibleCount,
          };

          if (offsetX.includes("%")) {
            incomingSet.xPercent = parseFloat(backX);
          } else {
            incomingSet.x = backX;
          }
          if (offsetY.includes("%")) {
            incomingSet.yPercent = parseFloat(backY);
          } else {
            incomingSet.y = backY;
          }

          gsap.set(incomingBack, incomingSet);

          const incomingTo: Record<string, string | number> = { opacity: 1 };
          if (offsetX.includes("%")) {
            incomingTo.xPercent = parseFloat(startX);
          } else {
            incomingTo.x = startX;
          }
          if (offsetY.includes("%")) {
            incomingTo.yPercent = parseFloat(startY);
          } else {
            incomingTo.y = startY;
          }

          timeline.to(incomingBack, incomingTo, 0);
        };

        const animatePrev = (trigger: TriggerType = "button"): void => {
          if (forwardOnly || isAnimating) {
            return;
          }

          isAnimating = true;
          const incomingTop = cardAt(-1);
          const leavingBack = cardAt(safeVisibleCount - 1);
          const previousLogical = toLogical(activeIndex);
          const nextActive = mod(activeIndex - 1, total);
          const nextLogical = toLogical(nextActive);
          const wrapped = previousLogical === 0 && nextLogical === logicalTotal - 1;

          const timeline = gsap.timeline({
            defaults: { duration: safeDuration, ease: mainEase },
            onComplete: () => {
              pruneTimeline(timeline);
              activeIndex = nextActive;
              applyState();
              isAnimating = false;
              emitIndexChange(activeIndex, {
                direction: "prev",
                wrapped,
                trigger,
              });
            },
          });

          state.timelines.push(timeline);

          gsap.set(leavingBack, { zIndex: 1 });
          gsap.set(incomingTop, {
            opacity: 0,
            x: 0,
            xPercent: 0,
            yPercent: -200,
            zIndex: 2000,
          });

          timeline.to(incomingTop, { yPercent: 0 }, 0);
          timeline.to(
            incomingTop,
            { opacity: 1, duration: safeDuration * 0.2, ease: "none" },
            safeDuration * 0.3,
          );

          for (let depth = 0; depth < safeVisibleCount - 1; depth += 1) {
            const xValue = getUnitValue(offsetX, depth + 1);
            const yValue = getUnitValue(offsetY, depth + 1);
            const move: Record<string, string | number> = { zIndex: 999 - (depth + 1) };

            if (offsetX.includes("%")) {
              move.xPercent = parseFloat(xValue);
            } else {
              move.x = xValue;
            }
            if (offsetY.includes("%")) {
              move.yPercent = parseFloat(yValue);
            } else {
              move.y = yValue;
            }
            timeline.to(cardAt(depth), move, 0);
          }

          const backX = getUnitValue(offsetX, safeVisibleCount);
          const backY = getUnitValue(offsetY, safeVisibleCount);
          const hideBack: Record<string, string | number> = { opacity: 0 };

          if (offsetX.includes("%")) {
            hideBack.xPercent = parseFloat(backX);
          } else {
            hideBack.x = backX;
          }
          if (offsetY.includes("%")) {
            hideBack.yPercent = parseFloat(backY);
          } else {
            hideBack.y = backY;
          }
          timeline.to(leavingBack, hideBack, 0);
        };

        animateNextRef.current = (trigger = "button") =>
          animateNext(false, 0, 0, trigger);
        animatePrevRef.current = (trigger = "button") => animatePrev(trigger);

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              isActive = entry.isIntersecting && entry.intersectionRatio >= 0.6;
            });
          },
          { threshold: [0, 0.6, 1] },
        );
        observer.observe(stackElement);
        state.observer = observer;

        const onKeyDown = (event: KeyboardEvent): void => {
          if (!isActive || isAnimating) {
            return;
          }

          const target = event.target as HTMLElement | null;
          const tag = target?.tagName?.toLowerCase();
          const isTyping =
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            Boolean(target?.isContentEditable);

          if (isTyping) {
            return;
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            animateNext(false, 0, 0, "keyboard");
          }
          if (!forwardOnly && event.key === "ArrowLeft") {
            event.preventDefault();
            animatePrev("keyboard");
          }
        };

        window.addEventListener("keydown", onKeyDown);
        state.keyDown = onKeyDown;
        applyState();

        if (appearEffect) {
          const frontCard = cardAt(0);
          const backCards: HTMLElement[] = [];

          for (let i = 1; i < safeVisibleCount; i += 1) {
            backCards.push(cardAt(i));
          }

          const frontDuration = Math.max(0.15, safeAppearDuration * 0.4);
          const fanDuration = Math.max(0.2, safeAppearDuration * 0.6);
          const cardStagger = Math.max(0.08, safeAppearDuration * 0.18);
          const backTargets = backCards.map((card) => ({
            x: gsap.getProperty(card, "x"),
            y: gsap.getProperty(card, "y"),
          }));

          gsap.set(frontCard, { opacity: 0, y: "+=12", scale: 0.97 });
          gsap.set(backCards, { opacity: 0, x: 0, y: 0 });

          if (controlsRef.current) {
            gsap.set(controlsRef.current, { opacity: 0, y: 6 });
          }

          setReady(true);

          const appearTimeline = gsap.timeline();
          state.timelines.push(appearTimeline);
          appearTimeline.to(
            frontCard,
            {
              opacity: 1,
              y: "-=12",
              scale: 1,
              duration: frontDuration,
              ease: "power3.out",
            },
            0,
          );

          backCards.forEach((card, index) => {
            appearTimeline.to(
              card,
              {
                opacity: 1,
                x: backTargets[index].x,
                y: backTargets[index].y,
                duration: fanDuration,
                ease: "power3.out",
              },
              frontDuration + cardStagger * index,
            );
          });

          if (controlsRef.current) {
            const controlsStart =
              frontDuration + cardStagger * Math.max(0, backCards.length - 1) + fanDuration * 0.4;
            appearTimeline.to(
              controlsRef.current,
              {
                opacity: 1,
                y: 0,
                duration: 0.3,
                ease: "power2.out",
              },
              controlsStart,
            );
          }
        } else {
          setReady(true);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("DraggableCardStack: Failed to initialize", error);
        setReady(true);
      }
    };

    void init();

    return () => {
      cancelled = true;
      animateNextRef.current = () => {};
      animatePrevRef.current = () => {};

      if (state.draggable) {
        state.draggable.kill();
      }

      state.timelines.forEach((timeline) => timeline.kill());
      state.timelines.length = 0;

      if (state.keyDown) {
        window.removeEventListener("keydown", state.keyDown);
      }
      if (state.observer) {
        state.observer.disconnect();
      }

      const globalWindow = window as typeof window & { gsap?: any };
      if (globalWindow.gsap) {
        if (controlsRef.current) {
          globalWindow.gsap.killTweensOf(controlsRef.current);
        }
        state.cardElements.forEach((element) => globalWindow.gsap?.killTweensOf(element));
      }
    };
  }, [
    childCount,
    totalCount,
    safeVisibleCountProp,
    safeDuration,
    safeDragThreshold,
    appearEffect,
    safeAppearDuration,
    responsive.stackOffsetX,
    responsive.stackOffsetY,
    forwardOnly,
    onIndexChange,
  ]);

  if (childArray.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: "#999",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        No cards available
      </div>
    );
  }

  return (
    <div
      ref={stackRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: `${responsive.gap}px`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          opacity: ready ? 1 : 0,
          paddingLeft: responsive.stackPaddingLeft
            ? `${responsive.stackPaddingLeft}px`
            : undefined,
          paddingRight: `${responsive.stackOffsetX}px`,
          paddingBottom: `${responsive.stackOffsetY}px`,
        }}
      >
        <div
          ref={listRef}
          style={{
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            position: "relative",
          }}
        >
          {displayItems.map((child, index) => (
            <div
              key={index}
              data-card-item
              aria-hidden={index >= childCount ? "true" : undefined}
              style={{
                willChange: "transform, opacity",
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                position: index === 0 ? "relative" : "absolute",
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <div
          ref={controlsRef}
          style={{
            display: "flex",
            gap: `${responsive.controlGap}px`,
            justifyContent: "center",
          }}
        >
          {!forwardOnly && (
            <button
              type="button"
              aria-label="Previous"
              className={`${uniqueId}-control`}
              onClick={() => animatePrevRef.current("button")}
              style={{
                cursor: "pointer",
                borderRadius: "50%",
                transform: "scaleX(-1)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                border: 0,
                background: "transparent",
                padding: 0,
              }}
            >
              <div
                className={`${uniqueId}-circle`}
                style={{
                  color: controlColor,
                  backgroundColor: controlBgColor,
                  opacity: 0.5,
                  borderRadius: "50%",
                  flex: "none",
                  justifyContent: "center",
                  alignItems: "center",
                  width: `${responsive.controlSize}px`,
                  height: `${responsive.controlSize}px`,
                  display: "flex",
                  position: "relative",
                  transition: "transform 0.3s ease",
                  transform: "translateY(0) rotate(0.001deg)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                {controlIcon ? (
                  <img
                    src={controlIcon}
                    alt=""
                    style={{
                      width: "40%",
                      height: "40%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="40%" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M6.74976 14.25L11.9998 9L6.74976 3.75"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          )}

          <button
            type="button"
            aria-label="Next"
            className={`${uniqueId}-control`}
            onClick={() => animateNextRef.current("button")}
            style={{
              cursor: "pointer",
              borderRadius: "50%",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              border: 0,
              background: "transparent",
              padding: 0,
            }}
          >
            <div
              className={`${uniqueId}-circle`}
              style={{
                color: controlColor,
                backgroundColor: controlBgColor,
                borderRadius: "50%",
                flex: "none",
                justifyContent: "center",
                alignItems: "center",
                width: `${responsive.controlSize}px`,
                height: `${responsive.controlSize}px`,
                display: "flex",
                position: "relative",
                transition: "transform 0.3s ease",
                transform: "translateY(0) rotate(0.001deg)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {controlIcon ? (
                <img
                  src={controlIcon}
                  alt=""
                  style={{
                    width: "40%",
                    height: "40%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="40%" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M6.74976 14.25L11.9998 9L6.74976 3.75"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>
      )}

      <style>{`
        .${uniqueId}-control:hover .${uniqueId}-circle {
          transform: translateY(-2px) scale(1.05) rotate(0.001deg) !important;
        }
        .${uniqueId}-control:focus-visible {
          outline: 2px solid #4F46E5;
          outline-offset: 2px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
