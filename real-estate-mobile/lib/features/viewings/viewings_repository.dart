import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/dio_client.dart';

class Viewing {
  final String id;
  final List<String> proposedSlots;
  final DateTime? confirmedAt;
  final String status;
  final String? listingTitle;
  final String createdBy;

  Viewing({
    required this.id,
    required this.proposedSlots,
    this.confirmedAt,
    required this.status,
    this.listingTitle,
    this.createdBy = 'human',
  });

  factory Viewing.fromJson(Map<String, dynamic> json) {
    final listing = json['listing'] as Map?;
    final raw = json['proposed_slots'];
    final slots = raw is List
        ? raw.map((e) => e.toString()).toList()
        : const <String>[];
    return Viewing(
      id: json['id'].toString(),
      proposedSlots: slots,
      confirmedAt: json['confirmed_at'] != null
          ? DateTime.tryParse(json['confirmed_at'] as String)
          : null,
      status: (json['status'] as String?) ?? 'proposed',
      listingTitle: listing?['title'] as String?,
      createdBy: (json['created_by'] as String?) ?? 'human',
    );
  }
}

class ViewingsRepository {
  ViewingsRepository(this._dio);
  final Dio _dio;

  Future<List<Viewing>> list() async {
    final res = await _dio.get('/api/viewings');
    final items = ((res.data as Map<String, dynamic>)['viewings'] as List?) ?? const [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(Viewing.fromJson)
        .toList();
  }

  Future<Viewing> confirm(String id, String slot) async {
    final res = await _dio.patch('/api/viewings/$id', data: {
      'status': 'confirmed',
      'confirmed_at': slot,
    });
    final v = (res.data as Map<String, dynamic>)['viewing'] as Map<String, dynamic>;
    return Viewing.fromJson(v);
  }

  Future<Viewing> cancel(String id) async {
    final res = await _dio.patch('/api/viewings/$id', data: {'status': 'cancelled'});
    final v = (res.data as Map<String, dynamic>)['viewing'] as Map<String, dynamic>;
    return Viewing.fromJson(v);
  }
}

final viewingsRepositoryProvider = Provider<ViewingsRepository>((ref) {
  return ViewingsRepository(ref.watch(dioProvider));
});

final viewingsListProvider =
    FutureProvider.autoDispose<List<Viewing>>((ref) async {
  return ref.watch(viewingsRepositoryProvider).list();
});
