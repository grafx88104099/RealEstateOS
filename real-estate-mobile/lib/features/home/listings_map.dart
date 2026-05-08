import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/utils/format.dart';
import '../../shared/models/listing.dart';

/// Ulaanbaatar centre — fallback when no listings have coordinates yet.
const _ulaanbaatar = LatLng(47.9184, 106.9177);

class ListingsMap extends StatefulWidget {
  const ListingsMap({super.key, required this.listings});
  final List<Listing> listings;

  @override
  State<ListingsMap> createState() => _ListingsMapState();
}

class _ListingsMapState extends State<ListingsMap> {
  final _mapController = MapController();
  Listing? _selected;

  List<Listing> get _withCoords =>
      widget.listings.where((l) => l.lat != null && l.lng != null).toList();

  LatLng get _center {
    final pts = _withCoords;
    if (pts.isEmpty) return _ulaanbaatar;
    final avgLat =
        pts.map((l) => l.lat!).reduce((a, b) => a + b) / pts.length;
    final avgLng =
        pts.map((l) => l.lng!).reduce((a, b) => a + b) / pts.length;
    return LatLng(avgLat, avgLng);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final pts = _withCoords;

    return Stack(children: [
      FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: _center,
          initialZoom: pts.isEmpty ? 11 : 12,
          minZoom: 8,
          maxZoom: 18,
          onTap: (_, __) => setState(() => _selected = null),
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'mn.realestateos.real_estate_mobile',
            maxNativeZoom: 19,
          ),
          MarkerLayer(
            markers: [
              for (final l in pts)
                Marker(
                  point: LatLng(l.lat!, l.lng!),
                  width: 76,
                  height: 36,
                  child: GestureDetector(
                    onTap: () => setState(() => _selected = l),
                    child: _PriceMarker(
                      price: l.price,
                      selected: _selected?.id == l.id,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      if (pts.isEmpty)
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Material(
            elevation: 0,
            color: scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
            child: const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Координаттай зар одоохондоо алга. Шинэ зар оруулахад энд харагдана.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      if (_selected != null)
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: _SelectedListingCard(
            listing: _selected!,
            onClose: () => setState(() => _selected = null),
          ),
        ),
    ]);
  }
}

class _PriceMarker extends StatelessWidget {
  const _PriceMarker({required this.price, required this.selected});
  final num? price;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = selected ? scheme.primary : scheme.surface;
    final fg = selected ? scheme.onPrimary : scheme.onSurface;
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.4)),
        boxShadow: const [
          BoxShadow(blurRadius: 4, color: Colors.black26, offset: Offset(0, 2)),
        ],
      ),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Text(
        formatMnt(price),
        style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 12),
      ),
    );
  }
}

class _SelectedListingCard extends StatelessWidget {
  const _SelectedListingCard({required this.listing, required this.onClose});
  final Listing listing;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () => GoRouter.of(context).push('/listing/${listing.id}'),
        child: Row(children: [
          SizedBox(
            width: 96,
            height: 96,
            child: listing.coverImage != null
                ? CachedNetworkImage(
                    imageUrl: listing.coverImage!, fit: BoxFit.cover)
                : Container(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: const Icon(Icons.image_outlined),
                  ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(formatMnt(listing.price),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(listing.title,
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (listing.rooms != null) '${listing.rooms} өрөө',
                      if (listing.areaSqm != null) '${listing.areaSqm} м²',
                      if (listing.district != null) listing.district!,
                    ].join(' · '),
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: onClose,
          ),
        ]),
      ),
    );
  }
}
