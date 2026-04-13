"use client";

import { useState, useRef } from "react";

interface ImageItem {
  id: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
  file_size?: number;
}

interface ImageGalleryProps {
  listingId: string;
  initialImages?: ImageItem[];
}

export function ImageGallery({ listingId, initialImages = [] }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadImages() {
    const res = await fetch(`/api/listings/${listingId}/images`);
    if (res.ok) {
      const data = await res.json();
      setImages(data.images);
    }
  }

  async function handleUpload(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);

    const formData = new FormData();
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) {
        formData.append("files", f);
      }
    }

    try {
      const res = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await loadImages();
      }
    } catch { /* silent */ }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setCover(imageId: string) {
    await fetch(`/api/listings/${listingId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_cover", image_id: imageId }),
    });
    setImages((prev) => prev.map((img) => ({ ...img, is_cover: img.id === imageId })));
  }

  async function deleteImage(imageId: string) {
    await fetch(`/api/listings/${listingId}/images?image_id=${imageId}`, { method: "DELETE" });
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const idx = images.findIndex((img) => img.id === imageId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= images.length) return;

    const newImages = [...images];
    [newImages[idx], newImages[newIdx]] = [newImages[newIdx], newImages[idx]];
    const order = newImages.map((img, i) => ({ id: img.id, sort_order: i }));
    setImages(newImages.map((img, i) => ({ ...img, sort_order: i })));

    await fetch(`/api/listings/${listingId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", order }),
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">Зурагнууд ({images.length})</h3>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
          {uploading ? "Байршуулж байна..." : "+ Зураг нэмэх"}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)} />
      </div>

      {/* Drop zone */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Байршуулж байна...
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5l.75-.75A2.25 2.25 0 019.75 6h4.5a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 013 17.25v-9A2.25 2.25 0 015.25 6H6" />
              </svg>
              <p className="text-sm text-gray-500">Зураг чирж оруулах эсвэл сонгох</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (10MB хүртэл)</p>
            </>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`grid grid-cols-3 gap-3 ${dragOver ? "ring-2 ring-blue-400 ring-offset-2 rounded-lg" : ""}`}
          >
            {images.map((img, idx) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-[4/3]">
                <img src={img.url} alt="" className="w-full h-full object-cover" />

                {/* Cover badge */}
                {img.is_cover && (
                  <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    COVER
                  </span>
                )}

                {/* Hover controls */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {!img.is_cover && (
                    <button onClick={() => setCover(img.id)} title="Cover болгох"
                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </button>
                  )}
                  {idx > 0 && (
                    <button onClick={() => moveImage(img.id, -1)} title="Зүүн"
                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                  )}
                  {idx < images.length - 1 && (
                    <button onClick={() => moveImage(img.id, 1)} title="Баруун"
                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                  )}
                  <button onClick={() => deleteImage(img.id)} title="Устгах"
                    className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {uploading && <p className="text-xs text-gray-400 mt-2 text-center">Байршуулж байна...</p>}
        </>
      )}
    </div>
  );
}
