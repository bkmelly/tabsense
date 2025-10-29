import React from 'react';
import { Sparkles, Settings, Archive, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSettings?: boolean;
  showHistory?: boolean;
  onSettingsClick?: () => void;
  onHistoryClick?: () => void;
  onRefreshClick?: () => void;
  serviceWorkerStatus?: 'connecting' | 'connected' | 'error';
  settingsComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title = "TabSense AI",
  subtitle = "Research Assistant",
  showSettings = true,
  showHistory = true,
  onSettingsClick,
  onHistoryClick,
  onRefreshClick,
  serviceWorkerStatus = 'connecting',
  settingsComponent
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
              title="My Conversations"
            >
              <Archive className="w-4 h-4 text-white/70" />
            </button>
          )}
          
          {onRefreshClick && (
            <button
              onClick={onRefreshClick}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Refresh & Process All Tabs"
            >
              <RefreshCw className="w-4 h-4 text-white/70" />
            </button>
          )}
          
          {showSettings && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onSettingsClick) {
                    onSettingsClick();
                  }
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-white/70" />
              </button>
              
              {/* Service Worker Status Dot */}
              <div 
                className={`w-2 h-2 rounded-full ${
                  serviceWorkerStatus === 'connected' ? 'bg-green-500' : 
                  serviceWorkerStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                title={`Service Worker: ${serviceWorkerStatus}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
