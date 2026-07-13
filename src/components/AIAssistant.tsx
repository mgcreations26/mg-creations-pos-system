/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, User, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { Product, Customer, SalesInvoice, Expense, CustomOrder, RawMaterial } from '../types';

interface AIAssistantProps {
  products: Product[];
  customers: Customer[];
  invoices: SalesInvoice[];
  expenses: Expense[];
  customOrders: CustomOrder[];
  materials: RawMaterial[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function AIAssistant({
  products,
  customers,
  invoices,
  expenses,
  customOrders,
  materials
}: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I am your **MG Creations ERP AI Business Analyst**. I have fully scanned your Google Sheets database. You can ask me to analyze item popularity, formulate optimal retail pricing margins, compile booth ROI forecasts, or organize custom order deadlines. How can I assist you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Construct structured store state context for Gemini system instructions
  const storeContext = React.useMemo(() => {
    const lowStock = products.filter(p => p.quantity <= p.reorderLevel);
    const totalSalesSum = invoices.reduce((s, i) => s + i.total, 0);
    const totalExpSum = expenses.reduce((s, e) => s + e.amount, 0);
    const pendingOrders = customOrders.filter(o => o.status !== 'Completed' && o.status !== 'Delivered');

    return `
=== CURRENT BUSINESS STATISTICS ===
- Master Catalog Products Count: ${products.length}
- Low Stock Alerts (at or below threshold): ${lowStock.length} items (${lowStock.map(p => `${p.name} [sku: ${p.sku}, qty: ${p.quantity}/${p.reorderLevel}]`).join(', ')})
- Registered CRM Customers Count: ${customers.length}
- Invoices / Paid Transactions Count: ${invoices.length}
- Cumulative Gross Revenue: $${totalSalesSum.toFixed(2)}
- Cumulative Business Expenses: $${totalExpSum.toFixed(2)}
- Computed Net Profit: $${(totalSalesSum - totalExpSum).toFixed(2)}
- Outstanding Custom Commission Orders: ${pendingOrders.length} orders
- Raw Supplies / Materials on hand: ${materials.length} types of supplies
===================================
`;
  }, [products, customers, invoices, expenses, customOrders, materials]);

  const handleSend = async (customText?: string) => {
    const queryText = customText || input;
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: queryText
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: messages.filter(m => m.id !== 'welcome'),
          inventoryContext: storeContext
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMsg: ChatMessage = {
        id: `gem-${Date.now()}`,
        role: 'model',
        text: data.text || "I apologize, I didn't get that. Could you please repeat?"
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `⚠️ **AI Service Error**: ${err?.message || 'Failed to fetch reply. Verify your GEMINI_API_KEY environment variable is configured.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format markdown-like text
  const renderMessageContent = (text: string) => {
    // Simple converter for bold markdown **text** to JSX strong
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-indigo-700">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[600px]">
      
      {/* Left panel: Quick action macros */}
      <div className="lg:col-span-4 bg-gray-50/70 border-r border-gray-100 p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h4 className="text-sm font-extrabold text-gray-800">ERP Copilot Macros</h4>
          </div>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Click any prompt macro below to trigger immediate, custom-analyzed advice based on your active spreadsheet ledger.
          </p>

          <div className="space-y-2.5">
            {[
              {
                title: "📋 Restock Action Plan",
                desc: "Analyzes current stock counts against low stock levels.",
                prompt: "Review current low stock items and give me a clear restocking action plan, listing priority order and counts."
              },
              {
                title: "🎪 Craft Fair ROI",
                desc: "Forecasts profit returns using event booth fees.",
                prompt: "Calculate our craft event ROI and advise which fair channels have been the most profitable vs expensive."
              },
              {
                title: "💰 Pricing Margin Guide",
                desc: "Proposes wholesale margins using product raw costs.",
                prompt: "Analyze our catalog costs vs retail prices and suggest optimizations for higher profit margins."
              },
              {
                title: "👥 VIP Customer Strategy",
                desc: "Devises marketing approaches for frequent purchasers.",
                prompt: "Examine our current client lists. How can we reward repeat VIP buyers or custom commission users to increase sales?"
              }
            ].map((macro, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(macro.prompt)}
                className="w-full text-left bg-white border border-gray-200/80 hover:border-indigo-400 p-3 rounded-2xl transition-all hover:shadow-xs group disabled:opacity-50 cursor-pointer"
              >
                <h5 className="text-xs font-bold text-gray-700 group-hover:text-indigo-600 transition-all">{macro.title}</h5>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{macro.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/30">
          <div className="flex items-center space-x-1.5 text-xs text-indigo-700 font-bold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Knowledge Sync</span>
          </div>
          <p className="text-[10px] text-indigo-600/80 leading-relaxed font-medium">
            Every transaction logged on the register updates this model's knowledge context instantly.
          </p>
        </div>
      </div>

      {/* Right panel: Live chat board */}
      <div className="lg:col-span-8 flex flex-col justify-between h-full bg-white">
        
        {/* Chat window */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 scrollbar-thin max-h-[480px]">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start space-x-2`}
              >
                {!isUser && (
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed whitespace-pre-line shadow-xs ${
                  isUser 
                    ? 'bg-indigo-600 text-white font-semibold' 
                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                }`}>
                  {renderMessageContent(msg.text)}
                </div>
                {isUser && (
                  <div className="p-2 bg-gray-100 text-gray-500 rounded-xl shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          
          {loading && (
            <div className="flex justify-start items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl animate-bounce">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-xs text-gray-400 font-medium">
                Advisor is scanning spreadsheets and formulating analysis...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200/80 rounded-2xl p-2.5">
            <input
              type="text"
              disabled={loading}
              placeholder="Ask me something, e.g., 'What is our profit margin on apparel items?'..."
              className="flex-1 bg-transparent text-xs text-gray-700 focus:outline-none px-2"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
