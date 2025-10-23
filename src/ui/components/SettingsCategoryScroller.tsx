/**
 * Settings Category Scroller Component
 * A scrollable category navigation with fixed chevron
 */

import React from 'react';
import { ChevronDown, Settings, Key, Palette, Database, ShieldCheck, Info } from 'lucide-react';

export interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const settingsCategories: SettingsCategory[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "api", label: "API Keys", icon: Key },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data", icon: Database },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "about", label: "About", icon: Info },
];

interface SettingsCategoryScrollerProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onClose: () => void;
}

const SettingsCategoryScroller: React.FC<SettingsCategoryScrollerProps> = ({
  selectedCategory,
  onCategoryChange,
  onClose
}) => {
  return (
    <div className="border-b border-gray-200 p-4 pb-3">
      <div className="flex items-center gap-2">
        {/* Fixed Chevron Down Button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center p-1 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0 z-10 bg-white"
          title="Close Settings"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {/* Scrollable Settings Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {settingsCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  selectedCategory === category.id
                    ? "text-black font-semibold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SettingsCategoryScroller;
export { settingsCategories };
