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

function getDirection(from, to) {
  return { x: from.x - to.x, y: from.y - to.y };
}

export default function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const [food, setFood] = useState(randomFoodPosition(INITIAL_SNAKE));
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const speed = useMemo(() => Math.max(MIN_SPEED, BASE_SPEED - score * 5), [score]);

  const changeDirection = useCallback((newDir) => {
    const current = nextDirectionRef.current;
    const isOpposite = current.x === -newDir.x && current.y === -newDir.y;
    if (isOpposite) return;
    nextDirectionRef.current = newDir;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") changeDirection({ x: 0, y: -1 });
      if (e.key === "ArrowDown") changeDirection({ x: 0, y: 1 });
      if (e.key === "ArrowLeft") changeDirection({ x: -1, y: 0 });
      if (e.key === "ArrowRight") changeDirection({ x: 1, y: 0 });

      if (e.key === " ") {
        if (isGameOver) {
          setSnake(INITIAL_SNAKE);
          setDirection(INITIAL_DIRECTION);
          nextDirectionRef.current = INITIAL_DIRECTION;
          setFood(randomFoodPosition(INITIAL_SNAKE));
          setIsGameOver(false);
          setScore(0);
          setIsRunning(true);
          return;
        }

        setIsRunning((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, isGameOver]);

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
          return currentSnake;
        }

        const ateFood = newHead.x === food.x && newHead.y === food.y;
        const nextSnake = [newHead, ...currentSnake];

        if (ateFood) {
          setScore((s) => s + 1);
          setFood(randomFoodPosition(nextSnake));
          return nextSnake;
        }

        nextSnake.pop();
        return nextSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [food, isGameOver, isRunning, speed]);

  const getCellType = (x, y) => {
    if (snake.some((s) => s.x === x && s.y === y)) return "snake";
    if (food.x === x && food.y === y) return food.type;
    return "empty";
  };

  return (
    <div className="min-h-screen bg-[#7EA3CC] flex items-center justify-center">
      <div
        className="grid"
        style={{
          width: 620,
          height: 620,
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          backgroundImage: `url(${ASSET_BASE}game-bg.png)`,
          backgroundSize: "cover",
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const type = getCellType(x, y);

          if (type === "snake") {
            return (
              <div key={i} className="flex items-center justify-center">
                <img src={`${ASSET_BASE}snake-body-seamless.png`} />
              </div>
            );
          }

          if (type === "bone") {
            return (
              <motion.div
                key={i}
                className="relative flex items-center justify-center"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="absolute w-12 h-12 rounded-full bg-white/30 blur-md"
                />
                <img
                  src={`${ASSET_BASE}bone.png`}
                  className="w-[145%] h-[145%] object-contain"
                />
                <motion.div
                  className="absolute text-xs"
                  animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ✨
                </motion.div>
              </motion.div>
            );
          }

          if (type === "bowl") {
            return (
              <motion.div
                key={i}
                className="relative flex items-center justify-center"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.9, repeat: Infinity }}
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.2, 0.3, 0.2] }}
                  transition={{ duration: 1.9, repeat: Infinity }}
                  className="absolute w-12 h-12 rounded-full bg-white/25 blur-md"
                />
                <img
                  src={`${ASSET_BASE}food-bowl.png`}
                  className="w-[142%] h-[142%] object-contain"
                />
                <motion.div
                  className="absolute text-xs"
                  animate={{ y: [0, -3, 0], opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  ✨
                </motion.div>
              </motion.div>
            );
          }

          return <div key={i} />;
        })}
      </div>
    </div>
  );
}
