/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Music, 
  Volume2, 
  Zap, 
  RefreshCcw, 
  Trophy,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Point {
  x: number;
  y: number;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  color: string;
}

// --- Constants ---

const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const DUMMY_TRACKS: Track[] = [
  { id: '1', title: 'SYNTH_VOICE_01', artist: 'NULL_POINTER', duration: '03:42', color: '#00f3ff' },
  { id: '2', title: 'CORE_FRAGMENT_02', artist: 'VOID_WALKER', duration: '04:15', color: '#ff00ff' },
  { id: '3', title: 'NEON_DRIFT_03', artist: 'CYBER_GHOST', duration: '02:58', color: '#fff200' },
];

export default function App() {
  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  // Snake State
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [nextDirection, setNextDirection] = useState<Point>({ x: 0, y: -1 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(150);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const currentTrack = DUMMY_TRACKS[currentTrackIndex];

  // --- Music Logic ---

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % DUMMY_TRACKS.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + DUMMY_TRACKS.length) % DUMMY_TRACKS.length);
  };

  // --- Snake Logic ---

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = currentSnake.some(p => p.x === newFood.x && p.y === newFood.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection({ x: 0, y: -1 });
    setNextDirection({ x: 0, y: -1 });
    setScore(0);
    setIsGameOver(false);
    setGameSpeed(150);
    generateFood(INITIAL_SNAKE);
  };

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const newHead = {
        x: (prevSnake[0].x + nextDirection.x + GRID_SIZE) % GRID_SIZE,
        y: (prevSnake[0].y + nextDirection.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check collision with self
      if (prevSnake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        generateFood(newSnake);
        // Speed up slightly
        setGameSpeed(prev => Math.max(70, prev - 2));
      } else {
        newSnake.pop();
      }

      setDirection(nextDirection);
      return newSnake;
    });
  }, [nextDirection, food, highScore, generateFood]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction.y === 0) setNextDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': if (direction.y === 0) setNextDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': if (direction.x === 0) setNextDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': if (direction.x === 0) setNextDirection({ x: 1, y: 0 }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Game Loop
  useEffect(() => {
    const update = (time: number) => {
      if (!isGameOver) {
        if (time - lastUpdateRef.current > gameSpeed) {
          moveSnake();
          lastUpdateRef.current = time;
        }
      }
      gameLoopRef.current = requestAnimationFrame(update);
    };
    gameLoopRef.current = requestAnimationFrame(update);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [moveSnake, isGameOver, gameSpeed]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines (Subtle)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#ff00ff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    ctx.fillRect(food.x * cellSize + 2, food.y * cellSize + 2, cellSize - 4, cellSize - 4);
    
    // Draw Snake
    snake.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#00f3ff' : 'rgba(0, 243, 255, 0.6)';
      ctx.shadowBlur = i === 0 ? 20 : 0;
      ctx.shadowColor = '#00f3ff';
      ctx.fillRect(p.x * cellSize + 1, p.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });

  }, [snake, food]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden select-none">
      {/* Background Glitch Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cyber/1920/1080')] bg-cover opacity-20 contrast-200 grayscale scale-110" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Music Player */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="lg:col-span-4 flex flex-col gap-6"
        >
          <div className="neon-border p-6 bg-void/80 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan/30" />
            
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] tracking-[0.3em] font-bold text-neon-cyan/50 uppercase">Audio_Stream::Initialized</span>
              <Activity className="w-4 h-4 text-neon-cyan animate-pulse" />
            </div>

            <div className="aspect-square relative mb-6 neon-border overflow-hidden bg-black flex items-center justify-center group-hover:neon-border-magenta transition-colors duration-500">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 1.2, rotate: 10 }}
                  className="flex flex-col items-center"
                >
                  <Music className="w-24 h-24 mb-4 text-neon-cyan" style={{ color: currentTrack.color }} />
                  <div className="h-1 w-32 bg-gray-900 overflow-hidden mt-4">
                    <motion.div 
                      className="h-full bg-neon-cyan"
                      animate={{ width: isPlaying ? ['0%', '100%'] : '30%' }}
                      transition={{ duration: isPlaying ? 5 : 0, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* Sound bars animation */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-1 h-8 opacity-40">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-neon-cyan"
                    animate={{ height: isPlaying ? [2, Math.random() * 32, 2] : 2 }}
                    transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5 }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-pixel tracking-tighter mb-1 line-clamp-1 truncate" data-text={currentTrack.title}>
                {currentTrack.title}
              </h1>
              <p className="text-neon-magenta text-sm font-bold tracking-widest opacity-80">{currentTrack.artist}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-8">
              <button 
                onClick={handlePrevTrack}
                className="p-3 neon-border hover:bg-neon-cyan hover:text-black transition-all group"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 py-4 neon-border bg-neon-cyan text-black font-pixel text-lg flex items-center justify-center gap-2 hover:bg-black hover:text-neon-cyan transition-all relative overflow-hidden"
              >
                {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                <span className="relative z-10">{isPlaying ? 'SUSPEND' : 'EXECUTE'}</span>
              </button>

              <button 
                onClick={handleNextTrack}
                className="p-3 neon-border hover:bg-neon-cyan hover:text-black transition-all"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-4">
              <Volume2 className="w-4 h-4 text-neon-cyan/50" />
              <div className="flex-1 h-1 bg-gray-900 relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-neon-cyan" 
                  style={{ width: `${volume}%` }}
                />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-[10px] font-mono text-neon-cyan/50 w-8">{volume}%</span>
            </div>
          </div>

          <div className="neon-border p-4 bg-void/50 text-[10px] space-y-2">
            <p className="flex justify-between"><span>SYS_TIME:</span> <span>{new Date().toLocaleTimeString()}</span></p>
            <p className="flex justify-between"><span>MEM_LOAD:</span> <span className="text-neon-magenta">1024.42MB</span></p>
            <p className="flex justify-between"><span>CPU_SURGE:</span> <span className="animate-pulse text-neon-yellow">CRITICAL</span></p>
          </div>
        </motion.div>

        {/* Center Panel: Snake Game */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:col-span-8 flex flex-col gap-6"
        >
          <div className="neon-border p-2 bg-black relative shadow-[0_0_50px_-12px_rgba(0,243,255,0.3)]">
            <div className="absolute -top-3 left-4 px-2 bg-void text-[10px] font-pixel text-neon-cyan z-20">NEURAL_INTERFACE_V.2.4</div>
            
            <div className="relative aspect-square md:aspect-video lg:aspect-auto lg:h-[600px] w-full bg-void overflow-hidden flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={600}
                className="w-full h-full object-contain"
              />

              <AnimatePresence>
                {isGameOver && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-void/90 backdrop-blur-sm p-8 text-center"
                  >
                    <div className="mb-2 text-glitch-red font-pixel text-6xl md:text-8xl screen-tear tracking-tighter" data-text="TERMINATED">TERMINATED</div>
                    <p className="text-neon-cyan text-sm tracking-[0.5em] mb-12 uppercase font-bold">Signal Lost in Sub-Levels</p>
                    
                    <div className="grid grid-cols-2 gap-8 mb-12 w-full max-w-sm">
                      <div className="neon-border p-4 bg-void">
                        <div className="text-[10px] text-neon-magenta mb-1">SCORE</div>
                        <div className="text-3xl font-pixel">{score}</div>
                      </div>
                      <div className="neon-border p-4 bg-void">
                        <div className="text-[10px] text-neon-magenta mb-1">LOCAL_HIGH</div>
                        <div className="text-3xl font-pixel">{highScore}</div>
                      </div>
                    </div>

                    <button 
                      onClick={resetGame}
                      className="px-12 py-4 neon-border bg-neon-cyan text-black font-pixel text-xl hover:bg-black hover:text-neon-cyan transition-all flex items-center gap-4 group"
                    >
                      <RefreshCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                      REBOOT SYSTEM
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-3 bg-void/80 border-l-2 border-neon-cyan px-3 py-1">
                  <Activity className="w-4 h-4 text-neon-cyan" />
                  <span className="text-[10px] font-bold tracking-widest">FPS: 60.00</span>
                </div>
                <div className="flex items-center gap-3 bg-void/80 border-l-2 border-neon-magenta px-3 py-1">
                  <Zap className="w-4 h-4 text-neon-magenta" />
                  <span className="text-[10px] font-bold tracking-widest">SPEED: {(200 - gameSpeed).toFixed(0)}MS</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none">
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-neon-cyan/50 font-bold uppercase">Points_Acquired</p>
                    <p className="text-4xl font-pixel text-neon-cyan">{score.toString().padStart(5, '0')}</p>
                  </div>
                  <div className="p-3 neon-border bg-void">
                    <Trophy className="w-6 h-6 text-neon-yellow" title="High Score" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-2 p-2 flex items-center justify-between text-[10px] text-neon-cyan/40 font-mono tracking-widest uppercase">
              <div className="flex gap-4">
                <span>COORD_X: {snake[0]?.x}</span>
                <span>COORD_Y: {snake[0]?.y}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>[W][A][S][D] TO NAVIGATE</span>
                <div className="flex gap-1">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-neon-cyan shadow-[0_0_5px_#00f3ff]' : 'bg-gray-800'}`} />
                  <div className="w-2 h-2 rounded-full bg-neon-magenta shadow-[0_0_5px_#ff00ff]" />
                  <div className="w-2 h-2 rounded-full bg-neon-yellow" />
                </div>
              </div>
            </div>
          </div>

          {/* Visualizer / Extra Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neon-border p-4 bg-void/40 h-24 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20">
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-neon-magenta"
                    animate={{ height: isPlaying ? [4, 60, 4] : 10 }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.05 }}
                  />
                ))}
              </div>
              <span className="relative z-10 text-[10px] font-pixel tracking-widest text-neon-magenta">SPECTRAL_ANALYSIS_ACTIVE</span>
            </div>
            
            <div className="neon-border p-4 bg-void/40 h-24 flex flex-col justify-center gap-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span>SYSTEM_INTEGRITY</span>
                <span className={isGameOver ? 'text-glitch-red' : 'text-neon-cyan'}>{isGameOver ? '0%' : '98.5%'}</span>
              </div>
              <div className="h-1 w-full bg-gray-900 relative">
                <motion.div 
                  className={`h-full ${isGameOver ? 'bg-glitch-red' : 'bg-neon-cyan'}`}
                  initial={{ width: '98.5%' }}
                  animate={{ width: isGameOver ? '0%' : '98.5%' }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold opacity-40 mt-1">
                <span>THREAT_LEVEL</span>
                <span>{score > 100 ? 'OMEGA' : 'EPSILON'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Retro Footer */}
      <div className="fixed bottom-4 left-4 text-[10px] font-mono opacity-20 hover:opacity-100 transition-opacity">
        <p>© 20XX NEURAL_LINK_TECH INDUSTRIES // UNIFIED_OS</p>
      </div>
      
      {/* Visual Glitch Overlays */}
      <div className="fixed top-0 left-0 w-full h-[1px] bg-white/20 animate-[noise_2s_infinite] pointer-events-none opacity-20" />
      <div className="fixed bottom-20 left-0 w-full h-[2px] bg-neon-cyan/10 animate-[noise_5s_infinite] pointer-events-none opacity-20" />
    </div>
  );
}
