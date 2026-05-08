import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/format.dart';
import '../../shared/models/listing.dart';
import 'buyer_agent_repository.dart';

sealed class _Msg {
  const _Msg();
}

class _UserMsg extends _Msg {
  final String text;
  const _UserMsg(this.text);
}

class _AssistantMsg extends _Msg {
  String text;
  bool streaming;
  _AssistantMsg(this.text, {this.streaming = false});
}

class _ToolMsg extends _Msg {
  final String name;
  final Map<String, dynamic> arguments;
  Map<String, dynamic>? result;
  bool running;
  _ToolMsg({required this.name, required this.arguments}) : running = true;
}

class _ChatState {
  final List<_Msg> messages;
  final String? conversationId;
  final bool sending;
  const _ChatState({
    this.messages = const [],
    this.conversationId,
    this.sending = false,
  });

  _ChatState copyWith({
    List<_Msg>? messages,
    String? conversationId,
    bool? sending,
  }) =>
      _ChatState(
        messages: messages ?? this.messages,
        conversationId: conversationId ?? this.conversationId,
        sending: sending ?? this.sending,
      );
}

class _ChatNotifier extends StateNotifier<_ChatState> {
  _ChatNotifier(this._ref)
      : super(_ChatState(messages: [
          _AssistantMsg(
            'Сайн уу! Би таны AI зуучлагч. Хайж байгаа байр, төсөв, дүүргээ хэлээрэй.',
          ),
        ]));
  final Ref _ref;
  StreamSubscription<AgentEvent>? _sub;

  Future<void> send(String text) async {
    final t = text.trim();
    if (t.isEmpty || state.sending) return;

    final pending = _AssistantMsg('', streaming: true);
    state = state.copyWith(
      sending: true,
      messages: [...state.messages, _UserMsg(t), pending],
    );

    final stream = _ref
        .read(buyerAgentRepositoryProvider)
        .chat(conversationId: state.conversationId, message: t);

    _sub = stream.listen(
      (event) {
        switch (event) {
          case AgentConversation(:final conversationId):
            state = state.copyWith(conversationId: conversationId);
          case AgentToken(:final text):
            pending.text += text;
            state = state.copyWith(messages: [...state.messages]);
          case AgentToolCall():
            final tool = _ToolMsg(name: event.name, arguments: event.arguments);
            // Insert tool card right before the streaming bubble
            final msgs = [...state.messages];
            final idx = msgs.indexOf(pending);
            if (idx >= 0) {
              msgs.insert(idx, tool);
            } else {
              msgs.add(tool);
            }
            state = state.copyWith(messages: msgs);
          case AgentToolResult():
            for (final m in state.messages.reversed) {
              if (m is _ToolMsg && m.running && m.name == event.name) {
                m
                  ..running = false
                  ..result = event.result;
                break;
              }
            }
            state = state.copyWith(messages: [...state.messages]);
          case AgentDone():
            pending.streaming = false;
            state = state.copyWith(sending: false, messages: [...state.messages]);
          case AgentError(:final message):
            pending
              ..text = pending.text.isEmpty ? 'Алдаа: $message' : pending.text
              ..streaming = false;
            state = state.copyWith(sending: false, messages: [...state.messages]);
        }
      },
      onError: (Object e) {
        pending
          ..text = pending.text.isEmpty ? 'Сүлжээний алдаа: $e' : pending.text
          ..streaming = false;
        state = state.copyWith(sending: false, messages: [...state.messages]);
      },
      onDone: () {
        if (state.sending) {
          pending.streaming = false;
          state = state.copyWith(sending: false, messages: [...state.messages]);
        }
      },
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final _chatProvider =
    StateNotifierProvider.autoDispose<_ChatNotifier, _ChatState>((ref) {
  return _ChatNotifier(ref);
});

class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});
  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send([String? text]) async {
    final t = (text ?? _input.text).trim();
    if (t.isEmpty) return;
    _input.clear();
    await ref.read(_chatProvider.notifier).send(t);
    _scrollToEnd();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(_chatProvider, (_, __) => _scrollToEnd());
    final state = ref.watch(_chatProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(children: const [
          CircleAvatar(child: Icon(Icons.auto_awesome)),
          SizedBox(width: 10),
          Text('AI Зуучлагч'),
        ]),
      ),
      body: Column(children: [
        Expanded(
          child: ListView.builder(
            controller: _scroll,
            padding: const EdgeInsets.all(16),
            itemCount: state.messages.length,
            itemBuilder: (_, i) => _Bubble(msg: state.messages[i]),
          ),
        ),
        if (!state.sending) _SuggestedChips(onTap: _send),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _input,
                  textInputAction: TextInputAction.send,
                  enabled: !state.sending,
                  onSubmitted: (_) => _send(),
                  decoration: const InputDecoration(hintText: 'Юу хайх вэ?'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: state.sending ? null : () => _send(),
                icon: state.sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _SuggestedChips extends StatelessWidget {
  const _SuggestedChips({required this.onTap});
  final Future<void> Function(String) onTap;
  static const _suggestions = [
    '2 өрөө, төв байршилтай',
    'Хан-Уул, 300 саяас доош',
    'Метро ойр, түрээслэх',
  ];
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _suggestions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => ActionChip(
          label: Text(_suggestions[i]),
          onPressed: () => onTap(_suggestions[i]),
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.msg});
  final _Msg msg;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return switch (msg) {
      _UserMsg(text: final t) => Align(
          alignment: Alignment.centerRight,
          child: Container(
            margin: const EdgeInsets.only(left: 60, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: scheme.primary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(t, style: TextStyle(color: scheme.onPrimary)),
          ),
        ),
      _AssistantMsg(text: final t, streaming: final s) => Align(
          alignment: Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(right: 40, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
            ),
            child: t.isEmpty && s
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(t),
          ),
        ),
      _ToolMsg() => _ToolCard(tool: msg as _ToolMsg),
    };
  }
}

class _ToolCard extends StatelessWidget {
  const _ToolCard({required this.tool});
  final _ToolMsg tool;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: scheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(_iconForTool(tool.name), size: 18, color: scheme.onTertiaryContainer),
              const SizedBox(width: 6),
              Text(_labelForTool(tool.name),
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: scheme.onTertiaryContainer)),
              const Spacer(),
              if (tool.running)
                const SizedBox(
                  height: 14,
                  width: 14,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ]),
            if (!tool.running && tool.name == 'search_listings')
              _SearchListingsResult(result: tool.result ?? const {}),
            if (!tool.running && tool.name == 'draft_offer')
              _DraftOfferResult(result: tool.result ?? const {}),
            if (!tool.running && tool.name == 'schedule_viewing')
              _ScheduleViewingResult(result: tool.result ?? const {}),
          ],
        ),
      ),
    );
  }

  IconData _iconForTool(String name) => switch (name) {
        'search_listings' => Icons.search,
        'draft_offer' => Icons.handshake_outlined,
        'schedule_viewing' => Icons.calendar_today_outlined,
        _ => Icons.bolt_outlined,
      };

  String _labelForTool(String name) => switch (name) {
        'search_listings' => 'Зар хайж байна',
        'draft_offer' => 'Санал бичиж байна',
        'schedule_viewing' => 'Үзэх цаг товлож байна',
        _ => name,
      };
}

class _SearchListingsResult extends StatelessWidget {
  const _SearchListingsResult({required this.result});
  final Map<String, dynamic> result;

  @override
  Widget build(BuildContext context) {
    if (result['ok'] == false) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text('Алдаа: ${result['error']}'),
      );
    }
    final raw = (result['listings'] as List?) ?? const [];
    final listings = raw
        .whereType<Map<String, dynamic>>()
        .map(Listing.fromJson)
        .toList();
    if (listings.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text('Тохирох зар олдсонгүй.'),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: SizedBox(
        height: 170,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: listings.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) => _MiniListingCard(listing: listings[i]),
        ),
      ),
    );
  }
}

class _MiniListingCard extends StatelessWidget {
  const _MiniListingCard({required this.listing});
  final Listing listing;
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      child: Card(
        clipBehavior: Clip.antiAlias,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: () => GoRouter.of(context).push('/listing/${listing.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 90,
                width: double.infinity,
                child: listing.coverImage != null
                    ? CachedNetworkImage(
                        imageUrl: listing.coverImage!, fit: BoxFit.cover)
                    : Container(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        child: const Icon(Icons.image_outlined),
                      ),
              ),
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(formatMnt(listing.price),
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(listing.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DraftOfferResult extends StatelessWidget {
  const _DraftOfferResult({required this.result});
  final Map<String, dynamic> result;
  @override
  Widget build(BuildContext context) {
    if (result['ok'] == false) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text('Алдаа: ${result['error']}'),
      );
    }
    final amount = result['amount'] as num?;
    final title = result['listing_title'] as String?;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title ?? '—', style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Санал: ${formatMnt(amount)}'),
          const SizedBox(height: 8),
          Row(children: [
            FilledButton(
              onPressed: () => GoRouter.of(context).push('/offers'),
              child: const Text('Үзэх'),
            ),
          ]),
        ],
      ),
    );
  }
}

class _ScheduleViewingResult extends StatelessWidget {
  const _ScheduleViewingResult({required this.result});
  final Map<String, dynamic> result;
  @override
  Widget build(BuildContext context) {
    if (result['ok'] == false) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text('Алдаа: ${result['error']}'),
      );
    }
    final slots = (result['slots'] as List?) ?? const [];
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final s in slots)
            Chip(label: Text(s.toString())),
        ],
      ),
    );
  }
}
