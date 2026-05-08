import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Icon(Icons.home_work_outlined,
                  size: 80, color: theme.colorScheme.primary),
              const SizedBox(height: 24),
              Text('AI зуучлагчтайгаа танилцана уу',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Text(
                'Үл хөдлөх хөрөнгөө худалдан авах, худалдах бүх алхмыг таны хувийн AI зуучлагч хариуцна. Шууд, шударга, ил тод.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const Spacer(flex: 2),
              FilledButton(
                onPressed: () => context.go('/register'),
                child: const Text('Бүртгүүлэх'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/login'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Нэвтрэх'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
