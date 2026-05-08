import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/format.dart';
import '../../shared/models/listing.dart';
import '../listing/listing_repository.dart';
import 'listings_map.dart';

final _viewModeProvider = StateProvider<_ViewMode>((_) => _ViewMode.list);

enum _ViewMode { list, map }

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(publicListingsProvider);
    final mode = ref.watch(_viewModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Зар'),
        actions: [
          IconButton(
            tooltip: mode == _ViewMode.list ? 'Газрын зураг' : 'Жагсаалт',
            icon: Icon(mode == _ViewMode.list
                ? Icons.map_outlined
                : Icons.list_alt_outlined),
            onPressed: () => ref.read(_viewModeProvider.notifier).state =
                mode == _ViewMode.list ? _ViewMode.map : _ViewMode.list,
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/chat'),
        icon: const Icon(Icons.auto_awesome),
        label: const Text('AI зуучлагч'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(error: e),
        data: (items) => items.isEmpty
            ? const _EmptyView()
            : mode == _ViewMode.map
                ? ListingsMap(listings: items)
                : RefreshIndicator(
                    onRefresh: () async =>
                        ref.refresh(publicListingsProvider.future),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                      itemCount: items.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, i) {
                        if (i == 0) return const _AiNudgeBanner();
                        return _ListingCard(listing: items[i - 1]);
                      },
                    ),
                  ),
      ),
      bottomNavigationBar: _BottomNav(),
    );
  }
}

class _AiNudgeBanner extends StatelessWidget {
  const _AiNudgeBanner();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.primaryContainer,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => GoRouter.of(context).push('/chat'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: scheme.primary,
                child: Icon(Icons.auto_awesome, color: scheme.onPrimary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AI зуучлагчтайгаа ярьж эхлэх',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text('"Хан-Уул, 2 өрөө, 300 саяас доош"',
                        style: TextStyle(
                            color:
                                scheme.onPrimaryContainer.withValues(alpha: 0.7))),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, color: scheme.onPrimaryContainer, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _ListingCard extends StatelessWidget {
  const _ListingCard({required this.listing});
  final Listing listing;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () => GoRouter.of(context).push('/listing/${listing.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 10,
              child: listing.coverImage != null
                  ? CachedNetworkImage(
                      imageUrl: listing.coverImage!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => const _Placeholder(),
                    )
                  : const _Placeholder(),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(formatMnt(listing.price),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(listing.title,
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 12,
                    children: [
                      if (listing.rooms != null)
                        _Chip(icon: Icons.bed_outlined, label: '${listing.rooms} өрөө'),
                      if (listing.areaSqm != null)
                        _Chip(icon: Icons.straighten, label: '${listing.areaSqm} м²'),
                      if (listing.district != null)
                        _Chip(icon: Icons.place_outlined, label: listing.district!),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
      const SizedBox(width: 4),
      Text(label,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
    ]);
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();
  @override
  Widget build(BuildContext context) => Container(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: const Center(child: Icon(Icons.image_outlined, size: 48)),
      );
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();
  @override
  Widget build(BuildContext context) => ListView(
        children: const [
          SizedBox(height: 120),
          Icon(Icons.home_outlined, size: 64),
          SizedBox(height: 12),
          Center(child: Text('Зар олдсонгүй')),
        ],
      );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error});
  final Object error;
  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.error_outline, size: 56),
          const SizedBox(height: 12),
          Text('$error', textAlign: TextAlign.center),
        ],
      );
}

class _BottomNav extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    int idx = 0;
    if (loc.startsWith('/inquiries')) idx = 1;
    if (loc.startsWith('/sell')) idx = 2;
    return NavigationBar(
      selectedIndex: idx,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Нүүр'),
        NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Хүсэлт'),
        NavigationDestination(icon: Icon(Icons.add_box_outlined), label: 'Зарах'),
      ],
      onDestinationSelected: (i) {
        if (i == 0) GoRouter.of(context).go('/home');
        if (i == 1) GoRouter.of(context).go('/inquiries');
        if (i == 2) GoRouter.of(context).go('/sell');
      },
    );
  }
}
