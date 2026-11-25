import { useEffect, useRef } from "react";
import type { PokemonSpecies } from "./pokemon";
import { drawPokemon } from "./sprites";

interface PokemonSpriteProps {
  species: PokemonSpecies;
  size: number;
  className?: string;
  sparkles?: boolean; // gold specks around legendaries in battle
}

const PokemonSprite = ({ species, size, className, sparkles = false }: PokemonSpriteProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    drawPokemon(ctx, 0, 0, size, species);
    if (sparkles) {
      ctx.fillStyle = "#fef08a";
      for (let i = 0; i < 8; i++) ctx.fillRect((i * 41 + 13) % size, (i * 29 + 7) % size, 2, 2);
    }
  }, [species, size, sparkles]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
      className={className}
    />
  );
};

export default PokemonSprite;
