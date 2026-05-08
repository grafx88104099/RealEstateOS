import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'viewings_repository.dart';

class ViewingsScreen extends ConsumerWidget {
  const ViewingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(viewingsListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Үзлэгүүд')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(viewingsListProvider.future),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('$e')),
          data: (vs) => vs.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 80),
                  Icon(Icons.calendar_today_outlined, size: 64),
                  SizedBox(height: 12),
                  Center(child: Text('Үзлэг товлогоогүй байна')),
                ])
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: vs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _ViewingCard(viewing: vs[i]),
                ),
        ),
      ),
    );
  }
}

class _ViewingCard extends ConsumerWidget {
  const _ViewingCard({required this.viewing});
  final Viewing viewing;

  String _fmt(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('MM-dd HH:mm').format(dt.toLocal());
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final isAi = viewing.createdBy == 'ai';
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
                child: Text(viewing.listingTitle ?? '—',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              Text(viewing.status,
                  style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12)),
            ]),
            const SizedBox(height: 10),
            if (viewing.confirmedAt != null)
              Text('Баталгаажсан: ${DateFormat('yyyy-MM-dd HH:mm').format(viewing.confirmedAt!.toLocal())}')
            else if (viewing.proposedSlots.isNotEmpty)
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final s in viewing.proposedSlots)
                    ActionChip(
                      label: Text(_fmt(s)),
                      onPressed: viewing.status == 'proposed'
                          ? () async {
                              try {
                                await ref
                                    .read(viewingsRepositoryProvider)
                                    .confirm(viewing.id, s);
                                ref.invalidate(viewingsListProvider);
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Алдаа: $e')),
                                  );
                                }
                              }
                            }
                          : null,
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
