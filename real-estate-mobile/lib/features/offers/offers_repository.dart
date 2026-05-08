import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/dio_client.dart';

class Offer {
  final String id;
  final num amount;
  final String status;
  final String? message;
  final String createdBy;
  final DateTime? createdAt;
  final String? listingTitle;
  final num? listingPrice;
  final String? buyerName;

  Offer({
    required this.id,
    required this.amount,
    required this.status,
    this.message,
    this.createdBy = 'human',
    this.createdAt,
    this.listingTitle,
    this.listingPrice,
    this.buyerName,
  });

  factory Offer.fromJson(Map<String, dynamic> json) {
    final listing = json['listing'] as Map?;
    final buyer = json['buyer'] as Map?;
    return Offer(
      id: json['id'].toString(),
      amount: (json['amount'] as num?) ?? 0,
      status: (json['status'] as String?) ?? 'draft',
      message: json['message'] as String?,
      createdBy: (json['created_by'] as String?) ?? 'human',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      listingTitle: listing?['title'] as String?,
      listingPrice: listing?['price'] as num?,
      buyerName: buyer?['full_name'] as String?,
    );
  }
}

class OffersRepository {
  OffersRepository(this._dio);
  final Dio _dio;

  Future<List<Offer>> list({String as = 'auto'}) async {
    final res = await _dio.get('/api/offers', queryParameters: {'as': as});
    final data = res.data as Map<String, dynamic>;
    final items = (data['offers'] as List?) ?? const [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(Offer.fromJson)
        .toList();
  }

  Future<Offer> create({
    required String listingId,
    required num amount,
    String? message,
  }) async {
    final res = await _dio.post('/api/offers', data: {
      'listing_id': listingId,
      'amount': amount,
      if (message != null) 'message': message,
    });
    final data = (res.data as Map<String, dynamic>)['offer'] as Map<String, dynamic>;
    return Offer.fromJson(data);
  }

  Future<Offer> updateStatus(String id, String status, {num? counterAmount}) async {
    final res = await _dio.patch('/api/offers/$id', data: {
      'status': status,
      if (counterAmount != null) 'counter_amount': counterAmount,
    });
    final data = (res.data as Map<String, dynamic>)['offer'] as Map<String, dynamic>;
    return Offer.fromJson(data);
  }
}

final offersRepositoryProvider = Provider<OffersRepository>((ref) {
  return OffersRepository(ref.watch(dioProvider));
});

final offersListProvider =
    FutureProvider.autoDispose<List<Offer>>((ref) async {
  return ref.watch(offersRepositoryProvider).list();
});
