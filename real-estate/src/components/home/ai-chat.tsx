"use client";

import { useState, useRef, useEffect } from "react";
import type { PublicListing } from "./listing-card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  listings?: PublicListing[];
}

interface AiChatProps {
  onListingsChange: (listings: PublicListing[], isAI: boolean) => void;
  district?: string;
  listingType?: string;
  maxPrice?: string;
  minRooms?: string;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)}тэрбум`;
  if (price >= 1_000_000) return `${Math.round(price / 1_000_000)}сая`;
  return price.toLocaleString();
}

function MiniListingCard({ listing }: { listing: PublicListing }) {
  return (
    <a
      href={`/listings/${listing.id}`}
      className="block border border-gray-200 rounded-lg p-2 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <p className="text-xs font-medium text-gray-800 truncate leading-tight">{listing.title}</p>
      <p className="text-xs font-bold text-blue-600 mt-0.5">₮{formatPrice(listing.price)}</p>
      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
        {listing.rooms && <span>{listing.rooms}өр</span>}
        {listing.area_sqm && <span>· {listing.area_sqm}м²</span>}
        {listing.district && <span>· {listing.district}</span>}
      </div>
    </a>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function AiChat({
  onListingsChange,
  district,
  listingType,
  maxPrice,
  minRooms,
}: AiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Сайн байна уу! Хайж буй орон сууцаа тайлбарлаарай.\n\nЖишээ нь: «ЧД-д 2 өрөөтэй 200 саяас доош орон сууц»",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: `${Date.now()}u`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/public/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          district: district || undefined,
          listing_type: listingType || undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_rooms: minRooms ? Number(minRooms) : undefined,
        }),
      });
      const data = await res.json();
      const found: PublicListing[] = data.listings ?? [];

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}a`,
        role: "assistant",
        content:
          found.length > 0
            ? `${found.length} тохирох зар олдлоо:`
            : "Тохирох зар олдсонгүй. Өөрөөр хайж үзнэ үү.",
        listings: found.length > 0 ? found : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      onListingsChange(found, true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}e`, role: "assistant", content: "Алдаа гарлаа. Дахин оролдоно уу." },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">AI Хайлт</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">Чатлах замаар хайлт хийнэ</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="bg-blue-600 text-white text-xs px-3 py-2 rounded-2xl rounded-tr-sm max-w-[88%] leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-2 max-w-full min-w-0">
                <div className="bg-white border border-gray-200 text-gray-800 text-xs px-3 py-2 rounded-2xl rounded-tl-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                  {msg.content}
                </div>
                {msg.listings && msg.listings.length > 0 && (
                  <div className="space-y-1.5 pl-1">
                    {msg.listings.slice(0, 3).map((l) => (
                      <MiniListingCard key={l.id} listing={l} />
                    ))}
                    {msg.listings.length > 3 && (
                      <p className="text-[10px] text-gray-400 pl-1">
                        болон {msg.listings.length - 3} зар зүүн талд харагдана
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && <LoadingBubble />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Хайлт хийх..."
            disabled={isLoading}
            className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 min-w-0"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">Enter дарж илгээнэ</p>
      </div>
    </div>
  );
}
