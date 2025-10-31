import React, { useState, useRef, useEffect } from 'react';
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (menuOpen && menuButtonRefs.current[menuOpen]) {
      const button = menuButtonRefs.current[menuOpen];
      if (button) {
        const rect = button.getBoundingClientRect();
        const dropdownHeight = 80; // Approximate height of dropdown with 2 buttons
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Determine if dropdown should appear above or below
        const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        
        setMenuPosition({
          top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
          right: window.innerWidth - rect.right
        });
      }
    } else {
      setMenuPosition(null);
    }
  }, [menuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen) {
        const dropdown = dropdownRef.current;
        const button = menuButtonRefs.current[menuOpen];
        
        // Check if click is outside both button and dropdown
        const clickedOutside = 
          dropdown && !dropdown.contains(e.target as Node) &&
          button && !button.contains(e.target as Node);
        
        if (clickedOutside) {
          setMenuOpen(null);
        }
      }
    };

    if (menuOpen) {
      // Use a slight delay to allow dropdown button clicks to register first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [menuOpen]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Archive className="w-3 h-3 text-primary" />
            My Conversations
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
                className="relative group z-0"
                onMouseEnter={() => setHoveredCard(conversation.id)}
                onMouseLeave={() => {
                  // Only clear hover if menu is not open for this card
                  if (menuOpen !== conversation.id) {
                    setHoveredCard(null);
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    // Don't trigger card click if clicking on menu button area
                    if ((e.target as HTMLElement).closest('[data-menu-button]')) {
                      return;
                    }
                    onLoadConversation(conversation.id);
                  }}
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
                {(activeConversationId === conversation.id || hoveredCard === conversation.id || menuOpen === conversation.id) && (
                  <div className="absolute top-2 right-2 z-20" data-menu-button>
                      <button
                      ref={(el) => {
                        menuButtonRefs.current[conversation.id] = el;
                      }}
                        onClick={(e) => {
                          e.stopPropagation();
                        e.preventDefault();
                          setMenuOpen(menuOpen === conversation.id ? null : conversation.id);
                        }}
                      className="p-1 hover:bg-muted/50 rounded transition-colors bg-background/80 backdrop-blur-sm"
                        title="More options"
                      >
                        <MoreVertical className="w-3 h-3 text-muted-foreground" />
                      </button>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed position dropdown menu - renders outside scrollable container */}
      {menuOpen && menuPosition && (
                        <>
                          <div 
            className="fixed inset-0 z-40" 
            onMouseDown={(e) => {
              // Only close if clicking directly on overlay, not if event bubbled from dropdown
              if (e.target === e.currentTarget) {
                setMenuOpen(null);
              }
            }}
                          />
          <div 
            ref={dropdownRef}
            data-dropdown-id={menuOpen}
            className="fixed z-50 w-32 bg-white border border-border/20 rounded-lg shadow-lg"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'fixed',
              zIndex: 50
            }}
            onMouseDown={(e) => {
              // Prevent overlay from closing when clicking inside dropdown
              e.stopPropagation();
            }}
          >
                            <div className="py-1">
                              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                  e.preventDefault();
                  onShareConversation(menuOpen);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-left hover:bg-muted/50 flex items-center gap-2"
                              >
                                <Share2 className="h-3 w-3" />
                                Share
                              </button>
                              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                  e.preventDefault();
                  onDeleteConversation(menuOpen);
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
  );
};

export default ArchiveSection;
