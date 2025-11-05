import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const SwalertApp());
}

class SwalertApp extends StatelessWidget {
  const SwalertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swalert Sender',
      theme: ThemeData.dark(),
      home: const AlertScreen(),
    );
  }

}

class AlertScreen extends StatefulWidget {
  const AlertScreen({super.key});

  @override
  State<StatefulWidget> createState() => _AlertScreenState();

}

class _AlertScreenState extends State<AlertScreen> {
  final TextEditingController _controller = TextEditingController();
  final String topicUrl = 'https://ntfy.sh/swalert-phone-to-pc';

  Future<void> sendAlert() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    try {
      await http.post(
        Uri.parse(topicUrl),
        headers: {
          'Title': 'Alert from Phone',
          'Tags': 'phone, swalert',
        },
        body: text,
      );
      _controller.clear();
      ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content : Text('Alert sent ✅')));
    } catch (e) {
      ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('Error: $e')));

    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(title: const Text('Swalert')),
        body: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
                children: [
                  TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      labelText: 'Type your alert message',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: sendAlert,
                    child: const Text('Send to PC'),
                  )
                ]
            )
        )
    );
  }
}