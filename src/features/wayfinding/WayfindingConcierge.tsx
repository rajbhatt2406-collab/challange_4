'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWayfinding } from './useWayfinding';
import { VENUE_NODES } from './venueGraph';
import { useAccessibility } from '@/features/accessibility/AccessibilityContext';
import dynamic from 'next/dynamic';

const WayfindingMap = dynamic(() => import('./WayfindingMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center text-xs font-mono text-emerald-800 animate-pulse">
      LOADING MAP RADAR SCHEMA...
    </div>
  )
});
import { Send, Mic, RefreshCw, Navigation, HelpCircle, MapPin } from 'lucide-react';

const SIMULATED_VOICES = [
  { text: '¿Dónde está el baño accesible más cercano?', lang: 'Spanish' },
  { text: 'Where is the medical station near the East entrance?', lang: 'English' },
  { text: 'Où puis-je acheter des tacos s\'il vous plaît ?', lang: 'French' },
  { text: 'Gostaria de saber onde fica o Portão D.', lang: 'Portuguese' }
];

export default function WayfindingConcierge() {
  const {
    messages,
    startNode,
    setStartNode,
    activePath,
    isStreaming,
    streamText,
    askQuestion,
    clearChat
  } = useWayfinding('gate-a');

  const { announce } = useAccessibility();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    askQuestion(inputText);
    setInputText('');
  };

  const handleSimulateVoice = () => {
    if (isListening) return;
    setIsListening(true);
    announce('Listening for voice input...');
    
    // Pick random voice prompt
    const randomVoice = SIMULATED_VOICES[Math.floor(Math.random() * SIMULATED_VOICES.length)];
    
    setTimeout(() => {
      setInputText(randomVoice.text);
      setIsListening(false);
      announce(`Voice input captured: ${randomVoice.text}`);
    }, 1500);
  };

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-scoreboard-black/40 border border-emerald-950/60 rounded-xl p-4 lg:p-6"
      role="region"
      aria-label="Multilingual Wayfinding Concierge"
    >
      {/* Column 1: Chat interface */}
      <div className="lg:col-span-5 flex flex-col h-[550px] bg-scoreboard-black/80 rounded-xl border border-emerald-950 overflow-hidden">
        {/* Header */}
        <div className="bg-pitch-green-dark p-3 border-b border-emerald-950 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-scoreboard-green animate-pulse" />
            <h3 className="font-mono text-scoreboard-green text-sm tracking-wider uppercase">AI WAYFINDING ASSISTANT</h3>
          </div>
          <button
            onClick={clearChat}
            className="p-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 rounded focus-visible:ring-2"
            aria-label="Clear chat history"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            RESET
          </button>
        </div>

        {/* Start Node Selector */}
        <div className="bg-emerald-950/20 p-3 border-b border-emerald-950/60 flex items-center justify-between gap-2">
          <label htmlFor="start-node-select" className="text-xs font-mono text-emerald-500 uppercase flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            Start Location:
          </label>
          <select
            id="start-node-select"
            value={startNode}
            onChange={(e) => {
              setStartNode(e.target.value);
              announce(`Starting point set to ${VENUE_NODES.find(n => n.id === e.target.value)?.name}`);
            }}
            className="bg-scoreboard-black text-xs text-chalk-white border border-emerald-900 rounded p-1 font-mono focus-visible:ring-2 focus-visible:ring-scoreboard-green cursor-pointer"
          >
            {VENUE_NODES.filter(n => n.type === 'gate' || n.type === 'connector').map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chat Bubbles */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-emerald-600/80 space-y-3">
              <HelpCircle className="w-12 h-12 stroke-[1.5]" />
              <p className="max-w-xs text-xs font-mono leading-relaxed">
                ASK IN ANY LANGUAGE:<br />
                {"\"¿Dónde están los baños?\""}<br />
                {"\"Where is the taco concession stand?\""}<br />
                {"\"Where can I find medical help?\""}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-pitch-green text-chalk-white rounded-br-none border border-emerald-800'
                    : 'bg-emerald-950/40 text-emerald-50 border border-emerald-900/60 rounded-bl-none'
                }`}
              >
                {msg.role === 'assistant' && msg.languageDetected && (
                  <span className="block text-[10px] font-mono text-scoreboard-green uppercase tracking-widest mb-1">
                    [{msg.languageDetected}] Intent: {msg.intent?.replace('FIND_', '')}
                  </span>
                )}
                <p className="leading-relaxed font-sans">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Stream Text placeholder */}
          {isStreaming && streamText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-emerald-950/40 text-emerald-50 border border-emerald-900/60 rounded-lg rounded-bl-none px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 bg-scoreboard-green rounded-full animate-bounce" />
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">TRANSLATING LIVE</span>
                </div>
                <p className="leading-relaxed font-sans">{streamText}</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 bg-scoreboard-black border-t border-emerald-950 flex gap-2">
          <button
            type="button"
            onClick={handleSimulateVoice}
            disabled={isListening}
            className={`p-2.5 rounded-lg border flex items-center justify-center transition-all focus-visible:ring-2 ${
              isListening
                ? 'bg-scoreboard-red/20 border-scoreboard-red text-scoreboard-red animate-pulse'
                : 'bg-emerald-950/40 border-emerald-900 text-emerald-400 hover:bg-emerald-900/60'
            }`}
            aria-label="Simulate voice command translation input"
            title="Simulate voice speech recognition"
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Listening..." : "Ask directions..."}
            disabled={isListening}
            className="flex-1 bg-scoreboard-black border border-emerald-900/80 rounded-lg px-3 py-2 text-sm text-chalk-white placeholder-emerald-800 focus:outline-none focus:border-scoreboard-green focus-visible:ring-1 focus-visible:ring-scoreboard-green font-sans"
            aria-label="Concierge query input"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming || isListening}
            className="p-2.5 bg-scoreboard-green text-scoreboard-black font-semibold rounded-lg hover:bg-emerald-400 transition-colors disabled:bg-emerald-900/40 disabled:text-emerald-800 focus-visible:ring-2 flex items-center justify-center"
            aria-label="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Column 2: Route card & mini map */}
      <div className="lg:col-span-7 flex flex-col h-[550px] bg-scoreboard-black/80 rounded-xl border border-emerald-950 p-4 relative overflow-hidden">
        {/* Stadium outline */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,79,46,0.15),transparent)] pointer-events-none" />

        {/* Title */}
        <div className="flex justify-between items-center mb-4 z-10">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-scoreboard-green" />
            <h4 className="font-mono text-xs tracking-wider uppercase text-emerald-400">STADIUM ROUTING LAYER</h4>
          </div>
          {activePath && (
            <div className="text-[10px] font-mono text-emerald-500 uppercase px-2 py-0.5 bg-emerald-950/60 rounded border border-emerald-900">
              PATH COMPUTED SUCCESSFULLY
            </div>
          )}
        </div>

        {/* Live Map Render */}
        <div className="flex-1 bg-scoreboard-black rounded-lg border border-emerald-950 relative overflow-hidden flex items-center justify-center">
          <WayfindingMap startNode={startNode} activePath={activePath} />
        </div>

        {/* Route Card list */}
        <div className="h-[180px] mt-4 bg-scoreboard-black/60 rounded-lg border border-emerald-950 p-3 overflow-y-auto">
          <h5 className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5" />
            Path Instructions
          </h5>
          
          {activePath ? (
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] border-b border-emerald-950 pb-1.5 mb-1.5">
                <span className="text-emerald-600">FROM: {activePath[0]?.name}</span>
                <span className="text-scoreboard-green">TO: {activePath[activePath.length - 1]?.name}</span>
              </div>
              <ol className="relative border-l border-emerald-900 ml-2.5 pl-4 space-y-3">
                {activePath.map((node, index) => {
                  const isLast = index === activePath.length - 1;
                  return (
                    <li key={node.id} className="relative">
                      <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-scoreboard-black ${
                        index === 0
                          ? 'bg-scoreboard-amber'
                          : isLast
                          ? 'bg-scoreboard-green'
                          : 'bg-emerald-500'
                      }`} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-chalk-white">{node.name}</span>
                        <span className="text-[10px] text-emerald-500">{node.description}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-xs text-emerald-800/80 font-mono">
              Ask a question to see step-by-step route directions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
