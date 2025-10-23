import React from 'react';
import { Globe, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface EmptyStateProps {
  type: 'loading' | 'no-tabs' | 'error' | 'no-data';
  message?: string;
  onRetry?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  type, 
  message, 
  onRetry 
}) => {
  const getContent = () => {
    switch (type) {
      case 'loading':
        return {
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
          title: 'Loading tabs...',
          description: 'Extracting content from your open tabs',
          showRetry: false
        };
      
      case 'no-tabs':
        return {
          icon: <Globe className="w-8 h-8 text-muted-foreground" />,
          title: 'No tabs found',
          description: 'Open some tabs to get started with TabSense',
          showRetry: true
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-8 h-8 text-destructive" />,
          title: 'Failed to load tabs',
          description: message || 'Something went wrong while loading your tabs',
          showRetry: true
        };
      
      case 'no-data':
        return {
          icon: <Globe className="w-8 h-8 text-muted-foreground" />,
          title: 'No content available',
          description: 'The tabs you have open don\'t contain processable content',
          showRetry: true
        };
      
      default:
        return {
          icon: <Globe className="w-8 h-8 text-muted-foreground" />,
          title: 'Empty state',
          description: 'No data to display',
          showRetry: false
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="mb-4">
        {content.icon}
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {content.title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {content.description}
      </p>
      
      {content.showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default EmptyState;
