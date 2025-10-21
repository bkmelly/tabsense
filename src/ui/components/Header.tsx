import React from 'react';
import { Sparkles, Settings, Archive } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSettings?: boolean;
  showHistory?: boolean;
  onSettingsClick?: () => void;
  onHistoryClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title = "TabSense AI",
  subtitle = "Research Assistant",
  showSettings = true,
  showHistory = true,
  onSettingsClick,
  onHistoryClick
}) => {
  return (
    <div className="bg-black text-white p-4 border-b border-border/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {title}
            </h1>
            <p className="text-xs text-white/70">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {showHistory && (
            <button
              onClick={onHistoryClick}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Conversation History"
            >
              <Archive className="w-4 h-4 text-white/70" />
            </button>
          )}
          
          {showSettings && (
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-white/70" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
