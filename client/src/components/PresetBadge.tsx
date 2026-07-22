import React from 'react';
import { X, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PresetBadgeProps {
  presetName: string | null;
  onClear: () => void;
}

export default function PresetBadge({ presetName, onClear }: PresetBadgeProps) {
  if (!presetName) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/60 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Bookmark className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
        <span className="text-xs font-semibold text-indigo-900 tracking-tight">
          Preset: {presetName}
        </span>
      </div>
      <button
        onClick={onClear}
        className="ml-1 p-0.5 hover:bg-indigo-100 rounded transition-colors"
        title="Clear active preset"
      >
        <X className="h-3 w-3 text-indigo-600" />
      </button>
    </div>
  );
}
