import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

/// Parsed SSE event from a `data: <json>\n\n` stream.
class SseEvent {
  final Map<String, dynamic> data;
  SseEvent(this.data);
}

/// POSTs to [path] with SSE response and yields parsed JSON events.
/// Stops cleanly on `data: [DONE]`.
Stream<SseEvent> postSse({
  required Dio dio,
  required String path,
  required Map<String, dynamic> body,
}) async* {
  final controller = StreamController<SseEvent>();

  unawaited(() async {
    try {
      final response = await dio.post<ResponseBody>(
        path,
        data: body,
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
        ),
      );

      final stream = response.data?.stream;
      if (stream == null) {
        await controller.close();
        return;
      }

      String buffer = '';
      await for (final chunk in stream) {
        buffer += utf8.decode(chunk, allowMalformed: true);
        while (true) {
          final idx = buffer.indexOf('\n\n');
          if (idx < 0) break;
          final raw = buffer.substring(0, idx);
          buffer = buffer.substring(idx + 2);

          for (final line in raw.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            final payload = line.substring(6).trim();
            if (payload.isEmpty) continue;
            if (payload == '[DONE]') {
              await controller.close();
              return;
            }
            try {
              final parsed = jsonDecode(payload) as Map<String, dynamic>;
              controller.add(SseEvent(parsed));
            } catch (_) {
              // skip malformed line
            }
          }
        }
      }
      await controller.close();
    } catch (e, st) {
      controller.addError(e, st);
      await controller.close();
    }
  }());

  yield* controller.stream;
}
