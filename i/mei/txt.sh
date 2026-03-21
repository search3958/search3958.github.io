#!/bin/sh

# エラーがあれば停止する設定
set -e

# Cファイルをコンパイル (警告をしっかり出す設定)
gcc editor.c -o myeditor -Wall -Wextra -pedantic -std=c99

echo "コンパイル成功！エディタを起動します..."
sleep 1

# 実行
./myeditor