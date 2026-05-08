import 'package:intl/intl.dart';

final _mnt = NumberFormat.currency(locale: 'mn_MN', symbol: '₮', decimalDigits: 0);

String formatMnt(num? amount) {
  if (amount == null) return '—';
  if (amount >= 1000000000) {
    return '₮${(amount / 1000000000).toStringAsFixed(1)} тэрбум';
  }
  if (amount >= 1000000) {
    return '₮${(amount / 1000000).toStringAsFixed(0)} сая';
  }
  return _mnt.format(amount);
}

String formatRelativeDate(DateTime? date) {
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'дөнгөж сая';
  if (diff.inHours < 1) return '${diff.inMinutes} мин өмнө';
  if (diff.inDays < 1) return '${diff.inHours} цаг өмнө';
  if (diff.inDays < 30) return '${diff.inDays} өдөр өмнө';
  return DateFormat('yyyy.MM.dd').format(date);
}
