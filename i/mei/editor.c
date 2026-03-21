#include <termios.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <ctype.h>
#include <string.h>

#define CTRL_KEY(k) ((k) & 0x1f)

struct termios orig_termios;
int cursor_x = 0, cursor_y = 0;
char status_msg[80] = "Mode: EDIT | Press Ctrl+Q to quit";

// --- ターミナル制御 ---
void die(const char *s) {
    write(STDOUT_FILENO, "\x1b[2J", 4);
    write(STDOUT_FILENO, "\x1b[H", 3);
    perror(s);
    exit(1);
}

void disableRawMode() {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
    write(STDOUT_FILENO, "\x1b[2J", 4);
    write(STDOUT_FILENO, "\x1b[H", 3);
}

void enableRawMode() {
    if (tcgetattr(STDIN_FILENO, &orig_termios) == -1) die("tcgetattr");
    atexit(disableRawMode);

    struct termios raw = orig_termios;
    // エコー無効化、カノニカルモード（Enter待ち）無効化、Ctrl+C/Z/S/Qなどのシグナル無効化
    raw.c_iflag &= ~(BRKINT | ICRNL | INPCK | ISTRIP | IXON);
    raw.c_oflag &= ~(OPOST);
    raw.c_cflag |= (CS8);
    raw.c_lflag &= ~(ECHO | ICANON | IEXTEN | ISIG);
    raw.c_cc[VMIN] = 0;
    raw.c_cc[VTIME] = 1; // 100ms timeout

    if (tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw) == -1) die("tcsetattr");
}

// --- 描画処理 ---
void drawScreen() {
    char buf[1024];
    snprintf(buf, sizeof(buf), "\x1b[?25l"); // カーソル非表示
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[H"); // カーソルを左上へ

    // タブバー（ヘッダー）の描画
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[7m"); // 反転(VSCodeのタブ風)
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), " [ main.c ]  header.h  Makefile \x1b[K\r\n");
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[0m"); // 反転解除

    // エディタのメイン領域（今回はモックとして空行を描画）
    for (int y = 1; y < 23; y++) {
        snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "~\x1b[K\r\n");
    }

    // ステータスバー（フッター）の描画
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[7m");
    char status[100];
    snprintf(status, sizeof(status), " %s | POS: %d, %d \x1b[K", status_msg, cursor_y, cursor_x);
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "%s", status);
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[0m\r\n");

    // カーソルを実際の座標に移動 (ヘッダー分Y座標を+2する)
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[%d;%dH", cursor_y + 2, cursor_x + 1);
    snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "\x1b[?25h"); // カーソル表示

    write(STDOUT_FILENO, buf, strlen(buf));
}

// --- 入力処理 ---
void processKeypress() {
    int nread;
    char c;
    while ((nread = read(STDIN_FILENO, &c, 1)) != 1) {
        if (nread == -1) die("read");
    }

    if (c == CTRL_KEY('q')) { // Ctrl+Q で終了
        write(STDOUT_FILENO, "\x1b[2J", 4);
        write(STDOUT_FILENO, "\x1b[H", 3);
        exit(0);
    }

    // エスケープシーケンス（矢印キーなど）の解析
    if (c == '\x1b') {
        char seq[3];
        if (read(STDIN_FILENO, &seq[0], 1) != 1) return;
        if (read(STDIN_FILENO, &seq[1], 1) != 1) return;

        if (seq[0] == '[') {
            // Shift + 矢印キーの検知 (ターミナルによって \x1b[1;2C などの拡張シーケンスが送られる)
            if (seq[1] == '1') {
                char seq2[2];
                if (read(STDIN_FILENO, &seq2[0], 1) == 1 && read(STDIN_FILENO, &seq2[1], 1) == 1) {
                    if (seq2[0] == ';' && seq2[1] == '2') {
                        char dir;
                        if (read(STDIN_FILENO, &dir, 1) == 1) {
                            switch (dir) {
                                case 'A': strcpy(status_msg, "SELECT: UP"); break;
                                case 'B': strcpy(status_msg, "SELECT: DOWN"); break;
                                case 'C': strcpy(status_msg, "SELECT: RIGHT"); break;
                                case 'D': strcpy(status_msg, "SELECT: LEFT"); break;
                            }
                        }
                        return;
                    }
                }
            }
            // 通常の矢印キー
            switch (seq[1]) {
                case 'A': cursor_y--; strcpy(status_msg, "Move: UP"); break;    // Up
                case 'B': cursor_y++; strcpy(status_msg, "Move: DOWN"); break;  // Down
                case 'C': cursor_x++; strcpy(status_msg, "Move: RIGHT"); break; // Right
                case 'D': cursor_x--; strcpy(status_msg, "Move: LEFT"); break;  // Left
            }
        }
    } else {
        // 通常の文字入力（今回はステータスバーに押したキーを表示するだけ）
        snprintf(status_msg, sizeof(status_msg), "Pressed: %c (%d)", iscntrl(c) ? '?' : c, c);
    }

    // 簡単な画面外へのカーソル移動制御
    if (cursor_x < 0) cursor_x = 0;
    if (cursor_y < 0) cursor_y = 0;
}

int main() {
    enableRawMode();
    while (1) {
        drawScreen();
        processKeypress();
    }
    return 0;
}