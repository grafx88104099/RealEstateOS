import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/supabase_client.dart';
import '../ai_agent/ai_repository.dart';

class SellWizardScreen extends ConsumerStatefulWidget {
  const SellWizardScreen({super.key});

  @override
  ConsumerState<SellWizardScreen> createState() => _SellWizardScreenState();
}

class _SellWizardScreenState extends ConsumerState<SellWizardScreen> {
  int _step = 0;
  final _title = TextEditingController();
  final _district = TextEditingController();
  final _rooms = TextEditingController();
  final _area = TextEditingController();
  final _price = TextEditingController();
  String _description = '';
  bool _generating = false;
  final List<XFile> _photos = [];
  bool _uploading = false;

  @override
  void dispose() {
    for (final c in [_title, _district, _rooms, _area, _price]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickPhotos() async {
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 75, maxWidth: 1920);
    if (picked.isEmpty) return;
    setState(() => _photos.addAll(picked));
  }

  Future<List<String>> _uploadPhotos(String listingId) async {
    if (_photos.isEmpty) return const [];
    final supabase = ref.read(supabaseProvider);
    final urls = <String>[];
    setState(() => _uploading = true);
    try {
      for (var i = 0; i < _photos.length; i++) {
        final f = _photos[i];
        final bytes = await File(f.path).readAsBytes();
        final ext = f.name.split('.').last;
        final path =
            '$listingId/${DateTime.now().millisecondsSinceEpoch}-$i.$ext';
        await supabase.storage.from('listing-images').uploadBinary(path, bytes);
        final url =
            supabase.storage.from('listing-images').getPublicUrl(path);
        urls.add(url);
      }
      return urls;
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _generateDescription() async {
    setState(() => _generating = true);
    try {
      final desc = await ref.read(aiRepositoryProvider).generateDescription(
        attributes: {
          'title': _title.text,
          'district': _district.text,
          'rooms': int.tryParse(_rooms.text),
          'area_sqm': num.tryParse(_area.text),
          'price': num.tryParse(_price.text),
        },
      );
      setState(() => _description = desc);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI алдаа: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _next() async {
    if (_step == 2 && _description.isEmpty) {
      await _generateDescription();
      return;
    }
    if (_step < 3) {
      setState(() => _step += 1);
      return;
    }
    // Final publish step: upload photos to Storage now, listing creation in Phase 3.
    if (_uploading) return;
    try {
      final draftId = 'draft-${DateTime.now().millisecondsSinceEpoch}';
      final urls = await _uploadPhotos(draftId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Зураг ${urls.length} ширхэг хадгалагдлаа.')),
      );
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload алдаа: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Зар нийтлэх')),
      body: Stepper(
        currentStep: _step,
        onStepContinue: _next,
        onStepCancel: _step > 0 ? () => setState(() => _step -= 1) : null,
        controlsBuilder: (ctx, details) => Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Row(
            children: [
              FilledButton(
                onPressed: _generating ? null : details.onStepContinue,
                child: _generating
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(_step == 3 ? 'Нийтлэх' : 'Дараах'),
              ),
              const SizedBox(width: 8),
              if (details.onStepCancel != null)
                TextButton(
                    onPressed: details.onStepCancel, child: const Text('Буцах')),
            ],
          ),
        ),
        steps: [
          Step(
            title: const Text('Үндсэн мэдээлэл'),
            isActive: _step >= 0,
            content: Column(children: [
              TextField(
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'Гарчиг')),
              const SizedBox(height: 8),
              TextField(
                  controller: _district,
                  decoration: const InputDecoration(labelText: 'Дүүрэг')),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                    child: TextField(
                        controller: _rooms,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Өрөө'))),
                const SizedBox(width: 8),
                Expanded(
                    child: TextField(
                        controller: _area,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'м²'))),
              ]),
              const SizedBox(height: 8),
              TextField(
                  controller: _price,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Үнэ (₮)')),
            ]),
          ),
          Step(
            title: const Text('Зураг'),
            isActive: _step >= 1,
            content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (_photos.isEmpty)
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12)),
                  child: const Center(child: Text('Зураг сонгоогүй')),
                )
              else
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _photos.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => Stack(children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(File(_photos[i].path),
                            width: 100, height: 100, fit: BoxFit.cover),
                      ),
                      Positioned(
                        right: 2,
                        top: 2,
                        child: GestureDetector(
                          onTap: () =>
                              setState(() => _photos.removeAt(i)),
                          child: const CircleAvatar(
                            radius: 12,
                            backgroundColor: Colors.black54,
                            child: Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ]),
                  ),
                ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _pickPhotos,
                icon: const Icon(Icons.add_a_photo_outlined),
                label: const Text('Зураг нэмэх'),
              ),
            ]),
          ),
          Step(
            title: const Text('AI тайлбар'),
            isActive: _step >= 2,
            content: Column(children: [
              if (_description.isEmpty)
                Card(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  elevation: 0,
                  child: const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                        'AI таны зард зориулсан тайлбар үүсгэнэ. "Дараах" товч дарна уу.'),
                  ),
                ),
              if (_description.isNotEmpty)
                TextField(
                  controller: TextEditingController(text: _description),
                  maxLines: 6,
                  decoration: const InputDecoration(
                      labelText: 'Тайлбар (засаж болно)'),
                  onChanged: (v) => _description = v,
                ),
            ]),
          ),
          Step(
            title: const Text('Хяналт'),
            isActive: _step >= 3,
            content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_title.text,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text('${_district.text} • ${_rooms.text} өрөө • ${_area.text} м²'),
              Text('₮${_price.text}'),
              const SizedBox(height: 12),
              Text(_description),
            ]),
          ),
        ],
      ),
      bottomNavigationBar: const _SellBottomNav(),
    );
  }
}

class _SellBottomNav extends StatelessWidget {
  const _SellBottomNav();
  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: 2,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Нүүр'),
        NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Хүсэлт'),
        NavigationDestination(icon: Icon(Icons.add_box), label: 'Зарах'),
      ],
      onDestinationSelected: (i) {
        if (i == 0) GoRouter.of(context).go('/home');
        if (i == 1) GoRouter.of(context).go('/inquiries');
      },
    );
  }
}
