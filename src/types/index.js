// Chrome Extension API Types
export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
  windowId: number;
}

export interface PageContent {
  title: string;
  url: string;
  text: string;
  timestamp: number;
  wordCount: number;
  domain: string;
}

export interface TabSummary {
  url: string;
  title: string;
  summary: string;
  timestamp: number;
  wordCount: number;
  domain: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface CrossTabQuestion {
  question: string;
  answer: string;
  timestamp: number;
  sources: string[];
}

// AI Adapter Types
export interface AIAdapter {
  summarizeText(text: string): Promise<string>;
  answerQuestion(question: string, summaries: TabSummary[]): Promise<string>;
  translateText(text: string, targetLanguage: string): Promise<string>;
  isAvailable(): boolean;
}

// Message Types for Chrome Extension Communication
export interface ExtensionMessage {
  action: string;
  payload?: any;
  tabId?: number;
}

export interface PageContentMessage extends ExtensionMessage {
  action: 'PAGE_CONTENT';
  payload: PageContent;
}

export interface SummaryReadyMessage extends ExtensionMessage {
  action: 'SUMMARY_READY';
  payload: TabSummary;
}

export interface QuestionMessage extends ExtensionMessage {
  action: 'ASK_QUESTION';
  payload: { question: string };
}

export interface AnswerMessage extends ExtensionMessage {
  action: 'QUESTION_ANSWER';
  payload: CrossTabQuestion;
}

// Configuration Types
export interface TabSenseConfig {
  maxTabs: number;
  summaryLength: 'short' | 'medium' | 'long';
  autoSummarize: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  theme: 'light' | 'dark' | 'auto';
}

// Error Types
export interface TabSenseError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Storage Types
export interface StorageData {
  summaries: Record<string, TabSummary>;
  config: TabSenseConfig;
  questions: CrossTabQuestion[];
  errors: TabSenseError[];
}
