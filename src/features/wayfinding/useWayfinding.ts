'use client';

import { useState, useCallback } from 'react';
import { VenueNode, findShortestPath } from './venueGraph';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  destinationId?: string;
  languageDetected?: string;
  path?: VenueNode[];
}

/**
 * Custom hook to manage multilingual wayfinding concierge operations.
 * Handles API stream parsing, state updates, and Dijkstra path calculations.
 */
export function useWayfinding(initialStartNode = 'gate-a') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [startNode, setStartNode] = useState<string>(initialStartNode);
  const [activePath, setActivePath] = useState<VenueNode[] | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');

  const askQuestion = useCallback(async (query: string) => {
    if (!query.trim()) return;

    // Reset stream state
    setIsStreaming(true);
    setStreamText('');

    // Append user message
    const userMessageId = `msg-${Date.now()}-user`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: query
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/wayfinding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, startNode })
      });

      if (!response.ok) {
        throw new Error('Concierge failed to respond');
      }

      // 1. Extract metadata from custom headers
      const intent = response.headers.get('x-intent') || undefined;
      const destinationId = response.headers.get('x-destination-id') || undefined;
      const languageDetected = response.headers.get('x-language-detected') || undefined;

      // 2. Compute Dijkstra path if destination is valid
      let path: VenueNode[] | null = null;
      if (destinationId) {
        path = findShortestPath(startNode, destinationId);
        setActivePath(path);
      }

      // 3. Read the stream body chunk-by-chunk
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          setStreamText(assistantText);
        }
      }

      // 4. Append assistant message with metadata and pathing
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantText,
        intent,
        destinationId,
        languageDetected,
        path: path || undefined
      };

      setMessages(prev => [...prev, assistantMsg]);
      setStreamText('');
      setIsStreaming(false);

    } catch (error) {
      console.error('Error fetching wayfinding stream:', error);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant-error`,
        role: 'assistant',
        content: 'Apologies, I encountered an issue connection. Let me try again shortly.'
      };
      setMessages(prev => [...prev, errorMsg]);
      setIsStreaming(false);
    }
  }, [startNode]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setActivePath(null);
    setStreamText('');
  }, []);

  return {
    messages,
    startNode,
    setStartNode,
    activePath,
    setActivePath,
    isStreaming,
    streamText,
    askQuestion,
    clearChat
  };
}
