/**
 * Settings Page Component
 * A dedicated page for all settings
 */

import React, { useState } from 'react';
import SettingsCategoryScroller from './SettingsCategoryScroller';
import APIKeysSettings from './APIKeysSettings';

interface SettingsPageProps {
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("general");

  const handleApiKeyChange = (modelId: string, apiKey: string) => {
    console.log(`API Key changed for ${modelId}:`, apiKey);
    // TODO: Implement API key storage
  };

  const handleModelToggle = (modelId: string, enabled: boolean) => {
    console.log(`Model ${modelId} toggled:`, enabled);
    // TODO: Implement model enable/disable logic
  };

  const renderContent = () => {
    switch (selectedCategory) {
      case 'api':
        return (
          <APIKeysSettings 
            onApiKeyChange={handleApiKeyChange}
            onModelToggle={handleModelToggle}
          />
        );
      default:
        return (
          <div className="text-center text-gray-500">
            <h2 className="text-xl font-medium mb-2">
              {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Settings
            </h2>
            <p className="text-gray-400">
              {selectedCategory === 'general' && 'General application settings'}
              {selectedCategory === 'appearance' && 'Customize the look and feel'}
              {selectedCategory === 'data' && 'Manage data storage and sync'}
              {selectedCategory === 'privacy' && 'Privacy and security settings'}
              {selectedCategory === 'about' && 'About TabSense AI'}
            </p>
            <p className="text-sm text-gray-300 mt-4">Coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Category Scroller */}
      <SettingsCategoryScroller
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onClose={onClose}
      />

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPage;
