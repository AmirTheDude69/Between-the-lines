import { useEffect, useRef } from 'react';

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
  mass: number;
  originalY: number;
}

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const bricksRef = useRef<LegoBrick[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper function to adjust color brightness
    const adjustColor = (color: string, amount: number): string => {
      const hex = color.replace('#', '');
      const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
      const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
      const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Initialize LEGO bricks
    const initBricks = () => {
      const colors = ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4ECDC4', '#C77DFF', '#FF8C42', '#6A4C93'];
      const brickTypes = [
        { width: 40, height: 24 }, // 2x1
        { width: 60, height: 24 }, // 3x1
        { width: 80, height: 24 }, // 4x1
        { width: 40, height: 40 }, // 2x2
      ];

      bricksRef.current = Array.from({ length: 2000 }, () => {
        const type = brickTypes[Math.floor(Math.random() * brickTypes.length)];
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          width: type.width,
          height: type.height,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: 0,
          vy: 0,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: 0,
          isActive: false,
          mass: (type.width * type.height) / 1000,
          originalY: 0
        };
      });

      // Set original Y positions
      bricksRef.current.forEach(brick => {
        brick.originalY = brick.y;
      });
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Reinitialize bricks on resize
      initBricks();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Draw LEGO brick
    const drawLegoBrick = (brick: LegoBrick) => {
      ctx.save();
      ctx.translate(brick.x, brick.y);
      ctx.rotate(brick.rotation);

      // Main brick body with gradient
      const gradient = ctx.createLinearGradient(-brick.width / 2, -brick.height / 2, brick.width / 2, brick.height / 2);
      gradient.addColorStop(0, brick.color);
      gradient.addColorStop(1, adjustColor(brick.color, -30));
      
      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      
      // Draw brick body
      ctx.fillRect(-brick.width / 2, -brick.height / 2, brick.width, brick.height);
      ctx.strokeRect(-brick.width / 2, -brick.height / 2, brick.width, brick.height);

      // Draw studs (the bumps on top)
      const studRadius = 4;
      const studCount = Math.floor(brick.width / 20);
      const studSpacing = brick.width / (studCount + 1);

      ctx.fillStyle = adjustColor(brick.color, 20);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < studCount; i++) {
        const studX = -brick.width / 2 + studSpacing * (i + 1);
        const studY = -brick.height / 2 - 3;
        
        ctx.beginPath();
        ctx.arc(studX, studY, studRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Add shine effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(-brick.width / 2 + 2, -brick.height / 2 + 2, brick.width / 3, brick.height / 4);

      ctx.restore();
    };

    // Physics constants
    const GRAVITY = 0.5;
    const FRICTION = 0.99;
    const BOUNCE = 0.4;
    const ACTIVATION_RADIUS = 120;

    // Animation loop
    let animationId: number;
    let hue = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid pattern
      ctx.strokeStyle = `rgba(255, 255, 255, 0.02)`;
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

      // Update and draw LEGO bricks
      bricksRef.current.forEach((brick) => {
        // Check distance from mouse
        const dx = brick.x - mouseRef.current.x;
        const dy = brick.y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if brick is near the bottom (settled)
        const isNearBottom = brick.y > canvas.height - brick.height / 2 - 50;

        // Activate brick if mouse is near
        if (distance < ACTIVATION_RADIUS) {
          if (!brick.isActive) {
            brick.isActive = true;
            // Apply initial impulse away from mouse
            const angle = Math.atan2(dy, dx);
            const force = (ACTIVATION_RADIUS - distance) / ACTIVATION_RADIUS * 8;
            brick.vx = Math.cos(angle) * force + (Math.random() - 0.5) * 2;
            brick.vy = Math.sin(angle) * force - Math.random() * 3;
            brick.rotationSpeed = (Math.random() - 0.5) * 0.3;
          } else if (isNearBottom && Math.abs(brick.vx) < 2 && Math.abs(brick.vy) < 2) {
            // If brick is settled at the bottom and mouse hovers over it, throw it up
            const angle = Math.atan2(dy, dx);
            const upwardForce = (ACTIVATION_RADIUS - distance) / ACTIVATION_RADIUS * 15;
            brick.vx = Math.cos(angle) * upwardForce + (Math.random() - 0.5) * 4;
            brick.vy = -Math.abs(upwardForce) - Math.random() * 5; // Strong upward force
            brick.rotationSpeed = (Math.random() - 0.5) * 0.4;
          }
        }

        // Apply physics if brick is active
        if (brick.isActive) {
          // Apply gravity
          brick.vy += GRAVITY;

          // Apply friction
          brick.vx *= FRICTION;
          brick.vy *= FRICTION;

          // Update position
          brick.x += brick.vx;
          brick.y += brick.vy;

          // Update rotation
          brick.rotation += brick.rotationSpeed;
          brick.rotationSpeed *= 0.99;

          // Bounce off ground
          if (brick.y > canvas.height - brick.height / 2) {
            brick.y = canvas.height - brick.height / 2;
            brick.vy *= -BOUNCE;
            brick.rotationSpeed *= 0.8;
            
            // Stop if moving very slowly
            if (Math.abs(brick.vy) < 0.5 && Math.abs(brick.vx) < 0.5) {
              brick.vy = 0;
              brick.vx *= 0.8;
            }
          }

          // Bounce off walls
          if (brick.x < brick.width / 2) {
            brick.x = brick.width / 2;
            brick.vx *= -BOUNCE;
          }
          if (brick.x > canvas.width - brick.width / 2) {
            brick.x = canvas.width - brick.width / 2;
            brick.vx *= -BOUNCE;
          }

          // Bounce off ceiling
          if (brick.y < brick.height / 2) {
            brick.y = brick.height / 2;
            brick.vy *= -BOUNCE;
          }

          // Add slight continuous mouse repulsion when active
          if (distance < ACTIVATION_RADIUS * 1.5) {
            const force = (ACTIVATION_RADIUS * 1.5 - distance) / (ACTIVATION_RADIUS * 1.5) * 0.5;
            brick.vx += (dx / distance) * force;
            brick.vy += (dy / distance) * force;
          }
        }

        // Draw brick
        drawLegoBrick(brick);
      });

      hue = (hue + 0.8) % 360;

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
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