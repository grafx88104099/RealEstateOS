import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class InquiriesScreen extends StatelessWidget {
  const InquiriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Хүсэлтүүд')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: CircleAvatar(child: Icon(Icons.auto_awesome)),
              title: Text('AI Зуучлагч'),
              subtitle: Text('Шинэ зар олдлоо — харах уу?'),
              trailing: Text('одоо'),
            ),
          ),
          SizedBox(height: 80),
          Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Phase 2-т: бодит inquiries + AI ↔ AI conversation энд харагдана.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 1,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Нүүр'),
          NavigationDestination(icon: Icon(Icons.chat_bubble), label: 'Хүсэлт'),
          NavigationDestination(icon: Icon(Icons.add_box_outlined), label: 'Зарах'),
        ],
        onDestinationSelected: (i) {
          if (i == 0) GoRouter.of(context).go('/home');
          if (i == 2) GoRouter.of(context).go('/sell');
        },
      ),
    );
  }
}
