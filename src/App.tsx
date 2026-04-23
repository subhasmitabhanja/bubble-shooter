/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, AlertCircle } from 'lucide-react';
import BubbleShooter from './components/BubbleShooter';
import { sounds } from './utils/soundEffects';

type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'WIN';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [nextColor, setNextColor] = useState('#3b82f6');

  const startGame = () => {
    sounds.unlock();
    setScore(0);
    setGameState('PLAYING');
  };

  const onGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('GAMEOVER');
  }, []);

  const onWin = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('WIN');
  }, []);

  const onScoreUpdate = useCallback((points: number) => {
    setScore(prev => prev + points);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex items-center justify-center overflow-hidden">
      <div className="relative w-full max-w-5xl aspect-video bg-slate-800 border-4 border-slate-700 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* UI Layer (HUD) */}
        <div className="absolute inset-0 p-10 pointer-events-none z-10 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="stat-box">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Score</div>
              <div className="text-4xl font-mono font-bold">{score.toString().padStart(4, '0')}</div>
            </div>
            <div className="stat-box">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Level</div>
              <div className="text-4xl font-bold text-blue-400">01</div>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="stat-box">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Next Bubble</div>
              <div className="flex items-center justify-center h-12">
                <div className="w-8 h-8 rounded-full shadow-lg transition-colors duration-300" style={{ backgroundColor: nextColor }}></div>
              </div>
            </div>
            <div className="stat-box">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Goal</div>
              <p className="text-xs italic text-slate-300">Clear all bubbles to advance.</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-slate-900/95 backdrop-blur-sm"
            >
              <motion.div 
                className="mb-12 text-center"
              >
                <h1 className="text-8xl font-black tracking-tighter leading-none mb-4">
                  BUBBLE<br/>
                  <span className="text-blue-500">SHOOTER</span>
                </h1>
                <p className="text-slate-400 text-lg">Match 3 or more colors to pop bubbles.</p>
              </motion.div>
              
              <button
                id="play-button"
                onClick={startGame}
                className="btn-geometric"
              >
                Play Game
              </button>
            </motion.div>
          )}

          {gameState === 'PLAYING' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center"
            >
              <BubbleShooter 
                onGameOver={onGameOver}
                onWin={onWin}
                onScoreUpdate={onScoreUpdate}
                onNextColorChange={setNextColor}
              />
            </motion.div>
          )}

          {(gameState === 'GAMEOVER' || gameState === 'WIN') && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-slate-900/95 backdrop-blur-md"
            >
              <div className="text-center max-w-lg w-full">
                <h2 className="text-7xl font-black mb-8 tracking-tighter">
                  {gameState === 'WIN' ? (
                    <>YOU<br/><span className="text-green-500">WIN!</span></>
                  ) : (
                    <>GAME<br/><span className="text-red-500">OVER</span></>
                  )}
                </h2>
                
                <p className="text-slate-400 text-lg mb-2 uppercase tracking-[0.2em] font-bold">Total Score</p>
                <div className="text-6xl font-mono font-black text-white mb-16">{score.toString().padStart(4, '0')}</div>

                <button
                  id="restart-button"
                  onClick={startGame}
                  className="btn-geometric"
                >
                  Restart
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
