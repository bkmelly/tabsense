/**
 * YouTube Data API v3 Service
 * Official YouTube API integration for video data, comments, and metadata
 */

import { API_CONFIG, apiKeyManager, rateLimiter } from './apiConfig.js';

export class YouTubeAPIService {
  constructor() {
    this.baseUrl = API_CONFIG.youtube.baseUrl;
    this.endpoints = API_CONFIG.youtube.endpoints;
    this.rateLimits = API_CONFIG.youtube.rateLimits;
  }

  /**
   * Initialize the service with API key
   * @param {string} apiKey - YouTube Data API v3 key
   */
  async initialize(apiKey) {
    if (apiKey) {
      await apiKeyManager.setAPIKey('youtube', apiKey);
    }
    
    const storedKey = await apiKeyManager.getAPIKey('youtube');
    if (!storedKey) {
      throw new Error('YouTube API key not configured. Please set your API key in the extension settings.');
    }
    
    console.log('[YouTubeAPI] Service initialized with API key');
  }

  /**
   * Extract video ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string} Video ID
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Get video details using YouTube Data API
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video data
   */
  async getVideoDetails(videoId) {
    if (!rateLimiter.canMakeRequest('youtube', this.rateLimits)) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('youtube');
    const url = `${this.baseUrl}${this.endpoints.videos}?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('YouTube API quota exceeded or API key invalid');
        }
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found or not accessible');
      }

      const video = data.items[0];
      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        commentCount: parseInt(video.statistics.commentCount) || 0,
        tags: video.snippet.tags || [],
        thumbnails: video.snippet.thumbnails,
        categoryId: video.snippet.categoryId
      };
    } catch (error) {
      console.error('[YouTubeAPI] Failed to get video details:', error);
      throw error;
    }
  }

  /**
   * Get video comments using YouTube Data API
   * @param {string} videoId - YouTube video ID
   * @param {number} maxResults - Maximum number of comments (default: 100)
   * @returns {Promise<Array>} Comments array
   */
  async getVideoComments(videoId, maxResults = 100) {
    if (!rateLimiter.canMakeRequest('youtube', this.rateLimits)) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('youtube');
    const url = `${this.baseUrl}${this.endpoints.comments}?part=snippet,replies&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${apiKey}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('YouTube API quota exceeded or API key invalid');
        }
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items) {
        return [];
      }

      return data.items.map(item => {
        const snippet = item.snippet.topLevelComment.snippet;
        return {
          id: item.id,
          text: snippet.textDisplay,
          author: snippet.authorDisplayName,
          authorChannelId: snippet.authorChannelId?.value,
          likeCount: snippet.likeCount,
          publishedAt: snippet.publishedAt,
          updatedAt: snippet.updatedAt,
          replyCount: item.snippet.totalReplyCount || 0,
          replies: item.replies ? item.replies.comments.map(reply => ({
            id: reply.id,
            text: reply.snippet.textDisplay,
            author: reply.snippet.authorDisplayName,
            likeCount: reply.snippet.likeCount,
            publishedAt: reply.snippet.publishedAt
          })) : []
        };
      });
    } catch (error) {
      console.error('[YouTubeAPI] Failed to get video comments:', error);
      throw error;
    }
  }

  /**
   * Search for videos using YouTube Data API
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results (default: 10)
   * @returns {Promise<Array>} Search results
   */
  async searchVideos(query, maxResults = 10) {
    if (!rateLimiter.canMakeRequest('youtube', this.rateLimits)) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('youtube');
    const url = `${this.baseUrl}${this.endpoints.search}?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('YouTube API quota exceeded or API key invalid');
        }
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items) {
        return [];
      }

      return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails
      }));
    } catch (error) {
      console.error('[YouTubeAPI] Failed to search videos:', error);
      throw error;
    }
  }

  /**
   * Get channel information
   * @param {string} channelId - YouTube channel ID
   * @returns {Promise<Object>} Channel data
   */
  async getChannelInfo(channelId) {
    if (!rateLimiter.canMakeRequest('youtube', this.rateLimits)) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('youtube');
    const url = `${this.baseUrl}${this.endpoints.channels}?part=snippet,statistics&id=${channelId}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        publishedAt: channel.snippet.publishedAt,
        thumbnails: channel.snippet.thumbnails,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        viewCount: parseInt(channel.statistics.viewCount) || 0
      };
    } catch (error) {
      console.error('[YouTubeAPI] Failed to get channel info:', error);
      throw error;
    }
  }

  /**
   * Extract comprehensive YouTube data for a video URL
   * @param {string} url - YouTube video URL
   * @returns {Promise<Object>} Complete YouTube data
   */
  async extractYouTubeData(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL - could not extract video ID');
      }

      console.log('[YouTubeAPI] Extracting data for video:', videoId);

      // Get video details and comments in parallel
      const [videoDetails, comments] = await Promise.all([
        this.getVideoDetails(videoId),
        this.getVideoComments(videoId, 50) // Limit to 50 comments for performance
      ]);

      // Get channel info
      let channelInfo = null;
      try {
        channelInfo = await this.getChannelInfo(videoDetails.channelId);
      } catch (error) {
        console.warn('[YouTubeAPI] Failed to get channel info:', error);
      }

      const result = {
        type: 'youtube',
        video: {
          ...videoDetails,
          url: url,
          videoId: videoId
        },
        comments: comments,
        channel: channelInfo,
        metadata: {
          extractedAt: new Date().toISOString(),
          source: 'youtube_api_v3',
          commentCount: comments.length,
          hasChannelInfo: !!channelInfo
        }
      };

      console.log('[YouTubeAPI] Successfully extracted YouTube data:', {
        title: videoDetails.title.substring(0, 50),
        commentCount: comments.length,
        channel: videoDetails.channelTitle
      });

      return result;
    } catch (error) {
      console.error('[YouTubeAPI] Failed to extract YouTube data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const youtubeAPI = new YouTubeAPIService();
