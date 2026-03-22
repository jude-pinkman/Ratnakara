'use client';

import { useState, useRef, useEffect } from 'react';
import { chatbotAPI } from '@/lib/api';
import { Send, Bot, User, Sparkles, MessageSquare, Loader2 } from 'lucide-react';

export default function Chatbot() {
  const [messages, setMessages] = useState<{ question: string; answer: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const question = input;
    setInput('');
    setLoading(true);

    try {
      const res = await chatbotAPI.ask(question);
      const answer = res.data.data.answer || 'No response available';

      setMessages((prev) => [...prev, { question, answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { question, answer: 'Error: Could not connect to chatbot service. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What is eDNA and how is it used?',
    'Explain ocean acidification',
    'What affects fish abundance?',
    'Define biodiversity index',
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-navy-900">AI Research Assistant</h2>
          <p className="text-sm text-gray-500">Ask questions about marine data and terminology</p>
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl p-4 h-[400px] overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-marine-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-marine-600" />
            </div>
            <h3 className="text-lg font-semibold text-navy-900 mb-2">How can I help you today?</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              I can answer questions about marine science, explain terminology, and provide insights about the data.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {sampleQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(question)}
                  className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 rounded-full border border-gray-200 hover:border-marine-300 hover:bg-marine-50 transition-all"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="bg-marine-600 text-white rounded-2xl rounded-tr-md px-4 py-3">
                      <p className="text-sm">{msg.question}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-marine-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-marine-600" />
                    </div>
                  </div>
                </div>

                {/* Bot Response */}
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-800 leading-relaxed">{msg.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-marine-600 animate-spin" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            className="input pr-12"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
            disabled={loading}
          />
          <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button
          className="btn-primary flex items-center gap-2 px-6"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Powered by AI - Responses may vary based on available data
        </p>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-500 hover:text-marine-600 transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}
