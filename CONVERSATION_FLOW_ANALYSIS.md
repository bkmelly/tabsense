# Conversation Flow Analysis

## Current Flow

1. **Tab Processing**: Tab is auto-processed when opened
2. **Summary Display**: Small preview shown in tab card (excerpt from full summary)
3. **Ask Questions Button**: Clicking creates conversation with full summary as first message
4. **QA Section**: Opens with full summary, shows suggested questions (currently hardcoded)
5. **First Question**: When user asks first question, conversation is saved to archive with title
6. **Archived**: Conversation appears in conversation history

## Missing AI Features

### 1. Dynamic Conversation Titles
**Current**: Title is manually set like "Summary Q&A: {tab.title} - {first 20 chars}"
**Needed**: AI-generated title based on conversation content

### 2. Dynamic Suggested Questions
**Current**: Hardcoded questions about React
**Needed**: AI-generated questions based on:
- Tab category (news, blog, youtube, etc.)
- Summary content
- Key points

## Implementation Plan

### Service Worker Side
Add new message handlers:
- `GENERATE_CONVERSATION_TITLE`: Generate title from messages
- `GENERATE_SUGGESTED_QUESTIONS`: Generate questions from summary

### UI Side
1. Update `openSummaryQA` to call AI for suggested questions
2. Update `handleSummaryAskQuestion` to generate AI title after first exchange
3. Update `SuggestedQuestionsSection` to accept dynamic questions
4. Pass tab context to generate relevant questions

## Files to Modify

1. `src/background/service-worker.js` - Add AI handlers
2. `src/ui/sidebar/TabSenseSidebar.tsx` - Update conversation logic
3. `src/ui/components/SuggestedQuestionsSection.tsx` - Accept dynamic props
4. `src/ui/components/QASection.tsx` - Pass dynamic questions

## Conversation Flow Diagram

```
Tab Open → Auto Process → Summary Generated
                              ↓
                    Small Preview Shown
                              ↓
                   Click "Ask Questions"
                              ↓
                    Load Full Summary
                              ↓
                  Generate AI Questions
                              ↓
                      Show Questions
                              ↓
                      User Asks First Q
                              ↓
                  Generate AI Answer
                              ↓
                  Generate Conversation Title
                              ↓
                    Save to Archive
```

