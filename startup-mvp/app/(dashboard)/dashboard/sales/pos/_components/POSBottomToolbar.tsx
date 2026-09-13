"use client";

import React from "react";
import {
  FaUndoAlt,
  FaExchangeAlt,
  FaMoneyBillWave,
  FaHandPaper,
  FaSync,
  FaPrint,
} from "react-icons/fa";

export interface POSBottomToolbarProps {
  onReturnClick: () => void;
  isExchangeMode: boolean;
  onExchangeClick: () => void;
  onCollectDueClick: () => void;
  cartLength: number;
  heldCartsCount: number;
  onHoldClick: () => void;
  onRefreshClick: () => void;
  isLastBillDisabled: boolean;
  onLastBillClick: () => void;
  allowDueSale?: boolean;
  className?: string;
}

export default function POSBottomToolbar({
  onReturnClick,
  isExchangeMode,
  onExchangeClick,
  onCollectDueClick,
  cartLength,
  heldCartsCount,
  onHoldClick,
  onRefreshClick,
  isLastBillDisabled,
  onLastBillClick,
  allowDueSale = true,
  className = "",
}: POSBottomToolbarProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Return Button */}
      <button
        type="button"
        className="flex items-center justify-center gap-2 h-10 px-4 bg-[#e11d48] text-white hover:bg-[#e11d48]/90 transition-colors border border-[#e11d48]/20 rounded-lg text-xs font-bold shadow-lg shrink-0"
        onClick={onReturnClick}
      >
        Return (F4) <FaUndoAlt className="w-3.5 h-3.5" />
      </button>

      {/* Exchange Button */}
      <button
        type="button"
        className={`flex items-center justify-center gap-2 h-10 px-4 transition-all rounded-lg text-xs font-bold shadow-lg shrink-0 ${
          isExchangeMode
            ? "bg-[#d97706] text-white border-2 border-amber-400 ring-2 ring-amber-400/50 animate-pulse"
            : "bg-[#d97706] text-white hover:bg-[#d97706]/90 border border-[#d97706]/20"
        }`}
        onClick={onExchangeClick}
      >
        {isExchangeMode ? "Exit Exchange Mode (F3)" : "Exchange (F3)"}{" "}
        <FaExchangeAlt className="w-3.5 h-3.5" />
      </button>

      {/* Collect Due Button */}
      {allowDueSale && (
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-10 px-4 bg-[#6366f1] text-white hover:bg-[#6366f1]/90 transition-colors border border-[#6366f1]/20 rounded-lg text-xs font-bold shadow-lg shrink-0"
          onClick={onCollectDueClick}
        >
          Collect Due (F5) <FaMoneyBillWave className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Hold Button */}
      <button
        type="button"
        className="flex items-center justify-center gap-2 h-10 px-4 bg-[#ffb000] text-black hover:bg-[#ffb000]/90 transition-colors border border-[#ffb000]/20 rounded-lg text-xs font-bold shadow-lg shrink-0"
        onClick={onHoldClick}
      >
        Hold (F6)
        {heldCartsCount > 0 && (
          <span className="ml-1 bg-black text-[#ffb000] rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
            {heldCartsCount}
          </span>
        )}
        <FaHandPaper className="w-3.5 h-3.5" />
      </button>

      {/* Refresh Button */}
      <button
        type="button"
        className="flex items-center justify-center gap-2 h-10 px-4 bg-[#0f8c5a] text-white hover:bg-[#0f8c5a]/90 transition-colors border border-[#0f8c5a]/20 rounded-lg text-xs font-bold shadow-lg shrink-0"
        onClick={onRefreshClick}
      >
        Refresh (F7) <FaSync className="w-3.5 h-3.5" />
      </button>

      {/* Last Bill Button */}
      <button
        type="button"
        className="flex items-center justify-center gap-2 h-10 px-4 bg-[#136bfb] text-white hover:bg-[#136bfb]/90 transition-colors border border-[#136bfb]/20 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shrink-0"
        onClick={onLastBillClick}
        disabled={isLastBillDisabled}
      >
        Last Bill (F8) <FaPrint className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
