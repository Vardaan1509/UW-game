import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

export type TouchDir = "up" | "down" | "left" | "right";

interface TouchControlsProps {
  onPress: (dir: TouchDir) => void;
  onRelease: (dir: TouchDir) => void;
  onAction: () => void;
}

const NO_SELECT = { touchAction: "none", WebkitUserSelect: "none", userSelect: "none" } as const;

// On-screen D-pad and A button for touch devices. Holding a direction keeps
// the character walking, the same as holding a key.
const TouchControls = ({ onPress, onRelease, onAction }: TouchControlsProps) => {
  const dirButton = (dir: TouchDir, Icon: typeof ChevronUp) => (
    <button
      aria-label={dir}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onPress(dir);
      }}
      onPointerUp={() => onRelease(dir)}
      onPointerCancel={() => onRelease(dir)}
      onPointerLeave={() => onRelease(dir)}
      className="flex items-center justify-center bg-slate-800/70 active:bg-primary/70 border border-slate-600/60 text-white rounded-xl backdrop-blur-sm transition-colors"
      style={NO_SELECT}
    >
      <Icon className="w-7 h-7" />
    </button>
  );

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[25] pointer-events-none"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-end justify-between px-5 pb-4">
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 pointer-events-auto w-[168px] h-[168px]">
          <div />
          {dirButton("up", ChevronUp)}
          <div />
          {dirButton("left", ChevronLeft)}
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/40" />
          {dirButton("right", ChevronRight)}
          <div />
          {dirButton("down", ChevronDown)}
          <div />
        </div>

        <button
          aria-label="Talk or interact"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            onAction();
          }}
          className="pointer-events-auto flex items-center justify-center w-20 h-20 rounded-full bg-primary/80 active:bg-primary border-2 border-white/30 text-primary-foreground font-bold text-2xl shadow-lg backdrop-blur-sm"
          style={NO_SELECT}
        >
          A
        </button>
      </div>
    </div>
  );
};

export default TouchControls;
