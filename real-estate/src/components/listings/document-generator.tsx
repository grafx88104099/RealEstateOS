"use client";

import { useState } from "react";

interface DocumentGeneratorProps {
  listingId: string;
}

const DOC_TYPES = [
  { value: "fact_sheet", label: "Мэдээллийн хуудас", desc: "Property fact sheet" },
  { value: "proposal", label: "Үнийн санал", desc: "Buyer proposal" },
  { value: "contract", label: "Гэрээний ноорог", desc: "Draft contract" },
] as const;

export function DocumentGenerator({ listingId }: DocumentGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<string>("fact_sheet");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [document, setDocument] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setDocument(null);
    try {
      const res = await fetch("/api/ai/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          doc_type: docType,
          buyer_name: buyerName || undefined,
          buyer_phone: buyerPhone || undefined,
          custom_notes: notes || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
        setDocName(data.doc_name);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function copyToClipboard() {
    if (!document) return;
    await navigator.clipboard.writeText(document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        AI баримт бичиг
      </button>
    );
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-indigo-900 text-sm">AI баримт бичиг үүсгэгч</h3>
        <button onClick={() => { setOpen(false); setDocument(null); }} className="text-xs text-gray-400 hover:text-gray-600">Хаах</button>
      </div>

      {!document ? (
        <div className="space-y-3">
          {/* Doc Type */}
          <div className="flex gap-2">
            {DOC_TYPES.map((dt) => (
              <button key={dt.value} onClick={() => setDocType(dt.value)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  docType === dt.value ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
                }`}>
                {dt.label}
              </button>
            ))}
          </div>

          {/* Buyer Info (optional) */}
          {(docType === "contract" || docType === "proposal") && (
            <div className="grid grid-cols-2 gap-3">
              <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Худалдан авагчийн нэр"
                className="border border-indigo-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Утасны дугаар"
                className="border border-indigo-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}

          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Нэмэлт тэмдэглэл (заавал биш)"
            className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />

          <button onClick={generate} disabled={loading}
            className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Үүсгэж байна...
              </span>
            ) : "Үүсгэх"}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-indigo-900">{docName}</span>
            <div className="flex gap-2">
              <button onClick={copyToClipboard}
                className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md transition-colors">
                {copied ? "Хуулсан!" : "Хуулах"}
              </button>
              <button onClick={() => setDocument(null)}
                className="text-xs font-medium text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors">
                Дахин үүсгэх
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-indigo-200 p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{document}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
