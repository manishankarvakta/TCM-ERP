"use client";

import React from "react";
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Image as ImageIcon,
  Code,
  CheckSquare,
  Quote
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashMenuProps {
  isVisible: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onSelect: (item: typeof MENU_ITEMS[0]) => void;
}

const MENU_ITEMS = [
  { icon: Type, label: "Text", description: "Just start writing with plain text.", value: "text" },
  { icon: Heading1, label: "Heading 1", description: "Big section heading.", value: "h1" },
  { icon: Heading2, label: "Heading 2", description: "Medium section heading.", value: "h2" },
  { icon: Heading3, label: "Heading 3", description: "Small section heading.", value: "h3" },
  { icon: CheckSquare, label: "To-do list", description: "Track tasks with a to-do list.", value: "todo" },
  { icon: List, label: "Bulleted list", description: "Create a simple bulleted list.", value: "bullet" },
  { icon: ListOrdered, label: "Numbered list", description: "Create a list with numbering.", value: "number" },
  { icon: Code, label: "Code", description: "Capture a code snippet.", value: "code" },
  { icon: Quote, label: "Quote", description: "Capture a quote.", value: "quote" },
  { icon: ImageIcon, label: "Image", description: "Upload or embed with a link.", value: "image" },
];

export const SlashMenu = ({ isVisible, position, onClose, onSelect }: SlashMenuProps) => {
  if (!isVisible) return null;

  return (
    <div 
      className="absolute z-[50] w-72 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200"
      style={{ 
        top: position.top, 
        left: position.left,
      }}
    >
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Basic Blocks</span>
      </div>
      <div className="max-h-80 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-900 group",
              index === 0 && "bg-slate-50 dark:bg-slate-900/50" // Placeholder for selected state
            )}
            onClick={(e) => {
              e.preventDefault();
              onSelect(item);
              onClose();
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="h-10 w-10 shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-primary group-hover:dark:text-primary group-hover:border-primary/20 dark:group-hover:border-primary/20 transition-colors">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none mb-1">{item.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
