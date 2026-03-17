import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

const GRID_SIZE = 18;
const ASSET_BASE = import.meta.env.BASE_URL;

const INITIAL_SNAKE = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const BASE_SPEED = 150;
const MIN_SPEED = 68;

function getHeadSprite(dir) {
  if (!dir) return `${ASSET_BASE}snake-head-right.png`;
  if (dir.x === 1 && dir.y === 0) return `${ASSET_BASE}snake-head-right.png`;
  if (dir.x === -1 && dir.y === 0) return `${ASSET_BASE}snake-head-left.png`;
  if (dir.x === 0 && dir.y === -1) return `${ASSET_BASE}snake-head-up.png`;
  if (dir.x === 0 && dir.y === 1) return `${ASSET_BASE}snake-head-down.png`;
  return `${ASSET_BASE}snake-head-right.png`;
}

function randomFoodPosition(snake) {
  while (true) {
    const food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
      type: Math.random() > 0.5 ? "bone" : "bowl",
    };

    const overlapsSnake = snake.some(
      (segment) => segment.x === food.x && segment.y === food.y
    );

    if (!overlapsSnake) return food;
  }
}

function IconButton({ children, onClick, className = "", title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[20px] border px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, valueClass = "text-[#6da8c4]" }) {
  return (
    <div className="rounded-[24px] border border-sky-100 bg-white/90 p-4 shadow-sm">
      <div className="text-xs tracking-[0.2em] text-sky-300 lowercase">{label} ✨</div>
      <div className={`mt-1 text-3xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function FloatingCloud({ className = "", delay = 0 }) {
  return (
    <motion.div
      animate={{ x: [0, 8, 0], y: [0, -3, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute h-8 w-16 rounded-full bg-white/70 blur-[1px] ${className}`}
    >
      <div className="absolute -left-1 bottom-0 h-7 w-7 rounded-full bg-white/85" />
      <div className="absolute left-4 -top-2 h-8 w-8 rounded-full bg-white/85" />
      <div className="absolute right-2 top-0 h-6 w-6 rounded-full bg-white/85" />
    </motion.div>
  );
}

function directionToAngle(dir) {
  if (!dir) return 0;
  if (dir.x === 1 && dir.y === 0) return 0;
  if (dir.x === 0 && dir.y === 1) return 90;
  if (dir.x === -1 && dir.y === 0) return 180;
  if (dir.x === 0 && dir.y === -1) return -90;
  return 0;
}

function getDirection(from, to) {
  return { x: from.x - to.x, y: from.y - to.y };
}

function getTailAngle(snake) {
  if (snake.length < 2) return directionToAngle({ x: -1, y: 0 });
  const last = snake[snake.length - 1];
  const beforeLast = snake[snake.length - 2];
  return directionToAngle(getDirection(last, beforeLast));
}

function getBodyAngle(prev, next) {
  if (!prev || !next) return 0;
  if (prev.x === next.x) return 90;
  return 0;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const [food, setFood] = useState(randomFoodPosition(INITIAL_SNAKE));
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [pawPrints, setPawPrints] = useState([]);
  const [eatBursts, setEatBursts] = useState([]);
  const [chomping, setChomping] = useState(false);
  const [justAte, setJustAte] = useState(false);
  const [isMobilePlaying, setIsMobilePlaying] = useState(false);

  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const boardRef = useRef(null);
  const musicRef = useRef(null);
  const barkRef = useRef(null);

  const enterFullscreenIfMobile = useCallback(() => {
    if (!isMobileDevice()) return;
    const el = boardRef.current;
    if (!el) return;
    if (document.fullscreenElement) return;

    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const enableMusicIfAllowed = useCallback(() => {
    if (!musicEnabled) return;
    const music = musicRef.current;
    if (!music) return;

    music.volume = musicVolume;
    music.play().catch(() => {});
  }, [musicEnabled, musicVolume]);

  const playBarkSound = useCallback(() => {
    if (!soundEnabled) return;
    const bark = barkRef.current;
    if (!bark) return;

    try {
      bark.pause();
      bark.currentTime = 0;
      bark.volume = 0.95;
      bark.play().catch(() => {});
    } catch {
      // ignore sound errors
    }
  }, [soundEnabled]);

  const startFreshGame = useCallback((newDir = INITIAL_DIRECTION) => {
    const freshSnake = INITIAL_SNAKE;
    setSnake(freshSnake);
    setDirection(newDir);
    nextDirectionRef.current = newDir;
    setFood(randomFoodPosition(freshSnake));
    setIsGameOver(false);
    setScore(0);
    setPawPrints([]);
    setEatBursts([]);
    setJustAte(false);
    setChomping(false);
    setIsRunning(true);

    if (isMobileDevice()) {
      setIsMobilePlaying(true);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("pom-pom-snake-high-score");
    if (saved) setHighScore(Number(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pom-pom-snake-high-score", String(highScore));
  }, [highScore]);

  useEffect(() => {
    if (!isMobilePlaying) return;
    if (!boardRef.current) return;

    boardRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isMobilePlaying]);

  useEffect(() => {
    if (!isMobileDevice()) return;

    const originalOverflow = document.body.style.overflow;

    if (isMobilePlaying) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobilePlaying]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    music.volume = musicVolume;

    if (musicEnabled) {
      music.play().catch(() => {});
    } else {
      music.pause();
    }
  }, [musicEnabled, musicVolume]);

  const createPawPrint = useCallback((segment) => {
    const id = `${Date.now()}-${Math.random()}`;
    setPawPrints((prev) => [...prev.slice(-10), { id, x: segment.x, y: segment.y }]);
    window.setTimeout(() => {
      setPawPrints((prev) => prev.filter((print) => print.id !== id));
    }, 850);
  }, []);

  const createEatBurst = useCallback((foodItem) => {
    const id = `${Date.now()}-${Math.random()}`;
    setEatBursts((prev) => [...prev, { id, x: foodItem.x, y: foodItem.y }]);
    setJustAte(true);
    setChomping(true);
    window.setTimeout(() => {
      setEatBursts((prev) => prev.filter((burst) => burst.id !== id));
    }, 900);
    window.setTimeout(() => setJustAte(false), 420);
    window.setTimeout(() => setChomping(false), 260);
  }, []);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    nextDirectionRef.current = INITIAL_DIRECTION;
    setFood(randomFoodPosition(INITIAL_SNAKE));
    setIsGameOver(false);
    setScore(0);
    setIsRunning(false);
    setPawPrints([]);
    setEatBursts([]);
    setJustAte(false);
    setChomping(false);
    setIsMobilePlaying(false);
  }, []);

  const speed = useMemo(() => Math.max(MIN_SPEED, BASE_SPEED - score * 5), [score]);

  const changeDirection = useCallback((newDir) => {
    const current = nextDirectionRef.current;
    const isOpposite = current.x === -newDir.x && current.y === -newDir.y;
    if (isOpposite) return;
    nextDirectionRef.current = newDir;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "ArrowUp") changeDirection({ x: 0, y: -1 });
      if (e.key === "ArrowDown") changeDirection({ x: 0, y: 1 });
      if (e.key === "ArrowLeft") changeDirection({ x: -1, y: 0 });
      if (e.key === "ArrowRight") changeDirection({ x: 1, y: 0 });

      if (e.key === " ") {
        enableMusicIfAllowed();

        if (isGameOver) {
          startFreshGame(nextDirectionRef.current || INITIAL_DIRECTION);
          return;
        }

        if (!isRunning) {
          setIsRunning(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, enableMusicIfAllowed, isGameOver, isRunning, startFreshGame]);

  useEffect(() => {
    if (!isRunning || isGameOver) return;

    const interval = setInterval(() => {
      setSnake((currentSnake) => {
        const newDirection = nextDirectionRef.current;
        setDirection(newDirection);

        const head = currentSnake[0];
        const newHead = {
          x: head.x + newDirection.x,
          y: head.y + newDirection.y,
        };

        const hitWall =
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE;

        const hitSelf = currentSnake.some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y
        );

        if (hitWall || hitSelf) {
          setIsGameOver(true);
          setIsRunning(false);
          setHighScore((prev) => Math.max(prev, score));

          if (isMobileDevice()) {
            setIsMobilePlaying(true);
          }

          return currentSnake;
        }

        const ateFood = newHead.x === food.x && newHead.y === food.y;
        createPawPrint(head);
        const nextSnake = [newHead, ...currentSnake];

        if (ateFood) {
          const nextScore = score + 1;
          setScore(nextScore);
          setHighScore((prev) => Math.max(prev, nextScore));
          createEatBurst(food);
          playBarkSound();
          setFood(randomFoodPosition(nextSnake));
          return nextSnake;
        }

        nextSnake.pop();
        return nextSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [createEatBurst, createPawPrint, food, isGameOver, isRunning, playBarkSound, score, speed]);

  const snakeMap = useMemo(() => {
    const map = new Map();
    snake.forEach((segment, index) => {
      map.set(`${segment.x}-${segment.y}`, index === 0 ? "head" : index % 2 === 0 ? "bodyA" : "bodyB");
    });
    return map;
  }, [snake]);

  const getCellType = (x, y) => {
    const snakeType = snakeMap.get(`${x}-${y}`);
    if (snakeType) return snakeType;

    const isFood = food.x === x && food.y === y;
    if (isFood) return food.type === "bone" ? "bone" : "bowl";

    return "empty";
  };

  const headSprite = useMemo(() => {
    if (snake.length < 2) return getHeadSprite(INITIAL_DIRECTION);
    const dir = getDirection(snake[0], snake[1]);
    return getHeadSprite(dir);
  }, [snake]);

  const tailAngle = useMemo(() => getTailAngle(snake), [snake]);

  const handleSwipeStart = (e) => {
    enableMusicIfAllowed();
    enterFullscreenIfMobile();
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleSwipeEnd = (e) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 24;

    if (Math.max(absX, absY) < threshold) return;

    let newDir;
    if (absX > absY) {
      newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }

    if (isGameOver || !isRunning) {
      startFreshGame(newDir);
      return;
    }

    changeDirection(newDir);
  };

  const bounceBody = justAte ? { scale: [1, 1.08, 1] } : { scale: [1, 1.015, 1] };

  const itemSpring = {
    type: "spring",
    stiffness: 220,
    damping: 18,
    mass: 0.8,
  };

  return (
    <div className="min-h-screen bg-[#7EA3CC] p-3 text-zinc-800 sm:p-6">
      <audio ref={musicRef} loop preload="auto">
        <source src={`${ASSET_BASE}bg-music.mp3`} type="audio/mpeg" />
      </audio>

      <audio ref={barkRef} preload="auto">
        <source src={`${ASSET_BASE}bark.mp3`} type="audio/mpeg" />
      </audio>

      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[380px_1fr] lg:gap-6">
        <div
          className={`overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_20px_80px_rgba(160,210,255,0.35)] backdrop-blur ${
            isMobilePlaying ? "hidden lg:block" : ""
          }`}
        >
          <div className="h-3 bg-[linear-gradient(90deg,#cdeeff,#d9f3ff,#e8f8ff,#dff4ff)]" />
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#6da8c4] lowercase whitespace-pre-line">
                  ~tobi chomps  (◕‿◕✿)
                </h1>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-white/90 shadow-sm">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white">
                  <img
                    src={`${ASSET_BASE}snake-head-down.png`}
                    alt="tobi"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute -right-0.5 -top-0.5 text-sm">✨</div>
                  <div className="absolute left-0 bottom-0 text-xs">💗</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Score" value={score} valueClass="text-[#6da8c4]" />
              <StatCard label="Best" value={highScore} valueClass="text-blue-500" />
            </div>

            <div className="flex flex-wrap gap-3">
              <IconButton
                onClick={() => {
                  enableMusicIfAllowed();
                  enterFullscreenIfMobile();

                  if (isGameOver) {
                    startFreshGame(nextDirectionRef.current || INITIAL_DIRECTION);
                    return;
                  }

                  setIsRunning((prev) => {
                    const next = !prev;
                    if (isMobileDevice()) {
                      setIsMobilePlaying(next);
                    }
                    return next;
                  });
                }}
                className="border-sky-400 bg-[#bbe0f2] text-white shadow-md hover:bg-[#a9d6ea]"
                title="start or pause"
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isRunning ? "pause 💗" : "start ✨"}
              </IconButton>

              <IconButton
                onClick={resetGame}
                className="border-sky-200 bg-white text-[#6da8c4] shadow-sm hover:bg-sky-50"
                title="Reset game"
              >
                <RotateCcw className="h-4 w-4" />
                reset 💗
              </IconButton>

              <IconButton
                onClick={() => {
                  setMusicEnabled((prev) => !prev);
                }}
                className="border-sky-200 bg-white text-[#6da8c4] shadow-sm hover:bg-sky-50"
                title="Toggle music"
              >
                {musicEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {musicEnabled ? "music on" : "music off"}
              </IconButton>

              <IconButton
                onClick={() => {
                  setSoundEnabled((prev) => !prev);
                }}
                className="border-sky-200 bg-white text-[#6da8c4] shadow-sm hover:bg-sky-50"
                title="Toggle bark sound"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {soundEnabled ? "bark on" : "bark off"}
              </IconButton>
            </div>

            <div className="rounded-[24px] border border-sky-100 bg-white/90 p-4 shadow-sm">
              <div className="mb-2 text-xs tracking-[0.2em] text-sky-300 lowercase">music volume ✨</div>
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 text-sky-300" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => {
                    const nextVolume = Number(e.target.value) / 100;
                    setMusicVolume(nextVolume);
                  }}
                  className="w-full accent-[#6da8c4]"
                />
                <Volume2 className="h-4 w-4 text-[#6da8c4]" />
              </div>
              <div className="mt-2 text-sm text-zinc-500 lowercase">
                {Math.round(musicVolume * 100)}%
              </div>
            </div>

            <div className="rounded-[24px] border border-sky-100 bg-white/90 p-4 shadow-sm text-sm text-zinc-600">
              <div className="mb-2 font-medium text-[#6da8c4] lowercase">goal 💗</div>
              <p className="lowercase">
                help tobi grow extra fluffy by eating bones and dog food. avoid bumping into the walls or yourself! ✨💗
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_20px_80px_rgba(160,210,255,0.25)] backdrop-blur">
            <div className="p-2 sm:p-6">
              <div
                ref={boardRef}
                className={`relative mx-auto w-full select-none overflow-hidden border-[4px] border-white bg-[#BEBEBE] shadow-[inset_0_0_0_1px_rgba(180,220,255,0.55),0_20px_40px_rgba(255,255,255,0.25)] touch-none ${
                  isMobilePlaying
                    ? "h-[100svh] rounded-none border-x-0 border-y-0 p-2"
                    : "h-[82svh] rounded-[34px] p-3 sm:aspect-square sm:h-auto sm:max-w-[640px] sm:rounded-[42px] sm:p-5"
                }`}
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.32, 0.22] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-sky-200/30 blur-2xl"
                />
                <div className="absolute left-6 top-6 h-16 w-28 rounded-full bg-white/60 blur-[1px]" />
                <div className="absolute left-12 top-3 h-10 w-10 rounded-full bg-white/70" />
                <div className="absolute left-24 top-8 h-12 w-12 rounded-full bg-white/70" />
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.28, 0.18] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-blue-200/30 blur-2xl"
                />
                <div className="absolute right-8 bottom-7 h-14 w-24 rounded-full bg-white/45 blur-[1px]" />
                <div className="absolute right-4 bottom-2 h-10 w-10 rounded-full bg-white/55" />
                <div className="absolute right-20 bottom-0 h-12 w-12 rounded-full bg-white/55" />
                <FloatingCloud className="left-10 top-12" delay={0.2} />
                <FloatingCloud className="right-12 top-24 scale-75" delay={1.1} />

                <div className="pointer-events-none absolute inset-0 z-10">
                  {pawPrints.map((print, index) => (
                    <motion.div
                      key={print.id}
                      initial={{ opacity: 0.65, scale: 0.7 }}
                      animate={{ opacity: 0, scale: 1.05, y: -4 }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.01 }}
                      className="absolute flex items-center justify-center text-sky-300/70"
                      style={{
                        width: `calc(100% / ${GRID_SIZE})`,
                        height: `calc(100% / ${GRID_SIZE})`,
                        left: `calc(${print.x} * (100% / ${GRID_SIZE}))`,
                        top: `calc(${print.y} * (100% / ${GRID_SIZE}))`,
                      }}
                    >
                      <span className="text-sm">🐾</span>
                    </motion.div>
                  ))}

                  {eatBursts.map((burst) => (
                    <React.Fragment key={burst.id}>
                      <motion.div
                        initial={{ opacity: 0.95, scale: 0.7 }}
                        animate={{ opacity: 0, scale: 1.7, y: -14 }}
                        transition={{ duration: 0.85, ease: "easeOut" }}
                        className="absolute flex items-center justify-center"
                        style={{
                          width: `calc(100% / ${GRID_SIZE})`,
                          height: `calc(100% / ${GRID_SIZE})`,
                          left: `calc(${burst.x} * (100% / ${GRID_SIZE}))`,
                          top: `calc(${burst.y} * (100% / ${GRID_SIZE}))`,
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0.95, scale: 0.7 }}
                        animate={{ opacity: 0, scale: 1.3, x: -12, y: -10, rotate: -15 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                        className="absolute flex items-center justify-center"
                        style={{
                          width: `calc(100% / ${GRID_SIZE})`,
                          height: `calc(100% / ${GRID_SIZE})`,
                          left: `calc(${burst.x} * (100% / ${GRID_SIZE}))`,
                          top: `calc(${burst.y} * (100% / ${GRID_SIZE}))`,
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0.95, scale: 0.7 }}
                        animate={{ opacity: 0, scale: 1.3, x: 12, y: -10, rotate: 15 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                        className="absolute flex items-center justify-center"
                        style={{
                          width: `calc(100% / ${GRID_SIZE})`,
                          height: `calc(100% / ${GRID_SIZE})`,
                          left: `calc(${burst.x} * (100% / ${GRID_SIZE}))`,
                          top: `calc(${burst.y} * (100% / ${GRID_SIZE}))`,
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>

                <div
                  className="relative grid h-full w-full gap-0"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                    const x = index % GRID_SIZE;
                    const y = Math.floor(index / GRID_SIZE);
                    const type = getCellType(x, y);
                    const snakeIndex = snake.findIndex((segment) => segment.x === x && segment.y === y);

                    if (type === "head") {
                      return (
                        <motion.div
                          key={index}
                          layout
                          transition={itemSpring}
                          initial={{ scale: 0.88, opacity: 0.8 }}
                          animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                          className="relative z-20 overflow-visible"
                        >
                          <motion.div
                            animate={chomping ? { y: [0, -1, 0], scale: [1, 0.92, 1.05, 1] } : { y: [0, -1.5, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ transformOrigin: "center center" }}
                          >
                            <img
                              src={headSprite}
                              alt="tobi"
                              className="object-contain drop-shadow-[0_2px_4px_rgba(255,255,255,0.35)]"
                              style={{
                                width: "100%",
                                height: "100%",
                              }}
                            />
                          </motion.div>
                        </motion.div>
                      );
                    }

                    if (type === "bodyA" || type === "bodyB") {
                      const isTail = snakeIndex === snake.length - 1;
                      const prevSegment = snake[snakeIndex - 1];
                      const nextSegment = snake[snakeIndex + 1];
                      const bodyAngle = getBodyAngle(prevSegment, nextSegment);

                      if (isTail) {
                        return (
                          <motion.div
                            key={index}
                            layout
                            transition={itemSpring}
                            className="flex items-center justify-center overflow-visible"
                          >
                            <motion.img
                              src={`${ASSET_BASE}snake-tail.png`}
                              alt="tail"
                              className="object-contain"
                              style={{
                                width: "100%",
                                height: "100%",
                              }}
                              animate={{ rotate: [`${tailAngle - 4}deg`, `${tailAngle + 4}deg`, `${tailAngle - 4}deg`] }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={index}
                          layout
                          transition={itemSpring}
                          className="flex items-center justify-center overflow-visible"
                        >
                          <motion.img
                            src={`${ASSET_BASE}snake-body-seamless.png`}
                            alt="body"
                            className="object-contain"
                            style={{
                              width: "100%",
                              height: "100%",
                              rotate: `${bodyAngle}deg`,
                              transformOrigin: "center center",
                            }}
                            animate={bounceBody}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: snakeIndex * 0.02 }}
                          />
                        </motion.div>
                      );
                    }

                    if (type === "bone") {
                      return (
                        <motion.div
                          key={index}
                          layout
                          transition={itemSpring}
                          initial={{ scale: 0.75, opacity: 0 }}
                          animate={{ scale: [0.96, 1.06, 0.96], opacity: 1 }}
                          className="flex items-center justify-center"
                        >
                          <img
                            src={`${ASSET_BASE}bone.png`}
                            alt="bone"
                            className="h-[102%] w-[102%] object-contain"
                          />
                        </motion.div>
                      );
                    }

                    if (type === "bowl") {
                      return (
                        <motion.div
                          key={index}
                          layout
                          transition={itemSpring}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center justify-center"
                        >
                          <img
                            src={`${ASSET_BASE}food-bowl.png`}
                            alt="food"
                            className="h-[102%] w-[102%] object-contain"
                          />
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={index}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="bg-transparent"
                      />
                    );
                  })}
                </div>
              </div>

              <div
                className={`mt-4 min-h-7 px-2 text-center text-sm text-zinc-500 ${
                  isMobilePlaying && isRunning ? "hidden sm:block" : ""
                }`}
              >
                {isGameOver ? (
                  <span className="font-medium text-red-400 lowercase">
                    (• ε •) tobi bumped into something! swipe or press space to try again. 💗
                  </span>
                ) : isRunning ? (
                  <span className="lowercase">
                    tobi is zooming ✨ it gets a little faster every time you collect a treat 💗
                  </span>
                ) : (
                  <span className="lowercase">press start, swipe, or hit space for a cute little chaos run ✨💗</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
