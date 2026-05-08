class Listing {
  final String id;
  final String title;
  final String? description;
  final num? price;
  final String? listingType; // sale | rent
  final String? propertyType; // apartment, house, ...
  final String? district;
  final String? address;
  final int? rooms;
  final num? areaSqm;
  final String? coverImage;
  final List<String> images;
  final double? lat;
  final double? lng;
  final DateTime? createdAt;

  const Listing({
    required this.id,
    required this.title,
    this.description,
    this.price,
    this.listingType,
    this.propertyType,
    this.district,
    this.address,
    this.rooms,
    this.areaSqm,
    this.coverImage,
    this.images = const [],
    this.lat,
    this.lng,
    this.createdAt,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    final imgs = (json['images'] as List?)
            ?.map((e) => e is Map ? e['url']?.toString() : e?.toString())
            .whereType<String>()
            .toList() ??
        const <String>[];
    return Listing(
      id: json['id'].toString(),
      title: (json['title'] ?? '') as String,
      description: json['description'] as String?,
      price: json['price'] as num?,
      listingType: json['listing_type'] as String?,
      propertyType: json['property_type'] as String?,
      district: json['district'] as String?,
      address: json['address'] as String?,
      rooms: (json['rooms'] as num?)?.toInt(),
      areaSqm: json['area_sqm'] as num?,
      coverImage: json['cover_image'] as String? ??
          (imgs.isNotEmpty ? imgs.first : null),
      images: imgs,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}
