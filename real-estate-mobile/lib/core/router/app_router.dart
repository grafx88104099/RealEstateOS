import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/ai_agent/chat_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/inquiries/inquiries_screen.dart';
import '../../features/listing/listing_detail_screen.dart';
import '../../features/offers/offers_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/sell/sell_wizard_screen.dart';
import '../../features/viewings/viewings_screen.dart';
import '../api/supabase_client.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/onboarding',
    redirect: (context, state) {
      final loggedIn = auth.maybeWhen(
        data: (s) => s.session != null,
        orElse: () => ref.read(supabaseProvider).auth.currentSession != null,
      );
      final loc = state.matchedLocation;
      final atAuth = loc == '/login' ||
          loc == '/register' ||
          loc == '/onboarding';

      if (!loggedIn && !atAuth) return '/onboarding';
      if (loggedIn && atAuth) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(
        path: '/listing/:id',
        builder: (_, s) =>
            ListingDetailScreen(id: s.pathParameters['id']!),
      ),
      GoRoute(path: '/chat', builder: (_, __) => const AiChatScreen()),
      GoRoute(path: '/inquiries', builder: (_, __) => const InquiriesScreen()),
      GoRoute(path: '/sell', builder: (_, __) => const SellWizardScreen()),
      GoRoute(path: '/offers', builder: (_, __) => const OffersScreen()),
      GoRoute(path: '/viewings', builder: (_, __) => const ViewingsScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
