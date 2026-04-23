/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GRID_CONFIG } from '../constants';

export interface Bubble {
  x: number;
  y: number;
  color: string;
  row: number;
  col: number;
}

export const getBubblePos = (row: number, col: number, radius: number) => {
  const x = col * (radius * 2) + (row % 2 === 1 ? radius : 0) + radius;
  const y = row * (radius * 2 * 0.866) + radius;
  return { x, y };
};

export const getBubbleGridPos = (x: number, y: number, radius: number) => {
  const row = Math.round((y - radius) / (radius * 2 * 0.866));
  const col = Math.round((x - (row % 2 === 1 ? radius : 0) - radius) / (radius * 2));
  return { row, col };
};

export const getNeighbors = (row: number, col: number, rows: number, cols: number) => {
  const neighbors: { row: number; col: number }[] = [];
  
  // Basic neighbors (left, right)
  const directions = [
    [0, -1], [0, 1], // Left, Right
  ];

  // Hex-specific vertical neighbors
  // If row is even (no offset), neighbors are at:
  // (r-1, c-1), (r-1, c), (r+1, c-1), (r+1, c)
  // If row is odd (offset), neighbors are at:
  // (r-1, c), (r-1, c+1), (r+1, c), (r+1, c+1)
  
  if (row % 2 === 0) {
    directions.push([-1, -1], [-1, 0], [1, -1], [1, 0]);
  } else {
    directions.push([-1, 0], [-1, 1], [1, 0], [1, 1]);
  }

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    
    if (nr >= 0 && nr < rows && nc >= 0) {
        // Correct boundary check: even rows have cols, odd rows have cols or cols-1 depending on radius fit
        // For simplicity, we stick to cols for all rows but adjust the visual offset
        if (nc < cols) {
            neighbors.push({ row: nr, col: nc });
        }
    }
  }

  return neighbors;
};

export const findCluster = (
  row: number, 
  col: number, 
  grid: (Bubble | null)[][], 
  targetColor: string
) => {
  const cluster: { row: number; col: number }[] = [];
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [{ row, col }];
  
  visited.add(`${row},${col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    cluster.push(current);

    const neighbors = getNeighbors(current.row, current.col, grid.length, grid[0].length);
    for (const neighbor of neighbors) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(key)) {
        const bubble = grid[neighbor.row][neighbor.col];
        if (bubble && bubble.color === targetColor) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }
  }

  return cluster;
};

export const findFloatingBubbles = (grid: (Bubble | null)[][]) => {
  const rows = grid.length;
  const cols = grid[0].length;
  const anchored = new Set<string>();
  const queue: { row: number; col: number }[] = [];

  // Start with all bubbles in the top row
  for (let c = 0; c < cols; c++) {
    if (grid[0][c]) {
      queue.push({ row: 0, col: c });
      anchored.add(`0,${c}`);
    }
  }

  // BFS to find all bubbles connected to the top
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.row, current.col, rows, cols);
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (!anchored.has(key)) {
        if (grid[neighbor.row][neighbor.col]) {
          anchored.add(key);
          queue.push(neighbor);
        }
      }
    }
  }

  // Any bubble not anchored is floating
  const floating: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] && !anchored.has(`${r},${c}`)) {
        floating.push({ row: r, col: c });
      }
    }
  }

  return floating;
};
