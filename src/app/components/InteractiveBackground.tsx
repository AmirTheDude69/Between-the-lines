import { useEffect, useRef } from "react";

interface LegoBrick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  isActive: boolean;
}

const COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCF7F",
  "#4ECDC4",
  "#C77DFF",
  "#FF8C42",
  "#6A4C93",
];

const BRICK_TYPES = [
  { width: 40, height: 24 },
  { width: 60, height: 24 },
  { width: 80, height: 24 },
  { width: 40, height: 40 },
];

function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const red = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const green = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const blue = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${red.toString(16).padStart(2, "0")}${green
    .toString(16)
    .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

function getPerfMode(): { lowPower: boolean; maxDpr: number; brickCount: number } {
  const isSmallScreen =
    typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch =
    typeof navigator !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const deviceMemory =
    typeof navigator !== "undefined" &&
    "deviceMemory" in navigator &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory ===
      "number"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
      : 4;

  const lowPower = isSmallScreen || prefersReducedMotion || isTouch || deviceMemory <= 4;
  return {
    lowPower,
    maxDpr: lowPower ? 1.1 : 1.8,
    brickCount: lowPower ? 180 : 700,
  };
}

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bricksRef = useRef<LegoBrick[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const perf = getPerfMode();

    const initBricks = (): void => {
      bricksRef.current = Array.from({ length: perf.brickCount }, () => {
        const type = BRICK_TYPES[Math.floor(Math.random() * BRICK_TYPES.length)];
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          width: type.width,
          height: type.height,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          vx: 0,
          vy: 0,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: 0,
          isActive: false,
        };
      });
    };

    const resizeCanvas = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, perf.maxDpr);
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      initBricks();
      drawFrame();
    };

    const drawBrick = (brick: LegoBrick): void => {
      context.save();
      context.translate(brick.x, brick.y);
      context.rotate(brick.rotation);

      const gradient = context.createLinearGradient(
        -brick.width / 2,
        -brick.height / 2,
        brick.width / 2,
        brick.height / 2,
      );
      gradient.addColorStop(0, brick.color);
      gradient.addColorStop(1, adjustColor(brick.color, -25));

      context.fillStyle = gradient;
      context.strokeStyle = "#000";
      context.lineWidth = perf.lowPower ? 1.5 : 2;
      context.fillRect(-brick.width / 2, -brick.height / 2, brick.width, brick.height);
      context.strokeRect(-brick.width / 2, -brick.height / 2, brick.width, brick.height);

      if (!perf.lowPower) {
        const studRadius = 3.5;
        const studCount = Math.floor(brick.width / 20);
        const studSpacing = brick.width / (studCount + 1);
        context.fillStyle = adjustColor(brick.color, 20);
        context.strokeStyle = "#000";
        context.lineWidth = 1.3;

        for (let index = 0; index < studCount; index += 1) {
          const studX = -brick.width / 2 + studSpacing * (index + 1);
          const studY = -brick.height / 2 - 3;
          context.beginPath();
          context.arc(studX, studY, studRadius, 0, Math.PI * 2);
          context.fill();
          context.stroke();
        }
      }

      context.restore();
    };

    const drawFrame = (): void => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const brick of bricksRef.current) {
        drawBrick(brick);
      }
    };

    const GRAVITY = 0.42;
    const FRICTION = 0.985;
    const BOUNCE = 0.42;
    const ACTIVATION_RADIUS = 115;
    let animationId = 0;
    let running = !document.hidden;

    const animate = (): void => {
      if (!running) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (const brick of bricksRef.current) {
        const dx = brick.x - mouseRef.current.x;
        const dy = brick.y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ACTIVATION_RADIUS) {
          if (!brick.isActive) {
            brick.isActive = true;
            const angle = Math.atan2(dy, dx);
            const force = ((ACTIVATION_RADIUS - distance) / ACTIVATION_RADIUS) * 7;
            brick.vx = Math.cos(angle) * force + (Math.random() - 0.5) * 1.5;
            brick.vy = Math.sin(angle) * force - Math.random() * 2.5;
            brick.rotationSpeed = (Math.random() - 0.5) * 0.24;
          }
        }

        if (brick.isActive) {
          brick.vy += GRAVITY;
          brick.vx *= FRICTION;
          brick.vy *= FRICTION;
          brick.x += brick.vx;
          brick.y += brick.vy;
          brick.rotation += brick.rotationSpeed;
          brick.rotationSpeed *= 0.985;

          if (brick.y > height - brick.height / 2) {
            brick.y = height - brick.height / 2;
            brick.vy *= -BOUNCE;
            if (Math.abs(brick.vy) < 0.45 && Math.abs(brick.vx) < 0.45) {
              brick.vy = 0;
              brick.vx *= 0.7;
            }
          }

          if (brick.x < brick.width / 2) {
            brick.x = brick.width / 2;
            brick.vx *= -BOUNCE;
          } else if (brick.x > width - brick.width / 2) {
            brick.x = width - brick.width / 2;
            brick.vx *= -BOUNCE;
          }

          if (brick.y < brick.height / 2) {
            brick.y = brick.height / 2;
            brick.vy *= -BOUNCE;
          }
        }

        drawBrick(brick);
      }

      animationId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleVisibility = (): void => {
      running = !document.hidden;
      if (running && !perf.lowPower) {
        animationId = window.requestAnimationFrame(animate);
      } else {
        window.cancelAnimationFrame(animationId);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (perf.lowPower) {
      // Mobile/low-power mode: static frame avoids tab crashes on iOS webviews.
      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    animationId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
