  // 游戏主逻辑
  document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('next-piece');
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('current-level');
    const levelSelector = document.getElementById('level');
    
    // 游戏状态变量
    let score = 0;
    let lines = 0;
    let level = parseInt(levelSelector.value);
    let gameOver = true;
    let paused = false;
    let gameInterval;
    
    // 根据级别设置游戏参数
    const LEVEL_SETTINGS = {
        1: { rows: 16, cols: 8, speed: 1000, complexity: 1 },  // 简单
        2: { rows: 18, cols: 9, speed: 800, complexity: 2 },   // 初级
        3: { rows: 20, cols: 10, speed: 600, complexity: 3 },  // 中级
        4: { rows: 22, cols: 11, speed: 400, complexity: 4 },   // 高级
        5: { rows: 24, cols: 12, speed: 300, complexity: 5 },   // 困难
        6: { rows: 26, cols: 13, speed: 200, complexity: 6 }    // 专家
    };
    
    // 当前游戏设置
    let currentSettings = LEVEL_SETTINGS[level];
    
    // 初始化游戏板
    let board = createBoard();
    
    // 方块形状和颜色定义 (根据复杂度有不同的形状)
    const SHAPES = {
        // 基础形状 (所有级别都有)
        basic: [
            { shape: [[1, 1, 1, 1]], color: '#00FFFF' },     // I
            { shape: [[1, 1], [1, 1]], color: '#FFFF00' },   // O
            { shape: [[0, 1, 0], [1, 1, 1]], color: '#AA00FF' } // T
        ],
        // 中等复杂度形状 (级别2+)
        medium: [
            { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF0000' }, // Z
            { shape: [[0, 1, 1], [1, 1, 0]], color: '#00FF00' }   // S
        ],
        // 高复杂度形状 (级别4+)
        advanced: [
            { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000FF' }, // L
            { shape: [[0, 0, 1], [1, 1, 1]], color: '#FF7F00' },  // J
            { shape: [[1, 1, 1], [0, 1, 0]], color: '#FF00FF' },  // T变种
            { shape: [[1, 1, 1, 1], [0, 0, 0, 1]], color: '#00AAFF' } // L变种
        ],
        // 专家级形状 (级别6)
        expert: [
            { shape: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#FFAA00' },
            { shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], color: '#AAFF00' },
            { shape: [[1, 0, 1], [1, 1, 1]], color: '#FF00AA' }
        ]
    };
    
    // 当前方块和下一个方块
    let currentPiece = null;
    let nextPiece = null;
    
    // 初始化游戏板
    function createBoard() {
        return Array.from({ length: currentSettings.rows }, () => 
            Array(currentSettings.cols).fill('#111111'));
    }
    
    // 调整画布大小
    function resizeCanvas() {
        const blockSize = Math.min(
            Math.floor(canvas.parentElement.offsetWidth / currentSettings.cols),
            30
        );
        
        canvas.width = currentSettings.cols * blockSize;
        canvas.height = currentSettings.rows * blockSize;
        
        // 调整下一个方块预览大小
        nextPieceCanvas.width = 100;
        nextPieceCanvas.height = 100;
        
        // 重绘游戏
        if (!gameOver) {
            drawBoard();
            drawNextPiece();
        }
    }
    
    // 绘制游戏板
    function drawBoard() {
        const blockSize = canvas.width / currentSettings.cols;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        try{
            // 绘制已落下的方块
            for (let r = 0; r < currentSettings.rows; r++) {
                for (let c = 0; c < currentSettings.cols; c++) {
                    drawBlock(ctx, c, r, board[r][c], blockSize);
                }
            } 
            // 绘制当前移动的方块
            if (currentPiece) {
                currentPiece.shape.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value) {
                            drawBlock(
                                ctx, 
                                currentPiece.x + x, 
                                currentPiece.y + y, 
                                currentPiece.color,
                                blockSize
                            );
                        }
                    });
                });
            }
        }catch(e){
            console.error("drawBoard", e); 
        }   
    }
    
    // 绘制单个方块
    function drawBlock(context, x, y, color, size) {
        context.fillStyle = color;
        context.fillRect(x * size, y * size, size, size);
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 1;
        context.strokeRect(x * size, y * size, size, size);
        
        // 添加3D效果
        if (color !== '#111111') {
            context.fillStyle = 'rgba(255, 255, 255, 0.2)';
            context.fillRect(x * size, y * size, size, size * 0.3);
            
            context.fillStyle = 'rgba(0, 0, 0, 0.2)';
            context.fillRect(x * size, y * size + size * 0.7, size, size * 0.3);
        }
    }
    
    // 创建新方块 (根据复杂度选择形状)
    function createPiece() {
        // 如果没有下一个方块，就随机创建一个
        if (!nextPiece) {
            nextPiece = generateRandomPiece();
        }
        
        // 当前方块等于下一个方块
        currentPiece = {
            shape: JSON.parse(JSON.stringify(nextPiece.shape)), // 深拷贝
            color: nextPiece.color,
            x: Math.floor(currentSettings.cols / 2) - Math.floor(nextPiece.shape[0].length / 2),
            y: 0
        };
        
        // 创建新的下一个方块
        nextPiece = generateRandomPiece();
        
        // 绘制下一个方块预览
        drawNextPiece();
    }
    
    // 根据当前级别生成随机方块
    function generateRandomPiece() {
        let availableShapes = [...SHAPES.basic];
        
        if (currentSettings.complexity >= 2) {
            availableShapes = [...availableShapes, ...SHAPES.medium];
        }
        
        if (currentSettings.complexity >= 4) {
            availableShapes = [...availableShapes, ...SHAPES.advanced];
        }
        
        if (currentSettings.complexity >= 6) {
            availableShapes = [...availableShapes, ...SHAPES.expert];
        }
        
        const randomIndex = Math.floor(Math.random() * availableShapes.length);
        return {
            shape: availableShapes[randomIndex].shape,
            color: availableShapes[randomIndex].color,
            x: 0,
            y: 0
        };
    }
    
    // 绘制下一个方块预览
    function drawNextPiece() {
        nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        const blockSize = Math.min(
            nextPieceCanvas.width / (nextPiece.shape[0].length + 2),
            nextPieceCanvas.height / (nextPiece.shape.length + 2)
        );
        
        const offsetX = (nextPieceCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (nextPieceCanvas.height - nextPiece.shape.length * blockSize) / 2;
        
        try{
            nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(
                        nextPieceCtx, 
                        offsetX / blockSize + x, 
                        offsetY / blockSize + y, 
                        nextPiece.color,
                        blockSize
                    );
                }
            });
        });
        }catch(e){
            console.error("drawNextPiece",e);
        }
        
    }
    
    // 碰撞检测
    function collision(x, y, piece) {
        try{
           for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece[r].length; c++) {
                if (!piece[r][c]) continue;
                
                const newX = x + c;
                const newY = y + r;
                
                if (
                    newX < 0 || 
                    newX >= currentSettings.cols || 
                    newY >= currentSettings.rows ||
                    (newY >= 0 && board[newY][newX] !== '#111111')
                ) {
                    return true;
                }
            }
        } 
        }catch(e){
            console.error("collision", e);
        }
        
        return false;
    }
    
    // 旋转方块
    function rotatePiece() {
        if (!currentPiece || paused || gameOver) return;
        
        const originalShape = currentPiece.shape;
        // 转置矩阵并反转每行实现旋转
        const rows = currentPiece.shape.length;
        const cols = currentPiece.shape[0].length;
        const newShape = Array.from({ length: cols }, () => Array(rows).fill(0));
        
        try{
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    newShape[c][rows - 1 - r] = currentPiece.shape[r][c];
                }
            }
            
            // 检查旋转后是否会碰撞
            if (!collision(currentPiece.x, currentPiece.y, newShape)) {
                currentPiece.shape = newShape;
                drawBoard();
            } else {
                // 尝试墙踢 (wall kick) - 如果旋转后碰撞，尝试微调位置
                const kicks = [
                    { x: 1, y: 0 }, { x: -1, y: 0 },
                    { x: 0, y: 1 }, { x: 0, y: -1 }
                ];
                
                for (const kick of kicks) {
                    if (!collision(currentPiece.x + kick.x, currentPiece.y + kick.y, newShape)) {
                        currentPiece.shape = newShape;
                        currentPiece.x += kick.x;
                        currentPiece.y += kick.y;
                        drawBoard();
                        break;
                    }
                }
            }
        }catch(e){
            console.error("rotatePiece", e);
        }
        
    }
    
    // 移动方块
    function movePiece(direction) {
        if (!currentPiece || paused || gameOver) return;
        
        switch (direction) {
            case 'left':
                if (!collision(currentPiece.x - 1, currentPiece.y, currentPiece.shape)) {
                    currentPiece.x--;
                    drawBoard();
                }
                break;
            case 'right':
                if (!collision(currentPiece.x + 1, currentPiece.y, currentPiece.shape)) {
                    currentPiece.x++;
                    drawBoard();
                }
                break;
            case 'down':
                if (!collision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
                    currentPiece.y++;
                    drawBoard();
                } else {
                    lockPiece();
                }
                break;
            case 'drop':
                while (!collision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
                    currentPiece.y++;
                }
                drawBoard();
                lockPiece();
                break;
        }
    }
    
    // 锁定方块到游戏板
    function lockPiece() {
        try{
            // 将当前方块添加到游戏板
            for (let r = 0; r < currentPiece.shape.length; r++) {
                for (let c = 0; c < currentPiece.shape[r].length; c++) {
                    if (currentPiece.shape[r][c]) {
                        const boardY = currentPiece.y + r;
                        const boardX = currentPiece.x + c;
                        
                        if (boardY >= 0) {
                            board[boardY][boardX] = currentPiece.color;
                        } else {
                            // 如果方块锁定在游戏板外，游戏结束
                            endGame();
                            return;
                        }
                    }
                }
            } 
        }catch(e){
            console.error("lockPiece", e);
        }
        
        
        // 检查是否有完整的行
        checkLines();
        
        // 创建新方块
        createPiece();
        
        // 检查新方块是否立即碰撞（游戏结束条件）
        if (collision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
            endGame();
        }
    }
    
    // 检查并清除完整的行
    function checkLines() {
        let linesCleared = 0;
        try{
            for (let r = currentSettings.rows - 1; r >= 0; r--) {
                if (board[r].every(cell => cell !== '#111111')) {
                    // 移除该行
                    board.splice(r, 1);
                    // 在顶部添加新行
                    board.unshift(Array(currentSettings.cols).fill('#111111'));
                    linesCleared++;
                    // 因为删除了行，需要再次检查同一行（现在是新行）
                    r++;
                }
            }
        }catch(e){
            console.error("checkLines", e);
        }   
        
        
        if (linesCleared > 0) {
            // 更新分数和行数
            lines += linesCleared;
            score += calculateScore(linesCleared, level);
            
            // 更新显示
            scoreElement.textContent = score;
            linesElement.textContent = lines;
            
            // 检查是否需要升级
            const newLevel = Math.min(Math.floor(lines / 10) + 1, 6);
            if (newLevel > level) {
                level = newLevel;
                levelElement.textContent = level;
                levelSelector.value = level;
                
                // 更新游戏设置
                updateLevelSettings();
                
                // 加快游戏速度
                clearInterval(gameInterval);
                startGameLoop();
            }
        }
    }
    
    // 更新级别设置
    function updateLevelSettings() {
        currentSettings = LEVEL_SETTINGS[level];
        resizeCanvas();
        board = createBoard();
    }
    
    // 计算得分
    function calculateScore(lines, level) {
        // 使用更复杂的计分系统
        const baseScore = [0, 100, 300, 500, 800][Math.min(lines, 4)];
        const levelMultiplier = 1 + (level - 1) * 0.5; // 每级增加50%分数
        const comboBonus = lines * 50; // 连击奖励
        
        return Math.floor(baseScore * levelMultiplier) + comboBonus;
    }
    
    // 游戏主循环
    function gameLoop() {
        movePiece('down');
    }
    
    // 开始游戏循环
    function startGameLoop() {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, currentSettings.speed);
    }
    
    // 开始新游戏
    function startGame() {
        if (!gameOver && !paused) return;
        
        // 重置游戏状态
        if (gameOver) {
            updateLevelSettings();
            score = 0;
            lines = 0;
            level = parseInt(levelSelector.value);
            
            scoreElement.textContent = score;
            linesElement.textContent = lines;
            levelElement.textContent = level;
            
            gameOver = false;
        }
        
        paused = false;
        document.getElementById('pause-btn').textContent = '暂停 (P)';
        
        // 创建第一个方块
        createPiece();
        
        // 开始游戏循环
        startGameLoop();
        
        // 绘制游戏板
        drawBoard();
    }
    
    // 暂停/继续游戏
    function togglePause() {
        if (gameOver) return;
        
        paused = !paused;
        
        if (paused) {
            clearInterval(gameInterval);
            document.getElementById('pause-btn').textContent = '继续 (C)';
        } else {
            startGameLoop();
            document.getElementById('pause-btn').textContent = '暂停 (P)';
        }
    }
    
    // 继续游戏
    function continueGame() {
        if (!paused || gameOver) return;
        togglePause();
    }
    
    // 重置游戏 (自动开始新游戏)
    function resetGame() {
        endGame();
        startGame();
    }
    
    // 结束游戏
    function endGame() {
        clearInterval(gameInterval);
        gameOver = true;
        paused = false;
        document.getElementById('pause-btn').textContent = '暂停 (P)';
        
        // 显示游戏结束信息
        if (score > 0) {
            setTimeout(() => {
                alert(`游戏结束! 你的分数: ${score}\n消除行数: ${lines}`);
            }, 100);
        }
    }
    
    // 键盘控制
    document.addEventListener('keydown', function(e) {
        switch (e.key.toLowerCase()) {
            case 's': // 开始游戏
                startGame();
                break;
            case 'e': // 结束游戏
                endGame();
                break;
            case 'p': // 暂停
                togglePause();
                break;
            case 'c': // 继续
                continueGame();
                break;
            case 'r': // 重置
                resetGame();
                break;
            case 'arrowleft':
                case 'a':
                    movePiece('left');
                    break;
            case 'arrowright':
            case 'd':
                movePiece('right');
                break;
            case 'arrowdown':
            case 's':
                if (!e.ctrlKey) movePiece('down');
                break;
            case 'arrowup':
            case 'w':
                rotatePiece();
                break;
            case ' ': // 空格键 - 直接下落
                movePiece('drop');
                break;
        }
    });
    
    // 按钮事件监听
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    
    // 移动控制按钮事件
    document.getElementById('move-left').addEventListener('click', () => movePiece('left'));
    document.getElementById('move-right').addEventListener('click', () => movePiece('right'));
    document.getElementById('move-down').addEventListener('click', () => movePiece('down'));
    document.getElementById('rotate-btn').addEventListener('click', rotatePiece);
    
    // 级别选择器事件
    levelSelector.addEventListener('change', function() {
        // resetGame();
        level = parseInt(this.value);
        levelElement.textContent = level;
        updateLevelSettings();
        
        // 如果游戏正在进行，调整速度
        if (!gameOver && !paused) {
            clearInterval(gameInterval);
            startGameLoop();
        }
    });
    
    // 窗口大小改变时调整画布
    window.addEventListener('resize', function() {
        if (!gameOver) {
            resizeCanvas();
        }
    });
    
    // 初始化游戏
    resizeCanvas();
    drawBoard();
});