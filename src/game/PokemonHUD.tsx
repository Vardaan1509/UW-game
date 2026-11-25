import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ShieldAlert, X } from "lucide-react";
import type { Pokemon } from "./pokemon";
import PokemonSprite from "./PokemonSprite";

interface PokemonHUDProps {
  team: Pokemon[];
  repelUntil: number | null;
  repels: number;
  onUseRepel: () => void;
  onOpenTrade: () => void;
}

const PokemonHUD = ({ team, repelUntil, repels, onUseRepel, onOpenTrade }: PokemonHUDProps) => {
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const repelActive = repelUntil !== null && now < repelUntil;

  // Tick the countdown only while a repel is running.
  useEffect(() => {
    if (repelUntil === null) return;
    setNow(Date.now());
    const t = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= repelUntil) window.clearInterval(t);
    }, 500);
    return () => window.clearInterval(t);
  }, [repelUntil]);

  const canTrade = team.length > 1;

  return (
    <>
      {repelActive && (
        <div className="absolute top-4 right-4 z-20 bg-emerald-900/90 border-2 border-emerald-400 rounded-lg px-3 py-1.5 backdrop-blur-sm shadow-lg flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-emerald-100 text-xs font-mono font-bold">
            Repel: {Math.ceil((repelUntil! - now) / 1000)}s
          </span>
        </div>
      )}

      <div
        className="absolute right-4 z-10 bg-slate-900/85 border border-slate-700 rounded-lg backdrop-blur-sm shadow-lg overflow-hidden max-w-[280px]"
        style={{ top: repelActive ? 60 : 16 }}
      >
        {team.length === 0 ? (
          <div className="px-3 py-2">
            <p className="text-slate-400 text-xs font-mono">No Pokemon yet</p>
            <p className="text-slate-500 text-[10px]">Talk to Vardaan outside E7</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-slate-200 text-xs font-bold uppercase tracking-wider">
                Team ({team.length})
              </span>
              {open ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {open && (
              <div className="p-2 space-y-1.5">
                {team.map((p) => (
                  <PokemonRow key={p.uid} pokemon={p} />
                ))}
                <button
                  onClick={onOpenTrade}
                  disabled={!canTrade}
                  className="w-full mt-2 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-emerald-100 rounded transition-colors"
                >
                  {canTrade ? "Trade for Repel Spray" : "Need 2+ Pokemon to trade"}
                </button>
              </div>
            )}
          </>
        )}
        {repels > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-700">
            <span className="text-slate-200 text-xs font-mono">
              Repel Spray <span className="text-emerald-300">x{repels}</span>
            </span>
            <button
              onClick={onUseRepel}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
            >
              Use
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const PokemonRow = ({ pokemon }: { pokemon: Pokemon }) => (
  <div
    className={`flex items-center gap-2 rounded px-2 py-1.5 ${
      pokemon.species.isLegendary ? "bg-yellow-500/10 border border-yellow-400/40" : "bg-slate-800/60"
    }`}
  >
    <PokemonSprite species={pokemon.species} size={40} />
    <div className="flex-1 min-w-0">
      <div className="text-slate-100 text-xs font-bold truncate">
        {pokemon.species.isLegendary && "★ "}
        {pokemon.species.name}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-yellow-400 font-mono">Lv {pokemon.level}</span>
        <span className="text-slate-500 uppercase">{pokemon.species.type}</span>
      </div>
    </div>
  </div>
);

interface TradeModalProps {
  team: Pokemon[];
  onCancel: () => void;
  onConfirm: (p: Pokemon) => void;
}

export const TradeModal = ({ team, onCancel, onConfirm }: TradeModalProps) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
    <div className="w-[min(92vw,500px)] bg-slate-900 border-4 border-emerald-500 rounded-lg p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-emerald-300 text-xs uppercase tracking-widest mb-1">Repel Shop</p>
          <h2 className="text-white text-xl font-bold">Trade a Pokemon</h2>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        Trade one Pokemon for a Repel Spray, used straight away. Wild Pokemon stay away for 30
        seconds. You can't trade a legendary.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
        {team.map((p) => {
          const legendary = !!p.species.isLegendary;
          return (
            <button
              key={p.uid}
              onClick={() => onConfirm(p)}
              disabled={legendary}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 bg-slate-800/60 transition-all ${
                legendary
                  ? "border-slate-800 cursor-not-allowed opacity-50"
                  : "border-slate-700 hover:border-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <PokemonSprite species={p.species} size={48} />
              <div className="text-white text-xs font-bold">
                {legendary && "★ "}
                {p.species.name}
              </div>
              <div className="text-yellow-400 text-[10px] font-mono">Lv {p.level}</div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default PokemonHUD;
