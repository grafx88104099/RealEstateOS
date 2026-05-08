import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/listing.dart';

class ListingRepository {
  ListingRepository(this._dio);
  final Dio _dio;

  Future<List<Listing>> publicList({
    String? district,
    String? listingType,
    String? propertyType,
    int? maxPrice,
    int? minRooms,
    int limit = 20,
    int offset = 0,
  }) async {
    final res = await _dio.get(
      '/api/public/listings',
      queryParameters: {
        if (district != null) 'district': district,
        if (listingType != null) 'listing_type': listingType,
        if (propertyType != null) 'property_type': propertyType,
        if (maxPrice != null) 'max_price': maxPrice,
        if (minRooms != null) 'min_rooms': minRooms,
        'limit': limit,
        'offset': offset,
      },
    );
    final data = res.data;
    final items = (data is Map && data['listings'] is List)
        ? data['listings'] as List
        : (data is List ? data : const []);
    return items
        .whereType<Map<String, dynamic>>()
        .map(Listing.fromJson)
        .toList();
  }

  Future<Listing> getById(String id) async {
    final res = await _dio.get('/api/public/listings/$id');
    final data = res.data;
    final json = (data is Map && data['listing'] is Map)
        ? Map<String, dynamic>.from(data['listing'] as Map)
        : Map<String, dynamic>.from(data as Map);
    return Listing.fromJson(json);
  }
}

final listingRepositoryProvider = Provider<ListingRepository>((ref) {
  return ListingRepository(ref.watch(dioProvider));
});

final publicListingsProvider =
    FutureProvider.autoDispose<List<Listing>>((ref) async {
  return ref.watch(listingRepositoryProvider).publicList();
});

final listingByIdProvider =
    FutureProvider.autoDispose.family<Listing, String>((ref, id) async {
  return ref.watch(listingRepositoryProvider).getById(id);
});
