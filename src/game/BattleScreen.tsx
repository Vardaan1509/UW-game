import { useEffect, useRef, useState } from "react";
import { MAX_LEVEL, resolveBattle, rollLevelUps, type Pokemon } from "./pokemon";
import { sounds } from "./sounds";
import PokemonSprite from "./PokemonSprite";

interface BattleScreenProps {
  team: Pokemon[];
  opponent: Pokemon;
  trainerName?: string; // set for trainer battles: you win, but don't catch it
  onEnd: (result: "win" | "lose", leveledUpUids: string[]) => void;
}

const MAX_PARTY = 3;
const SPRITE_SIZE = 160;

// Timings of the scripted battle sequence, in ms.
const SEND_OUT_MS = 1000;
const ATTACK_MS = 900;
const EXPLANATION_MS = 1500;
const FAINT_MS = 1200;
const NEXT_UP_MS = 900;
const LEVEL_UP_FIRST_MS = 2000;
const LEVEL_UP_GAP_MS = 1300;
const END_AFTER_WIN_MS = 2400;
const END_AFTER_LOSS_MS = 1800;

const BattleScreen = ({ team, opponent, trainerName, onEnd }: BattleScreenProps) => {
  const [selecting, setSelecting] = useState(team.length > 1);
  const [selected, setSelected] = useState<Pokemon[]>(team.length === 1 ? [team[0]] : []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [message, setMessage] = useState(
    trainerName
      ? `${trainerName} sent out ${opponent.species.name} (Lv ${opponent.level})!`
      : `A wild ${opponent.species.name} (Lv ${opponent.level}) appeared!`
  );
  const [attacking, setAttacking] = useState(false);
  const [opponentDefeated, setOpponentDefeated] = useState(false);
  const [activeFainted, setActiveFainted] = useState(false);

  // Every step of the sequence is a timeout. Track them so none fire after
  // the battle screen closes.
  const timers = useRef<number[]>([]);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    sounds.pokemonCry(opponent.species);
  }, [opponent]);

  const runAttack = (party: Pokemon[], idx: number) => {
    const active = party[idx];
    setActiveIdx(idx);
    setAttacking(true);
    setMessage(`${active.species.name} attacks!`);
    sounds.pokemonCry(active.species);

    after(ATTACK_MS, () => {
      setAttacking(false);
      const { outcome, explanation } = resolveBattle(active, opponent);
      if (explanation) setMessage(explanation);

      after(explanation ? EXPLANATION_MS : 0, () => {
        if (outcome === "win") finishWin(party.slice(0, idx + 1));
        else faint(party, idx);
      });
    });
  };

  const finishWin = (fought: Pokemon[]) => {
    setOpponentDefeated(true);
    setMessage(
      trainerName
        ? `You defeated ${trainerName}'s ${opponent.species.name}!`
        : `You won! ${opponent.species.isLegendary ? "The legendary " : ""}${opponent.species.name} was caught!`
    );
    sounds.victory();
    if (!trainerName) after(700, () => sounds.catchSound());

    const leveled = rollLevelUps(fought);
    leveled.forEach((p, i) =>
      after(LEVEL_UP_FIRST_MS + i * LEVEL_UP_GAP_MS, () => {
        setMessage(`${p.species.name} grew to Lv ${Math.min(MAX_LEVEL, p.level + 1)}!`);
        sounds.levelUp();
      })
    );
    after(END_AFTER_WIN_MS + leveled.length * LEVEL_UP_GAP_MS, () =>
      onEnd("win", leveled.map((p) => p.uid))
    );
  };

  const faint = (party: Pokemon[], idx: number) => {
    setActiveFainted(true);
    setMessage(`${party[idx].species.name} fainted!`);
    sounds.faint();
    after(FAINT_MS, () => {
      setActiveFainted(false);
      const next = idx + 1;
      if (next < party.length) {
        setMessage(`Go, ${party[next].species.name}!`);
        after(NEXT_UP_MS, () => runAttack(party, next));
        return;
      }
      setMessage(trainerName ? `You're out of Pokemon! ${trainerName} wins.` : "You have no more Pokemon! You lost!");
      sounds.defeat();
      after(END_AFTER_LOSS_MS, () => onEnd("lose", []));
    });
  };

  const startFight = (party: Pokemon[]) => {
    setSelecting(false);
    setMessage(`Go, ${party[0].species.name}!`);
    after(SEND_OUT_MS, () => runAttack(party, 0));
  };

  // With a single Pokemon there's nothing to choose, so the fight starts itself.
  useEffect(() => {
    if (team.length === 1) after(800, () => startFight([team[0]]));
  }, []);

  const toggleSelect = (p: Pokemon) => {
    setSelected((prev) =>
      prev.some((s) => s.uid === p.uid)
        ? prev.filter((s) => s.uid !== p.uid)
        : prev.length < MAX_PARTY
          ? [...prev, p]
          : prev
    );
  };

  if (selecting) {
    return (
      <PartySelect
        team={team}
        selected={selected}
        opponent={opponent}
        trainerName={trainerName}
        onToggle={toggleSelect}
        onStart={() => {
          if (selected.length === 0) return;
          sounds.select();
          startFight(selected);
        }}
      />
    );
  }

  const active = selected[activeIdx];
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.2),transparent_60%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_3px)]" />

      <div className="relative w-full max-w-4xl px-8 flex flex-col gap-6">
        <div className="flex justify-end">
          <div className="flex flex-col items-center gap-2">
            <StatBar pokemon={opponent} side="opponent" />
            <PokemonSprite
              species={opponent.species}
              size={SPRITE_SIZE}
              sparkles={!!opponent.species.isLegendary}
              className={`transition-transform duration-150 ${attacking ? "translate-x-2 -translate-y-2" : ""} ${
                opponentDefeated ? "opacity-30 scale-90" : ""
              }`}
            />
          </div>
        </div>

        <div className="flex justify-start items-end gap-4">
          <div className="flex flex-col items-center gap-2">
            <PokemonSprite
              species={active.species}
              size={SPRITE_SIZE}
              className={`transition-all duration-200 ${attacking ? "animate-bounce" : ""} ${
                activeFainted ? "opacity-30 scale-90 rotate-12" : ""
              }`}
            />
            <StatBar pokemon={active} side="yours" />
          </div>
          {selected.length > 1 && (
            <div className="flex flex-col gap-1 mb-6">
              {selected.map((p, i) => (
                <div
                  key={p.uid}
                  className={`px-2 py-0.5 text-xs font-mono rounded ${
                    i === activeIdx
                      ? "bg-blue-600 text-white"
                      : i < activeIdx
                        ? "bg-slate-800 text-slate-500 line-through"
                        : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {i + 1}. {p.species.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 bg-slate-950/90 border-4 border-slate-700 rounded-lg p-5 shadow-2xl backdrop-blur">
          <p className="text-white text-lg font-mono">{message}</p>
        </div>
      </div>
    </div>
  );
};

const StatBar = ({ pokemon, side }: { pokemon: Pokemon; side: "yours" | "opponent" }) => {
  const legendary = !!pokemon.species.isLegendary;
  const border = legendary
    ? "border-yellow-400 shadow-lg shadow-yellow-500/40"
    : side === "yours"
      ? "border-blue-500/50"
      : "border-red-500/50";
  return (
    <div className={`bg-slate-950/90 border-2 rounded-lg px-4 py-2 min-w-[180px] ${border}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-white font-bold text-sm">
          {legendary && "★ "}
          {pokemon.species.name}
        </span>
        <span className={`text-xs uppercase tracking-wider ${legendary ? "text-yellow-300" : "text-slate-400"}`}>
          {pokemon.species.type}
        </span>
      </div>
      <div className="text-yellow-400 text-xs font-mono mt-1">Lv {pokemon.level}</div>
    </div>
  );
};

interface PartySelectProps {
  team: Pokemon[];
  selected: Pokemon[];
  opponent: Pokemon;
  trainerName?: string;
  onToggle: (p: Pokemon) => void;
  onStart: () => void;
}

const PartySelect = ({ team, selected, opponent, trainerName, onToggle, onStart }: PartySelectProps) => (
  <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 animate-in fade-in duration-300 p-6">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.2),transparent_60%)]" />

    <div className="relative w-full max-w-4xl flex flex-col gap-4">
      <div className="text-center">
        <p className="text-yellow-300 text-sm mb-1 uppercase tracking-widest">
          {trainerName ? `${trainerName} wants to battle!` : "Wild Encounter"}
        </p>
        <h2 className="text-white text-2xl font-bold">
          {opponent.species.isLegendary && "★ "}
          {opponent.species.name} <span className="text-yellow-400">Lv {opponent.level}</span>
        </h2>
        <p className="text-slate-400 mt-2 text-sm">
          Choose up to {MAX_PARTY} Pokemon for your battle team. They'll fight in the order picked.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {team.map((p) => {
          const order = selected.findIndex((s) => s.uid === p.uid);
          return (
            <button
              key={p.uid}
              onClick={() => onToggle(p)}
              className={`relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                order !== -1
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
              }`}
            >
              <PokemonSprite species={p.species} size={40} className="shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-white text-xs font-bold truncate">
                  {p.species.isLegendary && "★ "}
                  {p.species.name}
                </div>
                <div className="text-yellow-400 text-[10px] font-mono">Lv {p.level}</div>
              </div>
              {order !== -1 && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-400 text-slate-950 text-xs font-bold flex items-center justify-center">
                  {order + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={onStart}
          disabled={selected.length === 0}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          FIGHT ({selected.length}/{MAX_PARTY})
        </button>
      </div>
    </div>
  </div>
);

export default BattleScreen;
