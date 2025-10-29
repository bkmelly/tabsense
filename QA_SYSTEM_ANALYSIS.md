# Q&A System Analysis & Improvement Plan

## Standard AI Chat Patterns

### Core Principles:
1. **Conversation History**: Maintain a thread of messages (user + assistant) to provide context
2. **Context Window Management**: Track token limits and manage context appropriately
3. **Fallback Mechanisms**: Try multiple models/providers when one fails
4. **System Prompts**: Define the AI's role and behavior consistently
5. **Streaming Responses**: Show responses as they generate (optional)
6. **Error Handling**: Graceful degradation when services fail

### Typical Flow:
```
User Message → Add to History → Send to AI (with full history) → Receive Response → Add to History → Display
```

## Our Unique Flow & Advantages

### What Makes Us Different:

1. **Tab-Initiated Conversations**:
   - Conversations start from AI-generated tab summaries (not blank)
   - Summary becomes the first "assistant" message
   - User then asks questions about that specific content

2. **Context-Aware by Design**:
   - Each conversation is tied to a specific tab's content
   - Can answer across multiple tabs (main Q&A) or single tab (summary Q&A)
   - Context is pre-processed (summarized) rather than raw content

3. **Multi-Model Fallback**:
   - Multiple Gemini models available: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, gemini-2.5-flash
   - Automatic failover when one model fails
   - Provider-level fallback (Gemini → OpenAI → Anthropic)

### Current Implementation Analysis

#### What Works:
✅ Tab summaries as conversation seeds
✅ Context passing (tab summaries included in prompts)
✅ Multi-model Gemini fallback loop
✅ Conversation history persistence
✅ UI shows messages with timestamps

#### What's Broken/Missing:

1. **Conversation History Not Used in Prompts**:
   - Current: Each question sends ONLY current question + tab summaries
   - Problem: AI doesn't see previous Q&A in same conversation
   - Impact: No continuity, can't reference previous answers, no follow-ups

2. **No System Prompt Consistency**:
   - Current: Basic prompt with instructions
   - Missing: Role definition, personality, response format guidelines
   - Impact: Inconsistent responses, sometimes uses template formatting

3. **Context Length Management**:
   - Current: Passes full summaries (could be long)
   - Missing: No token counting, no truncation strategy
   - Impact: Risk of exceeding context limits, especially with multiple tabs

4. **No Streaming/Fetch Abort**:
   - Current: Wait for full response
   - Missing: No way to cancel mid-request
   - Impact: Poor UX if request takes long or user navigates away

5. **Template Formatting Bleedthrough**:
   - Current: Aggressive cleaning tries to remove template markers
   - Problem: Sometimes templates used for summaries leak into Q&A answers
   - Impact: Answers look like summaries (with emojis, sections, etc.)

6. **Single Tab Context Mismatch**:
   - For summary Q&A: Only sends selected tab
   - But conversation history contains previous Q&A
   - Missing: Should include conversation history + tab summary

## Issues Identified

### Critical Issues:

1. **No Conversation History in Prompts** (Line 992-1006 in service-worker.js)
   ```javascript
   // CURRENT: Only sends current question + tab summaries
   const fullPrompt = `You are an intelligent research assistant. Answer the following question based on the provided context from ${context.length} tab(s).
   
   Context from tabs:
   ${contextPrompt}
   
   Question: ${question}
   ```
   
   **Should be:**
   ```javascript
   // Include conversation history for continuity
   const conversationHistory = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
   const fullPrompt = `...Previous conversation:\n${conversationHistory}\n\nQuestion: ${question}`;
   ```

2. **Template Formatting in Q&A Answers**
   - Answers sometimes include emojis (📰, 📌, etc.) and markdown sections
   - Cleanup happens but isn't comprehensive enough
   - Should have separate prompt that explicitly forbids template formatting

3. **Context Management for Long Conversations**
   - No logic to truncate old messages when context window fills
   - Could break after many back-and-forth exchanges

### Medium Priority Issues:

4. **Gemini Model Selection Not Optimal**
   - Currently tries models in fixed order
   - Doesn't track which models work best for Q&A vs summaries
   - Could optimize for speed (flash models) vs quality (pro models)

5. **Error Messages Too Generic**
   - "The AI service is temporarily unavailable" doesn't tell user which model failed
   - Should indicate retry attempts and which provider was tried

6. **No Conversation Context Compression**
   - Old messages take up tokens but might be less relevant
   - Could summarize early conversation history when window gets full

## Improvement Plan

### Phase 1: Fix Critical Issues (Immediate)

1. **Add Conversation History to Prompts**
   - Modify `handleAnswerQuestion` to accept `messages` array
   - Build conversation history string from messages
   - Include in prompt: Previous conversation context + Current question
   - Ensure only relevant messages (not the initial summary) are in history for Q&A

2. **Improve Prompt for Q&A Specificity**
   - Create separate Q&A prompt (different from summary prompts)
   - Explicitly forbid template formatting, emojis, section headers
   - Instruct: "Answer conversationally, as if having a discussion"
   - Strong emphasis: "Do NOT use markdown sections, emojis, or structured formatting"

3. **Enhanced Answer Cleaning**
   - More aggressive removal of template artifacts
   - Detect if answer starts looking like a summary and clean it

### Phase 2: Optimize Context Handling

4. **Smart Context Management**
   - Calculate approximate token count
   - Prioritize recent messages in conversation history
   - Truncate or summarize early messages if needed
   - Keep full tab summary (it's the foundation)

5. **Model Selection Strategy**
   - For Q&A: Prefer faster models (flash) for quick responses
   - For complex questions: Try pro models if flash fails
   - Track success rates per model type

### Phase 3: Enhanced Features

6. **Streaming Responses** (Future)
   - Use fetch streaming for Gemini API
   - Update UI as tokens arrive
   - Better perceived performance

7. **Context Compression** (Future)
   - Summarize old conversation turns when window gets full
   - Maintain conversation continuity while saving tokens

## Implementation Priority

### Must Fix Now:
1. ✅ Add conversation history to Q&A prompts
2. ✅ Create Q&A-specific prompt (no templates)
3. ✅ Improve answer cleaning

### Should Fix Soon:
4. Context length management
5. Better error messages
6. Model selection optimization

### Nice to Have:
7. Streaming responses
8. Context compression

## Technical Specifications

### Updated Prompt Structure for Q&A:
```
You are a helpful research assistant having a conversation about web content the user has been reading.

PREVIOUS CONVERSATION CONTEXT:
[Previous messages formatted as dialogue]

CURRENT CONTENT CONTEXT:
[Tab summaries - only what's being discussed]

CURRENT QUESTION:
[User's question]

INSTRUCTIONS:
- Answer naturally and conversationally, as if we're having a discussion
- Reference previous conversation when relevant
- Base your answer ONLY on the provided context
- Do NOT use markdown sections, emojis, bullet points, or structured formatting
- Write in plain conversational English
- If you don't have enough information, say so clearly

ANSWER:
```

### Message History Format:
- Keep all messages in chronological order
- Include role (user/assistant) and content
- Exclude initial summary from Q&A history (it's context, not part of dialogue)
- Limit history to last N messages or token limit

