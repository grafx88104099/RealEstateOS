let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY дутуу байна"));
  }

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps зөвхөн client-side ачаалагдана"));
      return;
    }

    if (window.google?.maps) {
      resolve(window.google);
      return;
    }

    const callbackName = "__nemiGmapsInit";
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      resolve(window.google);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "marker",
      loading: "async",
      callback: callbackName,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps script ачаалагдсангүй"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
