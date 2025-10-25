import React, { useState } from 'react';
import { Archive, X, Share2, Trash2, MoreVertical } from 'lucide-react';
import EmptyState from './EmptyState';

interface Conversation {
  id: string;
  title: string;
}

interface ArchiveSectionProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onClose: () => void;
  onLoadConversation: (id: string) => void;
  onShareConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

const ArchiveSection: React.FC<ArchiveSectionProps> = ({
  conversations,
  activeConversationId,
  onClose,
  onLoadConversation,
  onShareConversation,
  onDeleteConversation
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Archive className="w-3 h-3 text-primary" />
            Conversation History
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 px-3 pb-4">
        <div className="max-h-full overflow-y-auto scrollbar-hide">
          {conversations.length === 0 ? (
            <EmptyState type="no-conversations" />
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="relative group"
                onMouseEnter={() => setHoveredCard(conversation.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <button
                  onClick={() => onLoadConversation(conversation.id)}
                  className={`block w-full text-left px-3 py-3 rounded-lg transition-all hover:scale-[1.01] border border-border/20 ${
                    activeConversationId === conversation.id 
                      ? "bg-muted/30 hover:bg-muted/50" 
                      : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground truncate flex-1 pr-2">
                      {conversation.title}
                    </h3>
                  </div>
                </button>
                
                {/* Conditional kebab menu - always visible for active, hover for others */}
                {(activeConversationId === conversation.id || hoveredCard === conversation.id) && (
                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === conversation.id ? null : conversation.id);
                        }}
                        className="p-1 hover:bg-muted/50 rounded transition-colors"
                        title="More options"
                      >
                        <MoreVertical className="w-3 h-3 text-muted-foreground" />
                      </button>
                      
                      {menuOpen === conversation.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setMenuOpen(null)}
                          />
                          
                          <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-border/20 rounded-lg shadow-lg z-20">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShareConversation(conversation.id);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-left hover:bg-muted/50 flex items-center gap-2"
                              >
                                <Share2 className="h-3 w-3" />
                                Share
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteConversation(conversation.id);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-left hover:bg-muted/50 flex items-center gap-2"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveSection;
