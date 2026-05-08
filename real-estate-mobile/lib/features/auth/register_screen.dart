import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'auth_controller.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  UserMode _mode = UserMode.both;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      await ref.read(authControllerProvider.notifier).signUp(
            email: _email.text.trim(),
            password: _password.text,
            fullName: _name.text.trim(),
            mode: _mode,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('И-мэйлээ шалгаж баталгаажуулна уу.')),
        );
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Алдаа: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Бүртгүүлэх')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Нэр'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Нэрээ оруулна уу' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'И-мэйл'),
                  validator: (v) =>
                      (v == null || !v.contains('@')) ? 'И-мэйл оруулна уу' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Нууц үг'),
                  validator: (v) =>
                      (v == null || v.length < 6) ? 'Хамгийн багадаа 6 тэмдэгт' : null,
                ),
                const SizedBox(height: 16),
                Text('Хэн бэ?', style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                SegmentedButton<UserMode>(
                  segments: const [
                    ButtonSegment(value: UserMode.buyer, label: Text('Авагч')),
                    ButtonSegment(value: UserMode.seller, label: Text('Зарагч')),
                    ButtonSegment(value: UserMode.both, label: Text('Хоёул')),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (s) => setState(() => _mode = s.first),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: state.isLoading ? null : _submit,
                  child: state.isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Бүртгүүлэх'),
                ),
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Бүртгэлтэй юу? Нэвтрэх'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
