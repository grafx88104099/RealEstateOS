"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

type QrLink = {
  slug: string;
  target_url: string;
  scan_count: number;
  base_url: string;
};

export default function QRManager({ link }: { link: QrLink }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<string>("");
  const [targetUrl, setTargetUrl] = useState(link.target_url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [svgPreview, setSvgPreview] = useState("");

  const qrUrl = `${link.base_url}/go/${link.slug}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 180,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    }
    // SVG-г мөн үүсгэж хадгална
    QRCode.toString(qrUrl, {
      type: "svg",
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
      width: 1000,
    }).then((svg) => {
      svgRef.current = svg;
      setSvgPreview(svg);
    });
  }, [qrUrl]);

  function handleDownloadPng() {
    if (!canvasRef.current) return;
    // Өндөр чанартай PNG (2000x2000)
    QRCode.toCanvas(document.createElement("canvas"), qrUrl, {
      width: 2000,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    }).then((hiResCanvas) => {
      const url = hiResCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${link.slug}.png`;
      a.click();
    });
  }

  function handleDownloadSvg() {
    if (!svgRef.current) return;
    const blob = new Blob([svgRef.current], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${link.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/qr-links/${link.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_url: targetUrl }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Dynamic QR Code</h3>

      <div className="flex gap-6 items-start overflow-hidden">
        {/* QR Code */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="border border-gray-100 rounded-xl p-2 bg-white">
            <canvas ref={canvasRef} />
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownloadSvg}
              className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              SVG татах
            </button>
            <button
              onClick={handleDownloadPng}
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              PNG татах
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">QR холбоос (мөнхийн)</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm text-gray-900 font-mono truncate">{qrUrl}</span>
              <button
                onClick={() => navigator.clipboard.writeText(qrUrl)}
                className="ml-auto text-xs text-blue-600 hover:text-blue-700 shrink-0"
              >
                Хуулах
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Чиглүүлэх URL (солих боломжтой)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                onClick={handleSave}
                disabled={saving || targetUrl === link.target_url}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {saving ? "..." : "Хадгалах"}
              </button>
            </div>
            {saved && <p className="text-xs text-green-600 mt-1">Амжилттай хадгалагдлаа!</p>}
          </div>

          <div className="flex gap-4 pt-2">
            <div className="px-3 py-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Нийт скан</p>
              <p className="text-lg font-bold text-gray-900">{link.scan_count}</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Төлөв</p>
              <p className="text-sm font-medium text-green-600 mt-0.5">Идэвхтэй</p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            QR код нь мөнхийн — хугацаа дуусахгүй. Чиглүүлэх URL-г өөрчилснөөр QR дахин хэвлэхгүйгээр шинэ хуудас руу чиглүүлж болно.
          </p>
        </div>
      </div>
    </div>
  );
}
