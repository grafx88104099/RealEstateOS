import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/format.dart';
import 'offers_repository.dart';

class OffersScreen extends ConsumerWidget {
  const OffersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(offersListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Саналууд')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(offersListProvider.future),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 80),
              const Icon(Icons.error_outline, size: 56),
              const SizedBox(height: 12),
              Text('$e', textAlign: TextAlign.center),
            ],
          ),
          data: (offers) => offers.isEmpty
              ? ListView(
                  padding: const EdgeInsets.all(24),
                  children: const [
                    SizedBox(height: 80),
                    Icon(Icons.handshake_outlined, size: 64),
                    SizedBox(height: 12),
                    Center(child: Text('Одоохондоо санал алга')),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: offers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _OfferCard(offer: offers[i]),
                ),
        ),
      ),
    );
  }
}

class _OfferCard extends ConsumerWidget {
  const _OfferCard({required this.offer});
  final Offer offer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final isAi = offer.createdBy == 'ai';
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              if (isAi)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Icon(Icons.auto_awesome, size: 16, color: scheme.primary),
                ),
              Expanded(
                child: Text(offer.listingTitle ?? '—',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              _StatusChip(status: offer.status),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Text(formatMnt(offer.amount),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700)),
              const SizedBox(width: 8),
              if (offer.listingPrice != null)
                Text('/ зар: ${formatMnt(offer.listingPrice)}',
                    style: TextStyle(color: scheme.onSurfaceVariant)),
            ]),
            if (offer.message != null && offer.message!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(offer.message!),
            ],
            const SizedBox(height: 12),
            if (_isPending(offer.status))
              Row(children: [
                FilledButton(
                  onPressed: () => _act(context, ref, 'accepted'),
                  child: const Text('Зөвшөөрөх'),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => _counter(context, ref),
                  child: const Text('Counter'),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => _act(context, ref, 'rejected'),
                  child: const Text('Татгалзах'),
                ),
              ]),
          ],
        ),
      ),
    );
  }

  bool _isPending(String s) =>
      s == 'pending_seller_ai' || s == 'pending_seller_review' || s == 'draft';

  Future<void> _act(BuildContext context, WidgetRef ref, String status) async {
    try {
      await ref.read(offersRepositoryProvider).updateStatus(offer.id, status);
      ref.invalidate(offersListProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Алдаа: $e')),
        );
      }
    }
  }

  Future<void> _counter(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController(text: offer.amount.toString());
    final amount = await showDialog<num?>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Counter санал'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Шинэ дүн (₮)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Болих')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, num.tryParse(controller.text)),
            child: const Text('Илгээх'),
          ),
        ],
      ),
    );
    if (amount == null || amount <= 0) return;
    try {
      await ref
          .read(offersRepositoryProvider)
          .updateStatus(offer.id, 'countered', counterAmount: amount);
      ref.invalidate(offersListProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Алдаа: $e')),
        );
      }
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'accepted' => ('Зөвшөөрсөн', Colors.green),
      'rejected' => ('Татгалзсан', Colors.red),
      'countered' => ('Counter', Colors.orange),
      'withdrawn' => ('Татаж авсан', Colors.grey),
      'expired' => ('Хугацаа дууссан', Colors.grey),
      'draft' => ('Ноорог', Colors.grey),
      'pending_seller_ai' => ('AI хариу хүлээж байна', Colors.blue),
      'pending_seller_review' => ('Хүлээгдэж байна', Colors.blue),
      _ => (status, Colors.grey),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 11)),
    );
  }
}
