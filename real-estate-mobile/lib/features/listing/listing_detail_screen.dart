import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/format.dart';
import 'listing_repository.dart';

class ListingDetailScreen extends ConsumerWidget {
  const ListingDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(listingByIdProvider(id));
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (listing) => CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 280,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                background: listing.coverImage != null
                    ? CachedNetworkImage(
                        imageUrl: listing.coverImage!,
                        fit: BoxFit.cover,
                      )
                    : Container(color: scheme.surfaceContainerHighest),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList.list(children: [
                Text(formatMnt(listing.price),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(listing.title,
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                Wrap(spacing: 16, runSpacing: 8, children: [
                  if (listing.rooms != null)
                    _Stat(icon: Icons.bed_outlined, label: '${listing.rooms} өрөө'),
                  if (listing.areaSqm != null)
                    _Stat(icon: Icons.straighten, label: '${listing.areaSqm} м²'),
                  if (listing.district != null)
                    _Stat(icon: Icons.place_outlined, label: listing.district!),
                ]),
                const SizedBox(height: 24),
                if (listing.description != null) ...[
                  Text('Тайлбар',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(listing.description!),
                  const SizedBox(height: 24),
                ],
                Card(
                  color: scheme.primaryContainer,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Icon(Icons.auto_awesome, color: scheme.primary),
                          const SizedBox(width: 8),
                          Text('AI санал болгож байна',
                              style: Theme.of(context).textTheme.titleSmall),
                        ]),
                        const SizedBox(height: 8),
                        const Text(
                          'Энэ зар таны хайлттай нийцэж байна. Зуучлагчтайгаа ярилцаад санал тавиарай.',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () => context.push('/chat'),
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('AI зуучлагчтай ярих'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Phase 2-д нэмэгдэнэ')),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.handshake_outlined),
                  label: const Text('Санал тавих'),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 18),
      const SizedBox(width: 6),
      Text(label),
    ]);
  }
}
