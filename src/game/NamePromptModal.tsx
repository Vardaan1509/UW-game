import { useEffect, useRef, useState } from "react";

const MAX_NAME_LENGTH = 16;

interface NamePromptModalProps {
  eyebrow: string;
  title: string;
  footer: string;
  buttonLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
}

const NamePromptModal = ({
  eyebrow,
  title,
  footer,
  buttonLabel,
  initialValue = "",
  onSubmit,
}: NamePromptModalProps) => {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = name.trim();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-[min(92vw,420px)] bg-slate-900 border-4 border-yellow-400 rounded-lg p-6 shadow-2xl">
        <div className="text-center mb-4">
          <p className="text-yellow-300 text-xs uppercase tracking-widest mb-1">{eyebrow}</p>
          <h2 className="text-white text-xl font-bold">{title}</h2>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Enter your name"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          className="w-full bg-slate-950 border-2 border-slate-700 focus:border-yellow-400 outline-none rounded px-3 py-2 text-white font-mono text-center"
        />
        <div className="flex justify-center mt-4">
          <button
            onClick={submit}
            disabled={!trimmed}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold rounded transition-colors"
          >
            {buttonLabel}
          </button>
        </div>
        <p className="text-slate-500 text-xs text-center mt-3">{footer}</p>
      </div>
    </div>
  );
};

export default NamePromptModal;
