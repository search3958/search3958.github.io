import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;


void main() => runApp(const MyApp());


class MyApp extends StatefulWidget {
 const MyApp({super.key});
 @override
 State<MyApp> createState() => _MyAppState();
}


class _MyAppState extends State<MyApp> {
  final _scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  Color _accentColor = Colors.purple;
  Language _language = Language.ja;
  bool _isLoggedIn = false;
  String _backgroundUrl = 'https://search3958.github.io/newtab/bgimg/circle5.webp';

 @override
  void initState() {
    super.initState();
    // 非同期で設定を読み込む
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSettings();
    });
  }


 Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) {  // Widgetがまだ有効かチェック
        setState(() {
          _accentColor = Color(prefs.getInt('accentColor') ?? Colors.purple.value);
          _language = Language.values[prefs.getInt('language') ?? 0];
          _backgroundUrl = prefs.getString('backgroundUrl') ?? _backgroundUrl;
        });
      }
      debugPrint('Settings loaded successfully');
    } catch (e) {
      debugPrint('Error loading settings: $e');
    }
  }

  Future<void> _saveSettings() async {
    try {
      if (!mounted) return;  
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('accentColor', _accentColor.value);
      await prefs.setInt('language', _language.index);
      await prefs.setString('backgroundUrl', _backgroundUrl);
      debugPrint('Settings saved successfully: {color: $_accentColor, lang: $_language, bg: $_backgroundUrl}');
    } catch (e) {
      debugPrint('Error saving settings: $e');
    }
  }

 void updateTheme(Color newColor) {
    setState(() {
      _accentColor = newColor;
    });
    _saveSettings(); // 設定を保存
  }

  void updateLanguage(Language language) {
    setState(() {
      _language = language;
    });
    _saveSettings();
  }

  void updateBackgroundUrl(String url) {
    setState(() {
      _backgroundUrl = url;
    });
    _saveSettings(); // 設定を保存
  }

  void _handleLogout() {
    setState(() {
      _isLoggedIn = false;
    });
    _cleanupUserData();
  }

  // ユーザーデータのクリーンアップ処理
  Future<void> _cleanupUserData() async {
    final prefs = await SharedPreferences.getInstance();
    // 現在のユーザーに関連する設定のみを削除
    await prefs.remove('accentColor');
    await prefs.remove('language');
    await prefs.remove('notepad_content');
    await prefs.remove('backgroundUrl');
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(seedColor: _accentColor);

    return MaterialApp(
      scaffoldMessengerKey: _scaffoldMessengerKey,
      title: 'CF OS',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.windows: ZoomPageTransitionsBuilder(),
            TargetPlatform.macOS: ZoomPageTransitionsBuilder(),
            TargetPlatform.linux: ZoomPageTransitionsBuilder(),
            TargetPlatform.android: ZoomPageTransitionsBuilder(),
            TargetPlatform.iOS: ZoomPageTransitionsBuilder(),
          },
        ),
      ),
      home: _isLoggedIn 
        ? BackgroundImageScreen(
            key: UniqueKey(),
            backgroundUrl: _backgroundUrl,
            onAccentColorChanged: updateTheme,
            onLanguageChanged: updateLanguage,
            onBackgroundUrlChanged: updateBackgroundUrl, // 追加
            colorScheme: colorScheme,
            language: _language,
            onLogout: _handleLogout,
          )
        : LoginScreen(
            onLogin: () => setState(() => _isLoggedIn = true),
            language: _language,
          ),
    );
  }
}


enum Language { ja, kp }


// 言語マッピングを追加
Map<Language, Map<String, String>> uiText = {
 Language.ja: {
   'accent_color': 'アクセントカラー',
   'language_settings': '言語設定',
   'information': '情報',
   'version': 'バージョン',
 },
 Language.kp: {
   'accent_color': '악센트 색상',
   'language_settings': '언어 설정',
   'information': '정보',
   'version': '버죤',
 },
};


Map<Language, String> startButtonText = {
 Language.ja: '開始',
 Language.kp: '시작',
};


class BackgroundImageScreen extends StatefulWidget {
 final ColorScheme colorScheme;
 final String backgroundUrl;
 final Language language;
 final ValueChanged<Color> onAccentColorChanged;
 final ValueChanged<Language> onLanguageChanged;
 final ValueChanged<String> onBackgroundUrlChanged; // 追加
 final VoidCallback onLogout;

 const BackgroundImageScreen({
   super.key,
   required this.colorScheme,
   required this.backgroundUrl,
   required this.onAccentColorChanged,
   required this.onLanguageChanged,
   required this.onBackgroundUrlChanged, // 追加
   required this.language,
   required this.onLogout,
 });


 @override
 State<BackgroundImageScreen> createState() => _BackgroundImageScreenState();
}


class _BackgroundImageScreenState extends State<BackgroundImageScreen> {
 OverlayEntry? _dialogEntry;
 bool _isCustomizeOpen = false;
 OverlayEntry? _calculatorEntry;
 bool _isCalculatorOpen = false;
 OverlayEntry? _clockEntry;
 bool _isClockOpen = false;
 OverlayEntry? _settingsEntry;
 bool _isSettingsOpen = false;
 OverlayEntry? _webDevEntry;
 bool _isWebDevOpen = false;
 OverlayEntry? _startMenuEntry;
 bool _isStartMenuOpen = false;


 void _showCustomizeDialog() {
   if (_isCustomizeOpen) {
     _dialogEntry?.remove();
     _dialogEntry = null;
     setState(() => _isCustomizeOpen = false);
     return;
   }


   setState(() => _isCustomizeOpen = true);
   _dialogEntry = OverlayEntry(
     builder: (context) => FloatingWindow(
       title: 'Customize',
       width: 440,
       onClose: () {
         _dialogEntry?.remove();
         _dialogEntry = null;
         setState(() => _isCustomizeOpen = false);
       },
       child: CustomizeWindow(
         initialColor: widget.colorScheme.primary,
         onColorChanged: widget.onAccentColorChanged,
         language: widget.language,
         backgroundUrl: widget.backgroundUrl, // 追加
         onBackgroundUrlChanged: widget.onBackgroundUrlChanged, // 追加
       ),
     ),
   );
   Overlay.of(context).insert(_dialogEntry!);
 }


 void _showCalculatorDialog() {
   if (_isCalculatorOpen) {
     _calculatorEntry?.remove();
     _calculatorEntry = null;
     setState(() => _isCalculatorOpen = false);
     return;
   }


   setState(() => _isCalculatorOpen = true);
   _calculatorEntry = OverlayEntry(
     builder: (context) => FloatingWindow(
       title: 'Calculator',
       width: 280, // 計算機の幅
       onClose: () {
         _calculatorEntry?.remove();
         _calculatorEntry = null;
         setState(() => _isCalculatorOpen = false);
       },
       child: const CalculatorWindow(),
     ),
   );
   Overlay.of(context).insert(_calculatorEntry!);
 }


 void _showClockDialog() {
   if (_isClockOpen) {
     _clockEntry?.remove();
     _clockEntry = null;
     setState(() => _isClockOpen = false);
     return;
   }


   setState(() => _isClockOpen = true);
   _clockEntry = OverlayEntry(
     builder: (context) => FloatingWindow(
       title: 'Clock',
       width: 340, // 時計の幅
       onClose: () {
         _clockEntry?.remove();
         _clockEntry = null;
         setState(() => _isClockOpen = false);
       },
       child: const ClockWindow(),
     ),
   );
   Overlay.of(context).insert(_clockEntry!);
 }


 void _showSettingsDialog() {
   if (_isSettingsOpen) {
     _settingsEntry?.remove();
     _settingsEntry = null;
     setState(() => _isSettingsOpen = false);
     return;
   }


   setState(() => _isSettingsOpen = true);
   _settingsEntry = OverlayEntry(
     builder: (context) => FloatingWindow(
       title: 'Settings',
       width: 320, // 設定画面の幅
       onClose: () {
         _settingsEntry?.remove();
         _settingsEntry = null;
         setState(() => _isSettingsOpen = false);
       },
       child: SettingsWindow(
         initialLanguage: widget.language,
         onLanguageChanged: widget.onLanguageChanged,
       ),
     ),
   );
   Overlay.of(context).insert(_settingsEntry!);
 }


 void _showWebDevDialog() {
   if (_isWebDevOpen) {
     _webDevEntry?.remove();
     _webDevEntry = null;
     setState(() => _isWebDevOpen = false);
     return;
   }


   setState(() => _isWebDevOpen = true);
   _webDevEntry = OverlayEntry(
     builder: (context) => FloatingWindow(
       title: 'Notepad',
       width: 560, // メモ帳の幅
       onClose: () {
         _webDevEntry?.remove();
         _webDevEntry = null;
         setState(() => _isWebDevOpen = false);
       },
       child: const NotepadWindow(),
     ),
   );
   Overlay.of(context).insert(_webDevEntry!);
 }


 void _toggleStartMenu() {
   if (_isStartMenuOpen) {
     _startMenuEntry?.remove();
     _startMenuEntry = null;
     setState(() => _isStartMenuOpen = false);
     return;
   }

   final button = context.findRenderObject() as RenderBox;
   final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
   final position = RelativeRect.fromRect(
     Rect.fromPoints(
       button.localToGlobal(Offset.zero, ancestor: overlay),
       button.localToGlobal(button.size.bottomRight(Offset.zero), ancestor: overlay),
     ),
     Offset.zero & overlay.size,
   );

   setState(() => _isStartMenuOpen = true);
   _startMenuEntry = OverlayEntry(
     builder: (context) => Stack(
       children: [
         // バックドロップ
         Positioned.fill(
           child: GestureDetector(
             onTap: _toggleStartMenu,
             child: Container(color: Colors.transparent),
           ),
         ),
         // メニュー
         Positioned(
           left: 16,
           bottom: 80,
           child: Material(
             elevation: 8,
             borderRadius: BorderRadius.circular(16),
             color: widget.colorScheme.surface,
             child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 _buildMenuItem(
                   icon: Icons.logout,
                   label: widget.language == Language.ja ? 'ログアウト' : '로그아웃',
                   onTap: () {
                     _toggleStartMenu();
                     widget.onLogout();
                   },
                 ),
                 _buildMenuItem(
                   icon: Icons.settings,
                   label: widget.language == Language.ja ? '設定' : '설정',
                   onTap: () {
                     _toggleStartMenu();
                     _showSettingsDialog();
                   },
                 ),
               ],
             ),
           ),
         ),
       ],
     ),
   );
   Overlay.of(context).insert(_startMenuEntry!);
 }


 Widget _buildMenuItem({
   required IconData icon,
   required String label,
   required VoidCallback onTap,
 }) {
   return InkWell(
     onTap: onTap,
     child: Container(
       width: 200,
       padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
       child: Row(
         children: [
           Icon(icon, color: widget.colorScheme.onSurface),
           const SizedBox(width: 12),
           Text(
             label,
             style: TextStyle(
               fontSize: 16,
               color: widget.colorScheme.onSurface,
             ),
           ),
         ],
       ),
     ),
   );
 }


 @override
 Widget build(BuildContext context) {
   return Scaffold(
     body: Stack(children: [
       // 背景画像
       Container(
         decoration: BoxDecoration(
           image: DecorationImage(
             image: NetworkImage(widget.backgroundUrl),
             fit: BoxFit.cover,
           ),
         ),
       ),
       // FABs
       Positioned(
         left: 16,
         bottom: 16,
         child: Row(children: [
           FloatingActionButton.extended(
             heroTag: 'fab_start',
             onPressed: _toggleStartMenu,
             icon: const Icon(Icons.apps),
             label: Text(startButtonText[widget.language]!),
           ),
           const SizedBox(width: 12),
           FloatingActionButton(
             heroTag: 'fab_edit',
             onPressed: _showCustomizeDialog,
             shape: RoundedRectangleBorder(
               borderRadius: BorderRadius.circular(
                 _isCustomizeOpen ? 28 : 16,
               ),
             ),
             backgroundColor: _isCustomizeOpen
               ? widget.colorScheme.primary
               : widget.colorScheme.surfaceVariant,
             foregroundColor: _isCustomizeOpen
               ? widget.colorScheme.onPrimary
               : widget.colorScheme.onSurfaceVariant,
             child: const Icon(Icons.edit),
           ),
           const SizedBox(width: 12),
           FloatingActionButton(
             heroTag: 'fab_calculate',
             onPressed: _showCalculatorDialog,
             shape: RoundedRectangleBorder(
               borderRadius: BorderRadius.circular(
                 _isCalculatorOpen ? 28 : 16,
               ),
             ),
             backgroundColor: _isCalculatorOpen
               ? widget.colorScheme.primary
               : widget.colorScheme.surfaceVariant,
             foregroundColor: _isCalculatorOpen
               ? widget.colorScheme.onPrimary
               : widget.colorScheme.onSurfaceVariant,
             child: const Icon(Icons.calculate),
           ),
           const SizedBox(width: 12),
           FloatingActionButton(
             heroTag: 'fab_clock',
             onPressed: _showClockDialog,
             shape: RoundedRectangleBorder(
               borderRadius: BorderRadius.circular(
                 _isClockOpen ? 28 : 16,
               ),
             ),
             backgroundColor: _isClockOpen
               ? widget.colorScheme.primary
               : widget.colorScheme.surfaceVariant,
             foregroundColor: _isClockOpen
               ? widget.colorScheme.onPrimary
               : widget.colorScheme.onSurfaceVariant,
             child: const Icon(Icons.schedule),
           ),
           const SizedBox(width: 12),
           FloatingActionButton(
             heroTag: 'fab_settings',
             onPressed: _showSettingsDialog,
             shape: RoundedRectangleBorder(
               borderRadius: BorderRadius.circular(
                 _isSettingsOpen ? 28 : 16,
               ),
             ),
             backgroundColor: _isSettingsOpen
               ? widget.colorScheme.primary
               : widget.colorScheme.surfaceVariant,
             foregroundColor: _isSettingsOpen
               ? widget.colorScheme.onPrimary
               : widget.colorScheme.onSurfaceVariant,
             child: const Icon(Icons.settings),
           ),
           const SizedBox(width: 12),
           FloatingActionButton(
             heroTag: 'fab_webdev',
             onPressed: _showWebDevDialog,
             shape: RoundedRectangleBorder(
               borderRadius: BorderRadius.circular(
                 _isWebDevOpen ? 28 : 16,
               ),
             ),
             backgroundColor: _isWebDevOpen
               ? widget.colorScheme.primary
               : widget.colorScheme.surfaceVariant,
             foregroundColor: _isWebDevOpen
               ? widget.colorScheme.onPrimary
               : widget.colorScheme.onSurfaceVariant,
             child: const Icon(Icons.note),  // アイコン変更
           ),
         ]),
       ),
     ]),
   );
 }
}




class CustomizeWindow extends StatefulWidget {
 final Color initialColor;
 final ValueChanged<Color> onColorChanged;
 final Language language;
 final String backgroundUrl;
 final ValueChanged<String> onBackgroundUrlChanged;

 const CustomizeWindow({
   super.key,
   required this.initialColor,
   required this.onColorChanged,
   required this.language,
   required this.backgroundUrl,
   required this.onBackgroundUrlChanged,
 });


 @override
 State<CustomizeWindow> createState() => _CustomizeWindowState();
}


class _CustomizeWindowState extends State<CustomizeWindow> {
 late Color selectedColor;
 late TextEditingController _urlController;

 final List<Color> presetColors = [
   Colors.purple,
   Colors.teal,
   Colors.redAccent,
   Colors.blueAccent,
   Colors.orange,
   Colors.green,
 ];

 @override
 void initState() {
   super.initState();
   selectedColor = widget.initialColor;
   _urlController = TextEditingController(text: widget.backgroundUrl);
 }

 @override
 void dispose() {
   _urlController.dispose();
   super.dispose();
 }

 @override
  Widget build(BuildContext context) {
    final texts = uiText[widget.language]!;
    
    return SizedBox(
      width: 440,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(texts['accent_color']!, style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: presetColors.map((color) {
              return InkWell(
                onTap: () {
                  setState(() {
                    selectedColor = color;
                  });
                  widget.onColorChanged(color);
                },
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selectedColor == color ? Colors.white : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: selectedColor == color
                      ? const Icon(Icons.check, color: Colors.white, size: 20)
                      : null,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          const Text('背景画像URL', style: TextStyle(fontSize: 16)),
          const SizedBox(height: 8),
          TextField(
            controller: _urlController,
            decoration: InputDecoration(
              hintText: 'https://example.com/image.jpg',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              suffixIcon: IconButton(
                icon: const Icon(Icons.save),
                onPressed: () {
                  widget.onBackgroundUrlChanged(_urlController.text);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('背景画像を保存しました')),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}


// ---------------------------
// フローティングウィンドウ
// ---------------------------
class FloatingWindow extends StatefulWidget {
 final Widget child;
 final VoidCallback onClose;
 final String title;
 final double width; // 追加

 const FloatingWindow({
   super.key,
   required this.child,
   required this.onClose,
   required this.title,
   this.width = 600, // デフォルト値を設定
 });


 @override
 State<FloatingWindow> createState() => _FloatingWindowState();
}


class _FloatingWindowState extends State<FloatingWindow>
   with SingleTickerProviderStateMixin {
 Offset offset = const Offset(100, 100);
 Offset? startDragOffset;
 Offset? dragStartPosition;


 late final AnimationController _controller;
 late final Animation<double> _scale;
 late final Animation<double> _opacity;


 @override
 void initState() {
   super.initState();
   _controller = AnimationController(
     duration: const Duration(milliseconds: 250),
     vsync: this,
   );


   _scale = Tween<double>(begin: 0.8, end: 1.0).animate(
     CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
   );
   _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
     CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
   );


   _controller.forward();
 }


 @override
 void dispose() {
   _controller.dispose();
   super.dispose();
 }


 void close() async {
   await _controller.reverse();
   widget.onClose();
 }


 void _startDrag(DragStartDetails details) {
   dragStartPosition = details.globalPosition;
   startDragOffset = offset;
 }


 void _onDragUpdate(DragUpdateDetails details) {
   final current = details.globalPosition;
   final dx = current.dx - (dragStartPosition?.dx ?? 0);
   final dy = current.dy - (dragStartPosition?.dy ?? 0);
   setState(() {
     offset = Offset(
       (startDragOffset?.dx ?? 0) + dx,
       (startDragOffset?.dy ?? 0) + dy,
     );
   });
 }


 @override
Widget build(BuildContext context) {
  final colorScheme = Theme.of(context).colorScheme;
  final surfaceColor = colorScheme.surface;
  final onSurfaceColor = colorScheme.onSurface;

  return Positioned(
    left: offset.dx,
    top: offset.dy,
    child: GestureDetector(
      onPanStart: _startDrag,
      onPanUpdate: _onDragUpdate,
      child: FadeTransition(
        opacity: _opacity,
        child: ScaleTransition(
          scale: _scale,
          child: Material(
            elevation: 20,
            borderRadius: BorderRadius.circular(32),
            color: surfaceColor.withOpacity(0.95),
            child: Container(
              width: widget.width, // 固定値から widget.width に変更
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        widget.title,
                        style: GoogleFonts.unbounded(
                          fontSize: 20,
                          fontWeight: FontWeight.normal,
                          color: onSurfaceColor,
                        ),
                      ),
                      GestureDetector(
                        onTap: close,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: onSurfaceColor.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.close, size: 22, color: onSurfaceColor),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  widget.child,
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
}


// 計算機ウィンドウ
class CalculatorWindow extends StatefulWidget {
 const CalculatorWindow({super.key});


 @override
 State<CalculatorWindow> createState() => _CalculatorWindowState();
}


class _CalculatorWindowState extends State<CalculatorWindow> {
 String _display = '0';
 String _buffer = '';
 String _operator = '';
 bool _shouldResetDisplay = false;
 String? _pressedButton;


 void _onNumberInput(String num) {
   setState(() {
     if (_display == '0' || _shouldResetDisplay) {
       _display = num;
       _shouldResetDisplay = false;
     } else {
       _display += num;
     }
   });
 }


 void _onOperatorInput(String op) {
   setState(() {
     if (_buffer.isNotEmpty) {
       _calculate();
     }
     _buffer = _display;
     _operator = op;
     _shouldResetDisplay = true;
   });
 }


 void _calculate() {
   if (_buffer.isEmpty || _operator.isEmpty) return;
  
   final num1 = double.parse(_buffer);
   final num2 = double.parse(_display);
   double result;


   switch (_operator) {
     case '+': result = num1 + num2; break;
     case '-': result = num1 - num2; break;
     case '×': result = num1 * num2; break;
     case '÷': result = num1 / num2; break;
     default: return;
   }


   setState(() {
     _display = result.toStringAsPrecision(10).replaceAll(RegExp(r'\.?0+$'), '');
     _buffer = '';
     _operator = '';
   });
 }


 void _clear() {
   setState(() {
     _display = '0';
     _buffer = '';
     _operator = '';
     _shouldResetDisplay = false;
   });
 }


 @override
 Widget build(BuildContext context) {
   return RawKeyboardListener(
     focusNode: FocusNode()..requestFocus(),
     onKey: (event) {
       if (event is! RawKeyDownEvent) return;
       final key = event.logicalKey.keyLabel;
      
       if (RegExp(r'[0-9]').hasMatch(key)) {
         _onNumberInput(key);
       } else if (['+', '-'].contains(key)) {
         _onOperatorInput(key);
       } else if (key == '*') {
         _onOperatorInput('×');
       } else if (key == '/') {
         _onOperatorInput('÷');
       } else if (key == 'Enter') {
         _calculate();
       } else if (key == 'Escape') {
         _clear();
       }
     },
     child: SizedBox(
       width: 280, // 計算機用の幅
       child: Column(
         mainAxisSize: MainAxisSize.min,
         children: [
           // ディスプレイ
           Container(
             width: double.infinity,
             padding: const EdgeInsets.all(16),
             decoration: BoxDecoration(
               color: Theme.of(context).colorScheme.surfaceVariant,
               borderRadius: BorderRadius.circular(16),
             ),
             child: Column(
               crossAxisAlignment: CrossAxisAlignment.end,
               children: [
                 if (_buffer.isNotEmpty)
                   Text(
                     '$_buffer $_operator',
                     style: TextStyle(
                       fontSize: 16,
                       color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                     ),
                   ),
                 Text(
                   _display,
                   style: const TextStyle(
                     fontSize: 32,
                     fontWeight: FontWeight.bold,
                   ),
                 ),
               ],
             ),
           ),
           const SizedBox(height: 16),
           // キーパッド
           Wrap(
             spacing: 8,
             runSpacing: 8,
             children: [
               _buildButton('7'), _buildButton('8'), _buildButton('9'),
               _buildButton('÷', isOperator: true),
               _buildButton('4'), _buildButton('5'), _buildButton('6'),
               _buildButton('×', isOperator: true),
               _buildButton('1'), _buildButton('2'), _buildButton('3'),
               _buildButton('-', isOperator: true),
               _buildButton('0'),
               _buildButton('C', onTap: _clear),
               _buildButton('=', onTap: _calculate),
               _buildButton('+', isOperator: true),
             ],
           ),
         ],
       ),
     ),
   );
 }


Widget _buildButton(String text, {bool isOperator = false, VoidCallback? onTap}) {
   final theme = Theme.of(context);
   const size = 56.0;

   return GestureDetector(
     onTapDown: (_) => setState(() => _pressedButton = text),
     onTapUp: (_) {
       Future.delayed(const Duration(milliseconds: 100), () {
         if (mounted) setState(() => _pressedButton = null);
       });
     },
     onTapCancel: () {
       Future.delayed(const Duration(milliseconds: 100), () {
         if (mounted) setState(() => _pressedButton = null);
       });
     },
     child: AnimatedContainer(
       duration: const Duration(milliseconds: 100),
       width: size,
       height: size,
       child: FilledButton(
         onPressed: onTap ?? () {
           if (isOperator) {
             _onOperatorInput(text);
           } else {
             _onNumberInput(text);
           }
         },
         style: FilledButton.styleFrom(
           backgroundColor: isOperator
             ? theme.colorScheme.primary
             : theme.colorScheme.surfaceVariant,
           foregroundColor: isOperator
             ? theme.colorScheme.onPrimary
             : theme.colorScheme.onSurfaceVariant,
           shape: RoundedRectangleBorder(
             borderRadius: BorderRadius.circular(_pressedButton == text ? 32 : 16),
           ),
         ),
         child: Text(
           text,
           style: const TextStyle(fontSize: 16),
         ),
       ),
     ),
     );
 }
}


// 時計ウィンドウ
class ClockWindow extends StatefulWidget {
 const ClockWindow({super.key});


 @override
 State<ClockWindow> createState() => _ClockWindowState();
}


class _ClockWindowState extends State<ClockWindow> {
 late Timer _timer;
 late DateTime _now;


 @override
 void initState() {
   super.initState();
   _now = DateTime.now();
   _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
     setState(() => _now = DateTime.now());
   });
 }


 @override
 void dispose() {
   _timer.cancel();
   super.dispose();
 }


 @override
 Widget build(BuildContext context) {
   final theme = Theme.of(context);
   final hour = _now.hour.toString().padLeft(2, '0');
   final minute = _now.minute.toString().padLeft(2, '0');
   final second = _now.second.toString().padLeft(2, '0');
   final progress = _now.second / 60;


   return SizedBox(
     width: 340, // 時計用の幅
     child: Column(
       mainAxisSize: MainAxisSize.min,
       children: [
         // デジタル時計
         Text(
           '$hour:$minute:$second',
           style: GoogleFonts.jetBrainsMono(
             fontSize: 48,
             fontWeight: FontWeight.bold,
           ),
         ),
         const SizedBox(height: 24),
         // 秒針プログレスバー
         ClipRRect(
           borderRadius: BorderRadius.circular(4),
           child: LinearProgressIndicator(
             value: progress,
             minHeight: 8,
             backgroundColor: theme.colorScheme.surfaceVariant,
             valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
           ),
         ),
       ],
     ),
   );
 }
}


// 設定画面
class SettingsWindow extends StatelessWidget {
 final Language initialLanguage;
 final ValueChanged<Language> onLanguageChanged;

 const SettingsWindow({
   super.key,
   required this.initialLanguage,
   required this.onLanguageChanged,
 });

 Future<void> _resetLocalData(BuildContext context) async {
  final bool? confirm = await showCustomDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.info_outline,
            size: 40,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 16),
          const Text(
            'データのリセット',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'すべてのローカルデータがリセットされます。\nこの操作は取り消せません。',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Column(
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(
                  'リセット',
                  style: TextStyle(color: Theme.of(context).colorScheme.primary),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(
                  'キャンセル',
                  style: TextStyle(color: Theme.of(context).colorScheme.primary),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  if (confirm == true) {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (context.mounted) {
      await showCustomDialog(
        context: context,
        builder: (context) => AlertDialog(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.check_circle_outline,
                size: 40,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              const Text(
                'リセット完了',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                '設定を反映するには、アプリを再起動してください。',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(
                  'OK',
                  style: TextStyle(color: Theme.of(context).colorScheme.primary),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }
}


// カスタムダイアログを表示する関数を追加
Future<T?> showCustomDialog<T>({
  required BuildContext context,
  required Widget Function(BuildContext) builder,
}) {
  final completer = Completer<T?>();
  final overlay = Overlay.of(context);
  late OverlayEntry entry;

  entry = OverlayEntry(
    builder: (context) => Stack(
      children: [
        // バックドロップ
        Positioned.fill(
          child: GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(color: Colors.black54),
          ),
        ),
        // ダイアログ
        Positioned.fill(
          child: Center(
            child: Builder(
              builder: (context) {
                return Material(
                  color: Colors.transparent,
                  child: Navigator(
                    onGenerateRoute: (_) => MaterialPageRoute(
                      builder: (_) => builder(context),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    ),
  );

  overlay.insert(entry);

  return Navigator.of(context)
      .push(PageRouteBuilder(
        opaque: false,
        pageBuilder: (_, __, ___) => Container(),
      ))
      .then((value) {
        entry.remove();
        return value as T?;
      });
}

 @override
 Widget build(BuildContext context) {
   final texts = uiText[initialLanguage]!;
  
   return SizedBox(
     width: 320,
     child: Column(
       crossAxisAlignment: CrossAxisAlignment.start,
       children: [
         Text(texts['language_settings']!, style: const TextStyle(fontSize: 16)),
         const SizedBox(height: 8),
         SegmentedButton<Language>(
           segments: const [
             ButtonSegment(
               value: Language.ja,
               label: Text('日本語'),
             ),
             ButtonSegment(
               value: Language.kp,
               label: Text('조선어'),
             ),
           ],
           selected: {initialLanguage},
           onSelectionChanged: (Set<Language> newSelection) {
             onLanguageChanged(newSelection.first);
           },
           style: ButtonStyle(
             maximumSize: MaterialStateProperty.all(
               const Size(double.infinity, 48),
             ),
           ),
         ),
         const SizedBox(height: 16),
         Text(texts['information']!, style: const TextStyle(fontSize: 16)),
         const SizedBox(height: 8),
         Text(
           "${texts['version']!}: 1.0.0",
           style: TextStyle(
             fontSize: 12,
             color: Theme.of(context).colorScheme.onSurfaceVariant,
           ),
         ),
         const SizedBox(height: 24),
         // リセットボタンを追加
         SizedBox(
           width: double.infinity,
           child: FilledButton.icon(
             onPressed: () => _resetLocalData(context),
             icon: const Icon(Icons.restore),
             label: const Text('データをリセット'),
             style: FilledButton.styleFrom(
               backgroundColor: Theme.of(context).colorScheme.errorContainer,
               foregroundColor: Theme.of(context).colorScheme.onErrorContainer,
             ),
           ),
         ),
       ],
     ),
   );
 }
}


// Web開発環境ウィンドウ
class NotepadWindow extends StatefulWidget {
 const NotepadWindow({super.key});


 @override
 State<NotepadWindow> createState() => _NotepadWindowState();
}


class _NotepadWindowState extends State<NotepadWindow> {
 final _textController = TextEditingController();
 bool _isSaving = false;


 @override
 void initState() {
   super.initState();
   _loadContent();
 }


 Future<void> _loadContent() async {
   final prefs = await SharedPreferences.getInstance();
   final savedContent = prefs.getString('notepad_content') ?? '';
   _textController.text = savedContent;
 }


Future<void> _saveContent() async {
  setState(() => _isSaving = true);
  
  try {
    final prefs = await SharedPreferences.getInstance();
    // テキストボックスの内容のみを保存
    await prefs.setString('notepad_content', _textController.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('テキストを保存しました')),
    );
  } catch (e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('保存に失敗しました')),
    );
  } finally {
    if (mounted) {
      setState(() => _isSaving = false);
    }
  }
}

 @override
 Widget build(BuildContext context) {
   return SizedBox(
     width: 560, // メモ帳用の幅
     child: Column(
       mainAxisSize: MainAxisSize.min,
       children: [
         SizedBox(
           height: 400,
           child: TextField(
             controller: _textController,
             decoration: InputDecoration(
               border: OutlineInputBorder(
                 borderRadius: BorderRadius.circular(12),
               ),
               filled: true,
               fillColor: Theme.of(context).colorScheme.surfaceVariant,
             ),
             maxLines: null,
             expands: true,
             style: GoogleFonts.jetBrainsMono(),
           ),
         ),
         const SizedBox(height: 16),
         Row(
           mainAxisAlignment: MainAxisAlignment.end,
           children: [
             FilledButton.icon(
               onPressed: _isSaving ? null : _saveContent,
               icon: _isSaving
                 ? const SizedBox(
                     width: 20,
                     height: 20,
                     child: CircularProgressIndicator(strokeWidth: 2),
                   )
                 : const Icon(Icons.save),
               label: Text(_isSaving ? '保存中...' : '保存'),
             ),
           ],
         ),
       ],
     ),
   );
 }


 @override
 void dispose() {
   _textController.dispose();
   super.dispose();
 }
}


// タイトル画面用のウィジェット
class LoginScreen extends StatelessWidget {
  final VoidCallback onLogin;
  final Language language;

  const LoginScreen({
    super.key,
    required this.onLogin,
    required this.language,
  });

  void _handleLogin(BuildContext context) {
    onLogin();
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => BackgroundImageScreen(
          backgroundUrl: 'https://search3958.github.io/newtab/bgimg/circle5.webp',
          onAccentColorChanged: (_) {},
          onLanguageChanged: (_) {},
          onBackgroundUrlChanged: (_) {}, // この行を追加
          colorScheme: Theme.of(context).colorScheme,
          language: language,
          onLogout: () {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => LoginScreen(
                  onLogin: onLogin,
                  language: language,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF715188), Color(0xFF583a6f)],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'CF OS',
                style: GoogleFonts.unbounded(
                  fontSize: 72,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Version 1.0 Beta',
                style: GoogleFonts.unbounded(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 60),
              FilledButton.icon(
                onPressed: () => _handleLogin(context),
                icon: const Icon(Icons.login),
                label: Text(
                  language == Language.ja ? '開始' : '시작',
                  style: const TextStyle(fontSize: 18),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.purple,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}



