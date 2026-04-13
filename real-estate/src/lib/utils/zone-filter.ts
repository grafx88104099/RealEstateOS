import type { SelectedZone } from "@/components/home/zone-map";
import type { PublicListing } from "@/components/home/listing-card";
import { DISTRICT_COORDS } from "@/lib/constants/districts";

// Haversine — хоёр цэгийн хоорондох км зай
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterByZone(
  listings: PublicListing[],
  zone: SelectedZone | null
): PublicListing[] {
  if (!zone) return listings;

  const { center, radiusKm } = zone.circle;
  return listings.filter((l) => {
    const coords = l.district ? DISTRICT_COORDS[l.district] : null;
    if (!coords) return false;
    return distanceKm(center[0], center[1], coords[0], coords[1]) <= radiusKm;
  });
}
