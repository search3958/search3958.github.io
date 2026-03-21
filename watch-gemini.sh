#!/bin/bash

# 監視対象のコマンド名
TARGET="gemini"

echo "--- ${TARGET} の動作を外部から監視中... ---"

while true; do
    # プロセスのPIDを取得
    PID=$(pgrep -f "$TARGET" | head -n 1)

    if [ -n "$PID" ]; then
        # CPU使用率を取得 (macOSの ps コマンドを使用)
        # 1秒おきにチェックし、5%以下なら「アイドル状態」とみなす
        CPU=$(ps -p "$PID" -o %cpu | tail -1 | cut -d. -f1 | tr -d ' ')

        # 生成中（CPUが一定以上）かチェック
        if [ "$CPU" -gt 5 ]; then
            echo "Generating... (CPU: $CPU%)"
            GENERATING=true
        elif [ "$GENERATING" = true ] && [ "$CPU" -lt 2 ]; then
            # 一度活性化してから、また静かになったら「完了」とみなす
            osascript -e 'display notification "回答の生成が完了したようです" with title "Gemini監視"'
            say "ジェミニの回答が終わりました"
            GENERATING=false
            echo "Done! Waiting for next activity..."
        fi
    fi
    sleep 2
done