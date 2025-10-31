# Image Analysis Feature Implementation Plan

## Overview
Add image analysis capabilities for academic diagrams and finance charts, with UI components to display extracted images with suggested questions.

## Implementation Steps

### 1. Enhanced Image Extraction
- Filter images by relevance (diagrams, charts, educational images)
- Extract images from content areas (not headers/footers)
- Store image metadata (src, alt, dimensions, context)

### 2. Image Analysis
- Use Chrome Prompt API (multimodal) or external AI (Gemini Vision, Claude Vision)
- Category-specific analysis:
  - **Academic**: Analyze diagrams, charts, scientific illustrations
  - **Finance**: Analyze financial charts, graphs, market data visualizations
- Generate analysis summary and suggested questions

### 3. Data Storage
- Store analyzed images in `tab.extractedImages[]` array
- Include: src, alt, analysis, suggestedQuestion, category

### 4. UI Components
- "Extracted Images" button next to "Sources" collapse
- Image gallery with horizontal scrolling for multiple images
- Expandable images within viewport
- Suggested questions per image
- Beautiful, proportional rendering

## Technical Approach

### Image Filtering Criteria
- Size: Minimum dimensions (e.g., 200x200px) to exclude icons
- Location: Within main content areas (article, main, content selectors)
- Context: Check alt text, title, surrounding text for relevance
- File type: JPG, PNG, SVG (exclude GIF unless educational)

### Analysis Prompt Templates

**Academic:**
```
Analyze this academic diagram/image. Identify:
- Main components/elements shown
- Relationships between elements
- Key concepts illustrated
- Any mathematical formulas or scientific notation
Provide a breakdown and suggest questions for deeper understanding.
```

**Finance:**
```
Analyze this financial chart/graph. Identify:
- Chart type (line, bar, candlestick, etc.)
- Key data points and trends
- Time period covered
- Important indicators or patterns
- Market implications
Provide insights and suggest questions about the data.
```

## UI Design

### Image Display Component
- Horizontal scrollable container for multiple images
- Each image card shows:
  - Thumbnail (proportional, max-width)
  - Expand button (opens in modal/overlay)
  - Suggested question button
  - Analysis summary (collapsible)

### Suggested Questions
- Per-image questions like:
  - "Break down this diagram step by step"
  - "What does this chart indicate about market trends?"
  - "Explain the relationship between these elements"

