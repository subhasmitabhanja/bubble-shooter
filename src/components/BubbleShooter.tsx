/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BUBBLE_COLORS, GRID_CONFIG, PHYSICS } from '../constants';
import { 
  Bubble, 
  getBubblePos, 
  getBubbleGridPos, 
  findCluster, 
  findFloatingBubbles 
} from '../utils/gameLogic';
import { sounds } from '../utils/soundEffects';

interface Props {
  onGameOver: (score: number) => void;
  onWin: (score: number) => void;
  onScoreUpdate: (points: number) => void;
  onNextColorChange?: (color: string) => void;
}

const BubbleShooter: React.FC<Props> = ({ onGameOver, onWin, onScoreUpdate, onNextColorChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State Refs (to avoid stale closures in game loop)
  const grid = useRef<(Bubble | null)[][]>([]);
  const shooterAngle = useRef(0);
  const activeBubble = useRef<{ x: number, y: number, vx: number, vy: number, color: string } | null>(null);
  const nextColor = useRef<string>(BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]);
  const scoreRef = useRef(0);
  const isShooting = useRef(false);
  const particles = useRef<{ x: number, y: number, vx: number, vy: number, color: string, life: number }[]>([]);

  useEffect(() => {
    initGrid();
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const shooterX = rect.width / 2;
      const shooterY = rect.height - 40;
      
      let angle = Math.atan2(mouseY - shooterY, mouseX - shooterX);
      
      // Keep angle between -PI + 0.1 and -0.1 (pointing upwards)
      if (angle > -0.2) angle = -0.2;
      if (angle < -Math.PI + 0.2) angle = -Math.PI + 0.2;

      shooterAngle.current = angle;
    };

    const handleClick = () => {
      sounds.unlock();
      if (isShooting.current) return;
      shoot();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    const animationId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const initGrid = () => {
    const newGrid: (Bubble | null)[][] = Array.from({ length: GRID_CONFIG.ROWS }, () => 
      Array.from({ length: GRID_CONFIG.COLS }, () => null)
    );

    // Initial 6 rows of bubbles
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
        const { x, y } = getBubblePos(r, c, GRID_CONFIG.BUBBLE_RADIUS);
        newGrid[r][c] = { x, y, color, row: r, col: c };
      }
    }
    grid.current = newGrid;
    if (onNextColorChange) onNextColorChange(nextColor.current);
  };

  const shoot = () => {
    isShooting.current = true;
    sounds.playShoot();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - 40;
    
    const vx = Math.cos(shooterAngle.current) * PHYSICS.SHOOT_SPEED;
    const vy = Math.sin(shooterAngle.current) * PHYSICS.SHOOT_SPEED;

    activeBubble.current = {
      x: shooterX,
      y: shooterY,
      vx,
      vy,
      color: nextColor.current
    };
    
    // Prepare next color
    nextColor.current = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
    if (onNextColorChange) onNextColorChange(nextColor.current);
  };

  const gameLoop = () => {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  };

  const update = () => {
    // Update Particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) particles.current.splice(i, 1);
    }

    if (!activeBubble.current) return;

    const b = activeBubble.current;
    b.x += b.vx;
    b.y += b.vy;

    // Wall bounce
    if (b.x - GRID_CONFIG.BUBBLE_RADIUS < 0 || b.x + GRID_CONFIG.BUBBLE_RADIUS > (canvasRef.current?.width || 0)) {
      b.vx *= -1;
    }

    // Top wall hit
    if (b.y - GRID_CONFIG.BUBBLE_RADIUS < 0) {
      snapToGrid(b);
      return;
    }

    // Check collision with other bubbles
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        const target = grid.current[r][c];
        if (target) {
          const dx = b.x - target.x;
          const dy = b.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < GRID_CONFIG.BUBBLE_RADIUS * 2 * 0.9) {
            snapToGrid(b);
            return;
          }
        }
      }
    }
  };

  const snapToGrid = (b: { x: number, y: number, color: string }) => {
    const { row, col } = getBubbleGridPos(b.x, b.y, GRID_CONFIG.BUBBLE_RADIUS);
    
    if (row >= GRID_CONFIG.ROWS || row < 0 || col < 0 || col >= GRID_CONFIG.COLS) {
        // Fallback for edge cases
        isShooting.current = false;
        activeBubble.current = null;
        return;
    }

    // Ensure we don't overwrite if snap is slightly off
    if (grid.current[row][col]) {
        // Find nearest empty spot? 
        // For now just cancel shooting.
        isShooting.current = false;
        activeBubble.current = null;
        return;
    }

    const { x, y } = getBubblePos(row, col, GRID_CONFIG.BUBBLE_RADIUS);
    grid.current[row][col] = { x, y, color: b.color, row, col };
    
    handlePopping(row, col, b.color);
    
    activeBubble.current = null;
    isShooting.current = false;

    checkGameStates();
  };

  const createPopEffect = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color,
        life: 1.0
      });
    }
  };

  const handlePopping = (row: number, col: number, color: string) => {
    const cluster = findCluster(row, col, grid.current, color);
    
    if (cluster.length >= 3) {
      sounds.playPop();
      cluster.forEach(p => {
        const bubble = grid.current[p.row][p.col];
        if (bubble) createPopEffect(bubble.x, bubble.y, bubble.color);
        grid.current[p.row][p.col] = null;
      });
      
      const points = cluster.length * 10;
      scoreRef.current += points;
      onScoreUpdate(points);

      // Handle floating bubbles
      const floating = findFloatingBubbles(grid.current);
      if (floating.length > 0) {
        sounds.playFall();
        floating.forEach(p => {
          const bubble = grid.current[p.row][p.col];
          if (bubble) createPopEffect(bubble.x, bubble.y, bubble.color);
          grid.current[p.row][p.col] = null;
        });
        const bonus = floating.length * 20;
        scoreRef.current += bonus;
        onScoreUpdate(bonus);
      }
    }
  };

  const checkGameStates = () => {
    // Check Win
    let hasBubbles = false;
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        if (grid.current[r][c]) hasBubbles = true;
      }
    }
    if (!hasBubbles) {
      onWin(scoreRef.current);
      return;
    }

    // Check Loss (any bubble in the last row)
    for (let c = 0; c < GRID_CONFIG.COLS; c++) {
      if (grid.current[GRID_CONFIG.ROWS - 1][c]) {
        onGameOver(scoreRef.current);
        return;
      }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw static board elements
    drawBoard(ctx);

    // Draw Grid
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        const bubble = grid.current[r][c];
        if (bubble) {
          drawBubble(ctx, bubble.x, bubble.y, bubble.color);
        }
      }
    }

    drawParticles(ctx);

    // Draw active bubble
    if (activeBubble.current) {
      const b = activeBubble.current;
      drawBubble(ctx, b.x, b.y, b.color);
    }

    // Draw shooter
    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - 40;
    
    // Guide line
    ctx.beginPath();
    ctx.moveTo(shooterX, shooterY);
    ctx.lineTo(
        shooterX + Math.cos(shooterAngle.current) * 80,
        shooterY + Math.sin(shooterAngle.current) * 80
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawBoard = (ctx: CanvasRenderingContext2D) => {
    // Danger Zone Line
    const dangerY = (GRID_CONFIG.ROWS - 1) * (GRID_CONFIG.BUBBLE_RADIUS * 2 * 0.866) + GRID_CONFIG.BUBBLE_RADIUS;
    ctx.beginPath();
    ctx.moveTo(0, dangerY + GRID_CONFIG.BUBBLE_RADIUS);
    ctx.lineTo(ctx.canvas.width, dangerY + GRID_CONFIG.BUBBLE_RADIUS);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particles.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.life * 5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    
    // Geometric Balance Glow Effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    ctx.beginPath();
    ctx.arc(x, y, GRID_CONFIG.BUBBLE_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Shine effect
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, GRID_CONFIG.BUBBLE_RADIUS / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    
    ctx.restore();
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={GRID_CONFIG.COLS * GRID_CONFIG.BUBBLE_RADIUS * 2 + GRID_CONFIG.BUBBLE_RADIUS}
        height={700}
        className="w-full h-full"
      />
    </div>
  );
};

export default BubbleShooter;
