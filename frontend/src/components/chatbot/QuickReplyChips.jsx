import React from 'react';

const QuickReplyChips = ({ chips = [], onSelect }) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/90 border-t border-slate-200/80 max-h-24 overflow-y-auto">
      {chips.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(chip)}
          className="text-xs font-semibold py-1.5 px-3 rounded-full bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 hover:border-brand-400 hover:shadow-xs active:scale-95 transition-all duration-150 shrink-0"
        >
          {chip}
        </button>
      ))}
    </div>
  );
};

export default QuickReplyChips;
