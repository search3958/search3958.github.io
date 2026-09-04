// --- ゲーム定数 ---
const BOARD_SIZE = 8;
const board = []; // [row, col] -> direction ('up', 'down', 'left', 'right')
const specialCells = {}; // 特殊なマスの座標を保持

// 初期設定：コンベアの方向
const initialDirection = 'right';
const directions = ['right', 'down', 'left', 'up'];

// --- ゲーム状態 ---
let packagePosition = null; // null または { row: x, col: y }
let inventory = 0; // 所持している荷物の数
let gameInterval; // ゲームループのID

// --- 特殊なマスの座標 (固定) ---
// (row, col) は 0-indexed
specialCells['warp1_A'] = { row: 0, col: 0 }; // 左上
specialCells['warp1_B'] = { row: 7, col: 7 }; // 右下
specialCells['spawner'] = { row: 7, col: 0 }; // 左下 (荷物生成)
specialCells['seller'] = { row: 0, col: 7 }; // 右上 (荷物売却)

// --- DOM要素 ---
const gameBoardEl = document.getElementById('game-board');
const placePackageBtn = document.getElementById('place-package');
const inventoryEl = document.getElementById('inventory');


// --- 初期化関数 ---
function initBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            // 初期方向を設定
            board[r][c] = initialDirection;

            // DOM要素を作成
            const cell = document.createElement('div');
            cell.classList.add('cell', initialDirection);
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.id = `cell-${r}-${c}`;

            // 特殊なマスをマーク
            if (r === specialCells['warp1_A'].row && c === specialCells['warp1_A'].col ||
                r === specialCells['warp1_B'].row && c === specialCells['warp1_B'].col) {
                cell.classList.add('warp1');
            } else if (r === specialCells['spawner'].row && c === specialCells['spawner'].col) {
                cell.classList.add('spawner');
            } else if (r === specialCells['seller'].row && c === specialCells['seller'].col) {
                cell.classList.add('seller');
            }

            // コンベアの方向変更クリックイベントを設定
            cell.addEventListener('click', toggleConveyorDirection);

            gameBoardEl.appendChild(cell);
        }
    }
}

// --- イベントハンドラ ---

/**
 * 空のマスをクリックした際、コンベアの向きを循環的に変更する
 * @param {Event} event 
 */
function toggleConveyorDirection(event) {
    const cellEl = event.currentTarget;
    const r = parseInt(cellEl.dataset.row);
    const c = parseInt(cellEl.dataset.col);

    // 特殊なマスは方向を変えられない
    if (cellEl.classList.contains('warp1') || cellEl.classList.contains('spawner') || cellEl.classList.contains('seller')) {
        return;
    }

    // 現在の方向を取得し、次の方向を決定
    const currentDir = board[r][c];
    const currentIndex = directions.indexOf(currentDir);
    const nextIndex = (currentIndex + 1) % directions.length;
    const nextDir = directions[nextIndex];

    // CSSクラスと状態を更新
    cellEl.classList.remove(currentDir);
    cellEl.classList.add(nextDir);
    board[r][c] = nextDir;
}

/**
 * 荷物をゲームボード上のランダムな空のマスに置く
 */
function placePackage() {
    if (inventory <= 0) {
        alert("荷物がありません。生成マス (左下) へ移動させてください。");
        return;
    }
    
    // 既に荷物が置かれている場合はエラー
    if (packagePosition !== null) {
        alert("既に荷物が置かれています。");
        return;
    }

    // 荷物を置く場所は (0, 0)
    packagePosition = { row: 0, col: 0 };
    inventory--;
    updateInventoryDisplay();

    // 荷物のDOM要素を作成し、配置する
    const startCellEl = document.getElementById(`cell-0-0`);
    const packageEl = document.createElement('div');
    packageEl.classList.add('package');
    packageEl.id = 'current-package';
    packageEl.textContent = '📦';
    startCellEl.appendChild(packageEl);
    
    // ゲームループ開始
    if (!gameInterval) {
        gameInterval = setInterval(movePackage, 1000); // 1秒ごとに移動
    }
}

// --- ゲームロジック ---

/**
 * 荷物をコンベアの向きに従って移動させる
 */
function movePackage() {
    if (packagePosition === null) {
        clearInterval(gameInterval);
        gameInterval = null;
        return; // 荷物がない場合は何もしない
    }

    let { row: r, col: c } = packagePosition;
    const currentDir = board[r][c];
    let nextR = r;
    let nextC = c;

    // 1. 移動先の決定
    switch (currentDir) {
        case 'up': nextR--; break;
        case 'down': nextR++; break;
        case 'left': nextC--; break;
        case 'right': nextC++; break;
    }

    // 2. 特殊マスの判定（移動先ではなく、現在のマスで判定）
    
    // a. ワープ
    if (r === specialCells['warp1_A'].row && c === specialCells['warp1_A'].col) {
        // ワープA (0, 0) から B (7, 7) へ
        nextR = specialCells['warp1_B'].row;
        nextC = specialCells['warp1_B'].col;
        console.log('Warp A -> B');
    } else if (r === specialCells['warp1_B'].row && c === specialCells['warp1_B'].col) {
        // ワープB (7, 7) から A (0, 0) へ
        nextR = specialCells['warp1_A'].row;
        nextC = specialCells['warp1_A'].col;
        console.log('Warp B -> A');
    } 
    
    // b. 生成マス
    else if (r === specialCells['spawner'].row && c === specialCells['spawner'].col) {
        // 荷物生成マス
        inventory++;
        updateInventoryDisplay();
        removePackage();
        return; // 荷物が消えるので移動処理はスキップ
    } 
    
    // c. 売却マス
    else if (r === specialCells['seller'].row && c === specialCells['seller'].col) {
        // 荷物売却マス
        console.log("荷物売却！");
        // ここでスコアや通貨を増やす処理などを実装できます
        removePackage();
        return; // 荷物が消えるので移動処理はスキップ
    }

    // 3. 盤面外の判定（ワープ処理の後に実行）
    if (nextR < 0 || nextR >= BOARD_SIZE || nextC < 0 || nextC >= BOARD_SIZE) {
        console.log("荷物がボード外へ落下しました");
        removePackage();
        return;
    }

    // 4. 荷物の位置を更新し、DOMを移動
    packagePosition = { row: nextR, col: nextC };
    const nextCellEl = document.getElementById(`cell-${nextR}-${nextC}`);
    const packageEl = document.getElementById('current-package');
    
    if (packageEl) {
        // 古いセルから荷物を削除し、新しいセルに追加
        packageEl.parentElement.removeChild(packageEl); 
        nextCellEl.appendChild(packageEl);
    } else {
        // 念のため、荷物が無くなっていた場合の処理
        removePackage();
    }
}

/**
 * 荷物をボードから削除し、ゲームループを停止
 */
function removePackage() {
    const packageEl = document.getElementById('current-package');
    if (packageEl) {
        packageEl.parentElement.removeChild(packageEl);
    }
    packagePosition = null;
    clearInterval(gameInterval);
    gameInterval = null;
}

/**
 * 所持荷物の表示を更新する
 */
function updateInventoryDisplay() {
    inventoryEl.textContent = `荷物: ${inventory}個`;
}


// --- メイン処理 ---
initBoard(); // ゲームボードを初期化
updateInventoryDisplay(); // 所持荷物の表示を初期化

// デバッグ用に最初から荷物を1つ持っている状態にする
inventory = 1; 
updateInventoryDisplay();

// イベントリスナー設定
placePackageBtn.addEventListener('click', placePackage);

console.log("ゲームの準備ができました！");
//