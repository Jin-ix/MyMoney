import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Key,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  type ChatMessage,
  type AppFinancialContext,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  generateLocalBotResponse,
  askGeminiAssistant,
} from '@/services/aiService';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ArthaLogo } from '@/components/chat/ArthaLogo';
import { getCategoryById } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';

const SUGGESTIONS = [
  '📊 Month summary',
  '🔥 Roast my spending',
  '🎉 Hype my savings',
  '🍔 Food spending',
  '📅 Upcoming bills',
  '🎯 Savings goals',
  '💳 Account balances',
  '🎯 Can I afford ₹2,000?',
  '⚡ Spent ₹150 for coffee via UPI',
];

export function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => getStoredGeminiApiKey());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isListening, setIsListening] = useState(false);

  // App store state
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const accounts = useStore((s) => s.accounts);
  const savingsGoals = useStore((s) => s.savingsGoals);
  const recurringPayments = useStore((s) => s.recurringPayments);
  const settings = useStore((s) => s.settings);
  const currentMonth = useStore((s) => s.currentMonth);
  const addTransaction = useStore((s) => s.addTransaction);
  const showToast = useStore((s) => s.showToast);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'bot',
      text: `Hello! 👋 I'm **Artha AI**, your personal wealth guardian.\n\nI have live access to your accounts, budgets, and transactions. You can ask me questions about your spending, get savings advice, ask me to **roast your spending** 🔥, or log expenses naturally!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Listen for custom global event to open AI Chatbot
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  const getFinancialContext = (): AppFinancialContext => ({
    transactions,
    budgets,
    accounts,
    savingsGoals,
    recurringPayments,
    settings,
    currentMonth,
  });

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const context = getFinancialContext();
      let botResult: { text: string; action?: ChatMessage['suggestedAction']; metrics?: ChatMessage['metrics'] };

      if (apiKey && apiKey.trim().length > 10) {
        botResult = await askGeminiAssistant(query, messages, context, apiKey);
      } else {
        // Fast local intelligent engine
        botResult = generateLocalBotResponse(query, context);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResult.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: botResult.action,
        metrics: botResult.metrics,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Sorry, something went wrong processing that request. Please try again or rephrase your question.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (msgId: string, action: NonNullable<ChatMessage['suggestedAction']>) => {
    const { payload } = action;

    // Call store addTransaction
    addTransaction({
      type: payload.type,
      amount: payload.amount,
      category: payload.category,
      description: payload.description,
      paymentMethod: payload.paymentMethod,
      accountId: payload.accountId,
      date: payload.date,
    });

    // Mark action as executed in the message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.suggestedAction
          ? { ...m, suggestedAction: { ...m.suggestedAction, executed: true } }
          : m
      )
    );

    const catName = getCategoryById(payload.category)?.name || payload.category;
    showToast(`✓ Logged ${formatCurrency(payload.amount, settings.currencySymbol)} for ${payload.description || catName}!`);
  };

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(tempApiKey);
    setApiKey(tempApiKey.trim());
    setShowKeyModal(false);
    showToast(tempApiKey.trim() ? '✓ Gemini API key connected!' : 'Gemini API key cleared (using local AI)');
  };

  // Speech-to-text recognition setup
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Render markdown-like text with bolding and line breaks
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Parse markdown bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="block min-h-[1.25rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-gray-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('### ')) {
              return (
                <span key={pIdx} className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                  {part.slice(4)}
                </span>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <>
      {/* 1. Floating AI Assistant Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Artha AI Assistant"
          className="fixed right-4 lg:right-6 z-30 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-xl shadow-teal-600/30 active:scale-95 transition-all duration-300 ring-4 ring-white/80 dark:ring-slate-900/80 group cursor-pointer"
          style={{
            bottom: 'calc(var(--bottom-nav-height) + 82px + var(--safe-area-inset-bottom))',
          }}
        >
          <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <ArthaLogo size={30} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-300 rounded-full ring-2 ring-white/90 dark:ring-slate-900" />
          </div>
          <span className="text-xs font-extrabold tracking-wide flex items-center gap-1">
            Artha AI <Sparkles size={13} className="text-amber-200" />
          </span>
        </button>
      )}

      {/* 2. Chatbot Dialog / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="MoneyBot AI Assistant"
          className={`fixed z-50 transition-all duration-300 flex flex-col ${
            isExpanded
              ? 'inset-2 sm:inset-6 md:inset-10 lg:inset-14 max-w-4xl mx-auto rounded-3xl'
              : 'bottom-2 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[420px] h-[580px] max-h-[calc(100vh-32px)] rounded-3xl'
          } bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-800 shadow-2xl overflow-hidden`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner p-1">
                <ArthaLogo size={26} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold tracking-tight text-white">Artha AI</h2>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-[10px] font-bold text-emerald-200 border border-emerald-400/30">
                    {apiKey ? 'Gemini 1.5' : 'Local AI'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Your Wealth Guardian
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* API Key Modal Button */}
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                title="Configure Gemini API Key"
                className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <Key size={16} />
              </button>

              {/* Clear History */}
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      sender: 'bot',
                      text: "Chat cleared! How can I assist with your finances right now?",
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                title="Clear Chat History"
                className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Minimize' : 'Expand'}
                className="hidden sm:flex p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                    <ArthaLogo size={18} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-emerald-600/15'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-bl-none border border-gray-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <div className="space-y-1">{formatText(msg.text)}</div>

                  {/* Optional Metrics Chips */}
                  {msg.metrics && msg.metrics.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 dark:border-slate-700/60">
                      {msg.metrics.map((m, mIdx) => (
                        <div
                          key={mIdx}
                          className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-2 border border-gray-200/50 dark:border-slate-700/50 text-center"
                        >
                          <div className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                            {m.title}
                          </div>
                          <div
                            className={`text-xs font-bold ${
                              m.tone === 'positive'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : m.tone === 'negative'
                                ? 'text-rose-500 dark:text-rose-400'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Confirmation Card (Instant Expense Logging) */}
                  {msg.suggestedAction && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/70 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Sparkles size={12} /> Transaction Ready
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                          {msg.suggestedAction.payload.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                          <CategoryIcon
                            name={getCategoryById(msg.suggestedAction.payload.category)?.icon || 'CircleDollarSign'}
                            size={20}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-extrabold text-gray-900 dark:text-white">
                            {formatCurrency(
                              msg.suggestedAction.payload.amount,
                              settings.currencySymbol
                            )}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-slate-300 truncate">
                            {msg.suggestedAction.payload.description}
                          </div>
                        </div>
                      </div>

                      {msg.suggestedAction.executed ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={16} /> Saved to Transactions
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            msg.suggestedAction &&
                            handleExecuteAction(msg.id, msg.suggestedAction)
                          }
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <span>Confirm & Log Transaction</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      msg.sender === 'user' ? 'text-emerald-100' : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-gray-500 dark:text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                  <ArthaLogo size={18} />
                </div>
                <div className="p-3 rounded-2xl rounded-bl-none bg-gray-100 dark:bg-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs ml-1 text-gray-500 dark:text-slate-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-1.5 bg-gray-50/80 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] font-medium text-gray-700 dark:text-slate-300 transition-all cursor-pointer shrink-0"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or log e.g. 'Spent 200 on fuel'..."
              className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isListening ? 'Listening... click to stop' : 'Voice input'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 3. API Key Settings Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Key size={18} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Gemini API Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              MoneyBot already includes <strong>built-in offline financial intelligence</strong> for instant expense logging and budget checks.
              To enable unlimited conversational reasoning and deep financial advice, you can connect a <strong>free Google Gemini API key</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              <span>Get a free Gemini API key at Google AI Studio</span>
              <ExternalLink size={13} />
            </a>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
