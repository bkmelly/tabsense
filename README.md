# TabSense

<div align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-blue?style=for-the-badge&logo=google-chrome" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/AI-Powered-green?style=for-the-badge&logo=openai" alt="AI Powered">
  <img src="https://img.shields.io/badge/Privacy-First-red?style=for-the-badge&logo=shield" alt="Privacy First">
</div>

<div align="center">
  <h3>🚀 AI-powered research assistant for Chrome</h3>
  <p>Summarize, analyze, and query your open tabs using Chrome's built-in AI</p>
</div>

---

## 🎯 What is TabSense?

TabSense transforms your browsing experience by providing intelligent assistance directly in Chrome. Instead of switching between tabs and external AI tools, TabSense brings AI capabilities to your browser.

**The Problem**: Users constantly switch between Chrome and ChatGPT/AI tools for summaries, translations, and analysis.

**The Solution**: TabSense integrates AI directly into Chrome, eliminating context switching and making browsing self-contained.

## ✨ Core Features

### 🧠 Multi-Tab Intelligence
- **Smart Summarization**: Automatically summarize web pages and articles
- **Cross-Tab Analysis**: Ask questions across multiple open tabs
- **Consolidated Overview**: Get insights from all your open tabs at once

### 🔧 AI-Powered Tools
- **🌐 Translation**: Instant translation of foreign content
- **✍️ Proofreading**: AI-powered writing assistance
- **🖼️ Image Analysis**: Explain charts, graphs, and images
- **🎙️ Audio Transcription**: Convert audio/video to text

### 🔒 Privacy & Performance
- **Local Processing**: Uses Chrome's built-in AI (Gemini Nano)
- **No External APIs**: Your data stays on your device
- **Fast & Efficient**: Background processing without slowing down browsing

## 🎯 Perfect For

| User Type | Use Case |
|-----------|----------|
| **Students** | Research papers, study materials, assignment analysis |
| **Researchers** | Academic papers, news analysis, literature reviews |
| **Product Managers** | Competitive analysis, user research, market insights |
| **Journalists** | News gathering, fact-checking, source analysis |
| **Knowledge Workers** | Efficient information processing, content creation |

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/tabsense.git
cd tabsense

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

### Usage
1. **Open multiple tabs** with content you want to analyze
2. **Click the TabSense icon** to open the sidebar
3. **Watch AI summarize** your tabs automatically
4. **Ask questions** like "What are the main themes across these articles?"
5. **Export results** to Markdown, Google Docs, or clipboard

## 🏗️ Architecture

```mermaid
graph TB
    A[Chrome Extension] --> B[Background Service Worker]
    A --> C[Content Scripts]
    A --> D[Sidebar UI]
    A --> E[Popup UI]
    
    B --> F[AI Adapter]
    F --> G[Chrome Built-in AI]
    F --> H[Cloud Fallback]
    
    C --> I[Text Extraction]
    C --> J[Content Analysis]
    
    D --> K[Summary Display]
    D --> L[Q&A Interface]
    D --> M[Export Options]
```

## 🔧 Technical Stack

- **Extension**: Chrome Manifest V3
- **Frontend**: React + TypeScript + Tailwind CSS
- **AI**: Chrome's built-in AI APIs (Gemini Nano)
- **Build**: Vite + esbuild
- **Storage**: Chrome Storage API + IndexedDB

## 📊 Roadmap

### Phase 1: MVP (Current)
- [x] Basic Chrome extension structure
- [x] Text summarization
- [x] Cross-tab Q&A
- [ ] Chrome Web Store submission

### Phase 2: Enhanced Features
- [ ] Image analysis
- [ ] Audio transcription
- [ ] Export integrations
- [ ] Voice input/output

### Phase 3: Scale & Growth
- [ ] Multi-browser support
- [ ] Team collaboration
- [ ] Enterprise features
- [ ] API platform

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Chrome Team** for the built-in AI APIs
- **Mozilla** for the Readability library
- **Open Source Community** for inspiration and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tabsense/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tabsense/discussions)
- **Email**: support@tabsense.ai

---

<div align="center">
  <p><strong>TabSense - Making browsing smarter, one tab at a time.</strong></p>
  <p>Built with ❤️ for the Chrome AI Challenge 2025</p>
</div>
