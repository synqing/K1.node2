import React from 'react';
import { TileParameters } from '../types/tile-types';
import { GlassTile } from './GlassTile';
import { Button } from './ui/button';
import { Trash2, Download } from 'lucide-react';

interface SavedDiscoveriesProps {
  discoveries: TileParameters[];
  onSelect: (discovery: TileParameters) => void;
  onDelete: (id: string) => void;
  onExport: (discovery: TileParameters) => void;
  selectedId?: string;
}

export function SavedDiscoveries({ 
  discoveries, 
  onSelect, 
  onDelete, 
  onExport,
  selectedId 
}: SavedDiscoveriesProps) {
  if (discoveries.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-white/5 rounded-lg border border-white/10">
        <div className="text-white/60 mb-2">No saved discoveries yet</div>
        <div className="text-white/40 text-sm">
          Create and save your parameter combinations to build your personal library
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white">Your Discoveries</h3>
          <p className="text-white/60 text-sm">{discoveries.length} saved parameter combinations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {discoveries.map((discovery) => (
          <div 
            key={discovery.id}
            className="group relative"
          >
            <GlassTile
              parameters={discovery}
              size="medium"
              onClick={() => onSelect(discovery)}
              isSelected={selectedId === discovery.id}
            />
            
            <div className="mt-2 space-y-2">
              <div className="text-white/80 text-sm">{discovery.name}</div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onExport(discovery)}
                  className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(discovery.id)}
                  className="bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="text-white/40 text-xs">
                blur: {discovery.blur}px · opacity: {discovery.opacity}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
