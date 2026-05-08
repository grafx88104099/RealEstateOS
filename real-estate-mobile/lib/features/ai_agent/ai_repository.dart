import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/listing.dart';

class AiSearchResult {
  final List<Listing> listings;
  final String? summary;
  AiSearchResult({required this.listings, this.summary});
}

class AiRepository {
  AiRepository(this._dio);
  final Dio _dio;

  Future<AiSearchResult> search(String query) async {
    final res = await _dio.post(
      '/api/ai/search',
      data: {'query': query, 'limit': 6},
    );
    final data = res.data as Map<String, dynamic>;
    final list = (data['results'] ?? data['listings'] ?? const []) as List;
    return AiSearchResult(
      listings: list
          .whereType<Map<String, dynamic>>()
          .map(Listing.fromJson)
          .toList(),
      summary: data['summary'] as String?,
    );
  }

  Future<String> generateDescription({
    required Map<String, dynamic> attributes,
  }) async {
    final res = await _dio.post(
      '/api/ai/generate-description',
      data: attributes,
    );
    final data = res.data;
    return (data is Map ? data['description'] : data).toString();
  }
}

final aiRepositoryProvider = Provider<AiRepository>((ref) {
  return AiRepository(ref.watch(dioProvider));
});
