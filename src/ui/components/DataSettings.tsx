/**
 * Data Settings Component
 * Manages data storage, summaries, conversations, and settings
 */

import React, { useState, useEffect } from 'react';
import {
  Trash2, Database, FileText, MessageSquare, Settings,
  AlertTriangle, CheckCircle, Loader2, Download, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import ConfirmationDialog from './ConfirmationDialog';
import { useToast } from './Toast';

// Chrome types declaration
declare global {
  interface Window {
    chrome: any;
  }
}
declare const chrome: any;

interface DataSettingsProps {
  onDataAction?: (action: string, data?: any) => void;
}

interface StorageStats {
  summaries: number;
  conversations: number;
  settings: number;
  totalSize: string;
}

interface CacheStats {
  totalCached: number;
  cacheSize: string;
  hitRate: number;
  lastCleanup: string;
}

const DataSettings: React.FC<DataSettingsProps> = ({ onDataAction }) => {
  const [storageStats, setStorageStats] = useState<StorageStats>({
    summaries: 0,
    conversations: 0,
    settings: 0,
    totalSize: '0 KB'
  });
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalCached: 0,
    cacheSize: '0 KB',
    hitRate: 0,
    lastCleanup: 'Never'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ [key: string]: 'idle' | 'loading' | 'success' | 'error' }>({});
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    action: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: '',
    title: '',
    message: ''
  });
  const { success, error } = useToast();

  // Load storage statistics
  const loadStorageStats = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'DATA_GET_STATS'
      });
      
      if (response && response.success && response.data && response.data.stats) {
        setStorageStats(response.data.stats);
      } else {
        console.error('Failed to load storage stats:', response?.error || 'Invalid response');
        // Set default stats on error
        setStorageStats({
          summaries: 0,
          conversations: 0,
          settings: 0,
          totalSize: '0 KB'
        });
      }
    } catch (error) {
      console.error('Failed to load storage stats:', error);
      // Set default stats on error
      setStorageStats({
        summaries: 0,
        conversations: 0,
        settings: 0,
        totalSize: '0 KB'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load cache statistics
  const loadCacheStats = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'CHECK_CACHED_SUMMARIES'
      });
      
      if (response && response.success && response.data) {
        setCacheStats({
          totalCached: response.data.totalCached || 0,
          cacheSize: response.data.cacheSize || '0 KB',
          hitRate: response.data.hitRate || 0,
          lastCleanup: response.data.lastCleanup || 'Never'
        });
      } else {
        console.error('Failed to load cache stats:', response?.error || 'Invalid response');
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  useEffect(() => {
    loadStorageStats();
    loadCacheStats();
  }, []);

  const handleAction = async (actionType: string, confirmMessage: string) => {
    setActionStatus(prev => ({ ...prev, [actionType]: 'loading' }));
    try {
      const response = await chrome.runtime.sendMessage({
        action: actionType
      });

      if (response.success) {
        setActionStatus(prev => ({ ...prev, [actionType]: 'success' }));
        
        // Show success toast immediately for better UX
        const actionNames: { [key: string]: string } = {
          'DATA_DELETE_SUMMARIES': 'All summaries deleted successfully',
          'DATA_DELETE_CONVERSATIONS': 'All conversations deleted successfully',
          'DATA_RESET_SETTINGS': 'Settings reset successfully',
          'DATA_CLEAR_ALL': 'All data cleared successfully',
          'DATA_EXPORT_DATA': 'Data exported successfully',
          'CLEAR_CACHE': 'Cache cleared successfully'
        };
        
        success('Success', actionNames[actionType] || 'Action completed successfully');
        
        // Call parent callback to refresh UI BEFORE waiting
        if (onDataAction) {
          onDataAction(actionType, { refreshNeeded: true });
        }
        
        // Wait a moment for storage to be written and UI to refresh
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Refresh stats after UI has had time to update
        loadStorageStats();
        
        // Refresh cache stats if cache was cleared
        if (actionType === 'CLEAR_CACHE') {
          loadCacheStats();
        }
      } else {
        setActionStatus(prev => ({ ...prev, [actionType]: 'error' }));
        console.error(`Failed to perform ${actionType}:`, response.error);
        
        error('Error', response.error || 'Action failed');
      }
    } catch (error) {
      setActionStatus(prev => ({ ...prev, [actionType]: 'error' }));
      console.error(`Error performing ${actionType}:`, error);
      
      error('Error', 'An unexpected error occurred');
    } finally {
      setTimeout(() => setActionStatus(prev => ({ ...prev, [actionType]: 'idle' })), 3000);
    }
  };

  const showConfirmationDialog = (action: string, title: string, message: string) => {
    // Check if there's data to delete before showing dialog
    if (action === 'DATA_DELETE_SUMMARIES' && storageStats.summaries === 0) {
      error('No Data', 'There are no summaries to delete');
      return;
    }
    
    if (action === 'DATA_DELETE_CONVERSATIONS' && storageStats.conversations === 0) {
      error('No Data', 'There are no conversations to delete');
      return;
    }
    
    if (action === 'DATA_RESET_SETTINGS' && storageStats.settings === 0) {
      error('No Data', 'There are no settings to reset');
      return;
    }
    
             if (action === 'DATA_CLEAR_ALL' && storageStats.summaries === 0 && storageStats.conversations === 0 && storageStats.settings === 0) {
               error('No Data', 'There is no data to clear');
               return;
             }
             
             if (action === 'CLEAR_CACHE' && cacheStats.totalCached === 0) {
               error('No Cache', 'There is no cache to clear');
               return;
             }
    
    setConfirmationDialog({
      isOpen: true,
      action,
      title,
      message
    });
  };

  const handleConfirmAction = async () => {
    const { action } = confirmationDialog;
    
    const actionMessages: { [key: string]: string } = {
      'DATA_DELETE_SUMMARIES': 'Are you sure you want to delete all summaries? This action cannot be undone.',
      'DATA_DELETE_CONVERSATIONS': 'Are you sure you want to delete all conversations? This action cannot be undone.',
      'DATA_RESET_SETTINGS': 'Are you sure you want to reset all settings to their default values? API keys will be preserved.',
      'DATA_CLEAR_ALL': 'ARE YOU ABSOLUTELY SURE YOU WANT TO DELETE ALL TAB SENSE DATA? THIS CANNOT BE UNDONE.'
    };
    
    await handleAction(action, actionMessages[action] || 'Are you sure?');
  };

  const handleExportData = async () => {
    setActionStatus(prev => ({ ...prev, 'DATA_EXPORT_DATA': 'loading' }));
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'DATA_EXPORT_DATA'
      });

      if (response.success && response.data?.exportData) {
        const blob = new Blob([JSON.stringify(response.data.exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tabsense_data_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setActionStatus(prev => ({ ...prev, 'DATA_EXPORT_DATA': 'success' }));
        
        success('Success', 'Data exported successfully');
      } else {
        setActionStatus(prev => ({ ...prev, 'DATA_EXPORT_DATA': 'error' }));
        console.error('Failed to export data:', response.error);
        
        error('Error', response.error || 'Failed to export data');
      }
    } catch (error) {
      setActionStatus(prev => ({ ...prev, 'DATA_EXPORT_DATA': 'error' }));
      console.error('Error exporting data:', error);
      
      error('Error', 'An unexpected error occurred while exporting');
    } finally {
      setTimeout(() => setActionStatus(prev => ({ ...prev, 'DATA_EXPORT_DATA': 'idle' })), 3000);
    }
  };

   return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Data Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage your stored data, summaries, and conversations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="w-4 h-4" />
          <span>{storageStats.totalSize}</span>
        </div>
      </div>

      {/* Cache Management */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Cache Management</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCacheStats}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Database className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">{cacheStats.totalCached}</div>
            <div className="text-xs text-muted-foreground">Cached Summaries</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Database className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">{cacheStats.cacheSize}</div>
            <div className="text-xs text-muted-foreground">Cache Size</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Database className="w-5 h-5 text-purple-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">{cacheStats.hitRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Hit Rate</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Database className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">{cacheStats.lastCleanup}</div>
            <div className="text-xs text-muted-foreground">Last Cleanup</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => showConfirmationDialog('CLEAR_CACHE', 'Clear Cache', 'This will clear all cached summaries. This may slow down future summarization requests.')}
            disabled={cacheStats.totalCached === 0}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </Card>

      {/* Delete Specific Data */}
      <Card className="p-4">
        <h3 className="font-medium text-foreground mb-4">Delete Specific Data</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">All Summaries</div>
                <div className="text-xs text-muted-foreground">Delete all tab summaries and processed data</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showConfirmationDialog('DATA_DELETE_SUMMARIES', 'Delete All Summaries', 'This will permanently delete all tab summaries and processed data. This action cannot be undone.')}
              disabled={actionStatus['DATA_DELETE_SUMMARIES'] === 'loading' || storageStats.summaries === 0}
              className={`h-8 w-8 p-0 ${
                storageStats.summaries === 0 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-destructive hover:text-destructive hover:bg-destructive/10'
              }`}
            >
              {actionStatus['DATA_DELETE_SUMMARIES'] === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionStatus['DATA_DELETE_SUMMARIES'] === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : actionStatus['DATA_DELETE_SUMMARIES'] === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">All Conversations</div>
                <div className="text-xs text-muted-foreground">Delete all Q&A conversation history</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showConfirmationDialog('DATA_DELETE_CONVERSATIONS', 'Delete All Conversations', 'This will permanently delete all Q&A conversation history. This action cannot be undone.')}
              disabled={actionStatus['DATA_DELETE_CONVERSATIONS'] === 'loading' || storageStats.conversations === 0}
              className={`h-8 w-8 p-0 ${
                storageStats.conversations === 0 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-destructive hover:text-destructive hover:bg-destructive/10'
              }`}
            >
              {actionStatus['DATA_DELETE_CONVERSATIONS'] === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionStatus['DATA_DELETE_CONVERSATIONS'] === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : actionStatus['DATA_DELETE_CONVERSATIONS'] === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">All Settings</div>
                <div className="text-xs text-muted-foreground">Reset all settings to defaults</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showConfirmationDialog('DATA_RESET_SETTINGS', 'Reset All Settings', 'This will reset all settings to their default values. API keys will be preserved.')}
              disabled={actionStatus['DATA_RESET_SETTINGS'] === 'loading' || storageStats.settings === 0}
              className={`h-8 w-8 p-0 ${
                storageStats.settings === 0 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-destructive hover:text-destructive hover:bg-destructive/10'
              }`}
            >
              {actionStatus['DATA_RESET_SETTINGS'] === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionStatus['DATA_RESET_SETTINGS'] === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : actionStatus['DATA_RESET_SETTINGS'] === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Data */}
      <Card className="p-4">
        <h3 className="font-medium text-foreground mb-4">Export Data</h3>
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Export All Data</div>
              <div className="text-xs text-muted-foreground">Download all your data as a JSON file</div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            disabled={actionStatus['DATA_EXPORT_DATA'] === 'loading'}
          >
            {actionStatus['DATA_EXPORT_DATA'] === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : actionStatus['DATA_EXPORT_DATA'] === 'success' ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : actionStatus['DATA_EXPORT_DATA'] === 'error' ? (
              <AlertTriangle className="w-4 h-4 mr-2" />
            ) : null}
            {actionStatus['DATA_EXPORT_DATA'] === 'loading' ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-4 border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="font-medium text-destructive">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
          <div>
            <div className="text-sm font-medium text-destructive">Clear All Data</div>
            <div className="text-xs text-destructive/80">
              This will permanently delete all summaries, conversations, and settings. This action cannot be undone.
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => showConfirmationDialog('DATA_CLEAR_ALL', 'Clear All Data', 'This will permanently delete ALL TabSense data, including summaries, conversations, and settings. This action cannot be undone.')}
            disabled={actionStatus['DATA_CLEAR_ALL'] === 'loading' || (storageStats.summaries === 0 && storageStats.conversations === 0 && storageStats.settings === 0)}
            className={storageStats.summaries === 0 && storageStats.conversations === 0 && storageStats.settings === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {actionStatus['DATA_CLEAR_ALL'] === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : actionStatus['DATA_CLEAR_ALL'] === 'success' ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : actionStatus['DATA_CLEAR_ALL'] === 'error' ? (
              <AlertTriangle className="w-4 h-4 mr-2" />
            ) : null}
            {actionStatus['DATA_CLEAR_ALL'] === 'loading' ? 'Clearing...' : 'Clear All'}
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText="Confirm"
        cancelText="Cancel"
        variant="destructive"
        isLoading={actionStatus[confirmationDialog.action] === 'loading'}
      />
    </div>
  );
};

export default DataSettings;
