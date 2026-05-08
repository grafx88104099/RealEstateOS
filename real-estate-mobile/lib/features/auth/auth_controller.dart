import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/api/dio_client.dart';
import '../../core/api/supabase_client.dart';

enum UserMode { buyer, seller, both }

class AuthController extends StateNotifier<AsyncValue<void>> {
  AuthController(this._ref) : super(const AsyncValue.data(null));
  final Ref _ref;

  SupabaseClient get _supabase => _ref.read(supabaseProvider);

  Future<void> signIn({required String email, required String password}) async {
    state = const AsyncValue.loading();
    try {
      await _supabase.auth.signInWithPassword(email: email, password: password);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    required UserMode mode,
  }) async {
    state = const AsyncValue.loading();
    try {
      // Backend register endpoint creates the auth user with email_confirm=true,
      // inserts the public.users row, and assigns role/tenant. Then we sign in
      // immediately so the client gets a session.
      final dio = _ref.read(dioProvider);
      try {
        await dio.post('/api/auth/register', data: {
          'email': email,
          'password': password,
          'full_name': fullName,
          'mode': 'consumer',
        });
      } on DioException catch (e) {
        final msg = e.response?.data is Map
            ? (e.response?.data['error']?.toString() ?? e.message)
            : e.message;
        throw Exception(msg ?? 'Бүртгэл амжилтгүй');
      }

      await _supabase.auth.signInWithPassword(email: email, password: password);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<void>>((ref) {
  return AuthController(ref);
});
