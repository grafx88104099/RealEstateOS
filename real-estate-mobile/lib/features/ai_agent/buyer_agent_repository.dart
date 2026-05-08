import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/dio_client.dart';
import '../../core/api/sse_client.dart';
import '../../shared/models/listing.dart';

/// Discriminated union for SSE events from `/api/ai/buyer-agent/chat`.
sealed class AgentEvent {}

class AgentConversation extends AgentEvent {
  final String conversationId;
  AgentConversation(this.conversationId);
}

class AgentToken extends AgentEvent {
  final String text;
  AgentToken(this.text);
}

class AgentToolCall extends AgentEvent {
  final String id;
  final String name;
  final Map<String, dynamic> arguments;
  AgentToolCall({required this.id, required this.name, required this.arguments});
}

class AgentToolResult extends AgentEvent {
  final String id;
  final String name;
  final Map<String, dynamic> result;
  AgentToolResult({required this.id, required this.name, required this.result});

  /// If the tool call is `search_listings`, parse out the listings.
  List<Listing> get listings {
    final raw = result['listings'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(Listing.fromJson)
        .toList();
  }
}

class AgentDone extends AgentEvent {
  final String? conversationId;
  AgentDone(this.conversationId);
}

class AgentError extends AgentEvent {
  final String message;
  AgentError(this.message);
}

class BuyerAgentRepository {
  BuyerAgentRepository(this._dio);
  final Dio _dio;

  Stream<AgentEvent> chat({String? conversationId, required String message}) {
    return postSse(
      dio: _dio,
      path: '/api/ai/buyer-agent/chat',
      body: {
        if (conversationId != null) 'conversation_id': conversationId,
        'message': message,
      },
    ).map<AgentEvent>((evt) {
      final type = evt.data['type'] as String?;
      switch (type) {
        case 'conversation':
          return AgentConversation(evt.data['conversation_id'] as String);
        case 'token':
          return AgentToken((evt.data['text'] as String?) ?? '');
        case 'tool_call':
          return AgentToolCall(
            id: evt.data['id'] as String,
            name: evt.data['name'] as String,
            arguments: Map<String, dynamic>.from(
                (evt.data['arguments'] as Map?) ?? const {}),
          );
        case 'tool_result':
          return AgentToolResult(
            id: evt.data['id'] as String,
            name: evt.data['name'] as String,
            result: Map<String, dynamic>.from(
                (evt.data['result'] as Map?) ?? const {}),
          );
        case 'done':
          return AgentDone(evt.data['conversation_id'] as String?);
        case 'error':
        default:
          return AgentError((evt.data['error'] as String?) ?? 'Unknown event');
      }
    });
  }
}

final buyerAgentRepositoryProvider = Provider<BuyerAgentRepository>((ref) {
  return BuyerAgentRepository(ref.watch(dioProvider));
});
