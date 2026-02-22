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

function drawLegoBrick(ctx: CanvasRenderingContext2D, brick: LegoBrick): void {
  ctx.save();
  ctx.translate(brick.x, brick.y);
  ctx.rotate(brick.rotation);

  const gradient = ctx.createLinearGradient(
    -brick.width / 2,
    -brick.height / 2,
    brick.width / 2,
    brick.height / 2,
  );
  gradient.addColorStop(0, brick.color);
  gradient.addColorStop(1, adjustColor(brick.color, -30));

  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillRect(-brick.width / 2, -brick.height / 2, brick.width, brick.height);
  ctx.strokeRect(-brick.width / 2, -brick.height / 2, brick.width, brick.height);

  const studRadius = 4;
  const studCount = Math.floor(brick.width / 20);
  const studSpacing = brick.width / (studCount + 1);
  ctx.fillStyle = adjustColor(brick.color, 20);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;

  for (let index = 0; index < studCount; index += 1) {
    const studX = -brick.width / 2 + studSpacing * (index + 1);
    const studY = -brick.height / 2 - 3;
    ctx.beginPath();
    ctx.arc(studX, studY, studRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(
    -brick.width / 2 + 2,
    -brick.height / 2 + 2,
    brick.width / 3,
    brick.height / 4,
  );

  ctx.restore();
}

function createBricks(count: number, width: number, height: number): LegoBrick[] {
  return Array.from({ length: count }, () => {
    const type = BRICK_TYPES[Math.floor(Math.random() * BRICK_TYPES.length)];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
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
}

export function InteractiveBackground({
  variant = "animated",
}: {
  variant?: "animated" | "static";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const bricksRef = useRef<LegoBrick[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const isStatic = variant === "static";

    const resizeCanvas = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      bricksRef.current = createBricks(
        isStatic ? 260 : 2000,
        canvas.width,
        canvas.height,
      );
      if (isStatic) {
        drawStatic();
      }
    };

    const drawGrid = (alpha: number): void => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const drawStatic = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(0.015);
      bricksRef.current.forEach((brick) => drawLegoBrick(ctx, brick));
    };

    const handlePointerMove = (event: PointerEvent): void => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (isStatic) {
      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const GRAVITY = 0.5;
    const FRICTION = 0.99;
    const BOUNCE = 0.4;
    const ACTIVATION_RADIUS = 120;
    let animationId = 0;

    const animate = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(0.02);

      bricksRef.current.forEach((brick) => {
        const dx = brick.x - mouseRef.current.x;
        const dy = brick.y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isNearBottom = brick.y > canvas.height - brick.height / 2 - 50;

        if (distance < ACTIVATION_RADIUS) {
          if (!brick.isActive) {
            brick.isActive = true;
            const angle = Math.atan2(dy, dx);
            const force = ((ACTIVATION_RADIUS - distance) / ACTIVATION_RADIUS) * 8;
            brick.vx = Math.cos(angle) * force + (Math.random() - 0.5) * 2;
            brick.vy = Math.sin(angle) * force - Math.random() * 3;
            brick.rotationSpeed = (Math.random() - 0.5) * 0.3;
          } else if (isNearBottom && Math.abs(brick.vx) < 2 && Math.abs(brick.vy) < 2) {
            const angle = Math.atan2(dy, dx);
            const upwardForce =
              ((ACTIVATION_RADIUS - distance) / ACTIVATION_RADIUS) * 15;
            brick.vx = Math.cos(angle) * upwardForce + (Math.random() - 0.5) * 4;
            brick.vy = -Math.abs(upwardForce) - Math.random() * 5;
            brick.rotationSpeed = (Math.random() - 0.5) * 0.4;
          }
        }

        if (brick.isActive) {
          brick.vy += GRAVITY;
          brick.vx *= FRICTION;
          brick.vy *= FRICTION;
          brick.x += brick.vx;
          brick.y += brick.vy;
          brick.rotation += brick.rotationSpeed;
          brick.rotationSpeed *= 0.99;

          if (brick.y > canvas.height - brick.height / 2) {
            brick.y = canvas.height - brick.height / 2;
            brick.vy *= -BOUNCE;
            brick.rotationSpeed *= 0.8;
            if (Math.abs(brick.vy) < 0.5 && Math.abs(brick.vx) < 0.5) {
              brick.vy = 0;
              brick.vx *= 0.8;
            }
          }

          if (brick.x < brick.width / 2) {
            brick.x = brick.width / 2;
            brick.vx *= -BOUNCE;
          }
          if (brick.x > canvas.width - brick.width / 2) {
            brick.x = canvas.width - brick.width / 2;
            brick.vx *= -BOUNCE;
          }
          if (brick.y < brick.height / 2) {
            brick.y = brick.height / 2;
            brick.vy *= -BOUNCE;
          }

          if (distance < ACTIVATION_RADIUS * 1.5 && distance > 0) {
            const force =
              ((ACTIVATION_RADIUS * 1.5 - distance) / (ACTIVATION_RADIUS * 1.5)) * 0.5;
            brick.vx += (dx / distance) * force;
            brick.vy += (dy / distance) * force;
          }
        }

        drawLegoBrick(ctx, brick);
      });

      animationId = window.requestAnimationFrame(animate);
    };

    animationId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      window.cancelAnimationFrame(animationId);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
