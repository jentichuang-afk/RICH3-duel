/**
 * RICH3 雙人對戰客戶端同步層
 * 負責：WebSocket 連線、狀態同步、輸入攔截
 */

const MP = {
    ws: null,
    connected: false,
    player_id: 0,
    client_id: null,
    server_url: (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
    
    // UI 元素
    ui: {
        statusDot: null,
        statusText: null,
        chatInput: null,
        chatLog: null,
    },

    // 初始化
    init() {
        this.ui.statusDot = document.getElementById('mp-status-dot');
        this.ui.statusText = document.getElementById('mp-status-text');
        this.ui.chatInput = document.getElementById('mp-chat-input');
        this.ui.chatLog = document.getElementById('mp-chat-log');
        
        // 綁定聊天送出
        if (this.ui.chatInput) {
            this.ui.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChat(this.ui.chatInput.value.trim());
                    this.ui.chatInput.value = '';
                }
            });
        }
        
        console.log("[MP] 雙人對戰模組已初始化");
    },

    // 連線到伺服器
    connect(name = "玩家") {
        // 顯示連線中 UI
        const modeSelect = document.getElementById('mp-mode-select');
        const connecting = document.getElementById('mp-connecting');
        if (modeSelect) modeSelect.style.display = 'none';
        if (connecting) connecting.style.display = 'block';
        
        return new Promise((resolve, reject) => {
            try {
                console.log(`[MP] 正在連線到 ${this.server_url}...`);
                this._updateStatus("連線中...", "yellow");
                
                this.ws = new WebSocket(this.server_url);
                
                this.ws.onopen = () => {
                    console.log("[MP] WebSocket 已連線");
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this._updateStatus("已連線", "green");
                    
                    // 註冊自己
                    this.ws.send(JSON.stringify({
                        type: "REGISTER",
                        name: name
                    }));
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this._handleMessage(data);
                        if (data.type === "REGISTERED") {
                            this.player_id = data.player_id;
                            this.client_id = data.client_id;
                            console.log(`[MP] 已註冊為玩家 ${this.player_id}: ${name}`);
                            resolve(data);
                        }
                    } catch (e) {
                        console.error("[MP] 訊息解析錯誤:", e);
                    }
                };
                
                this.ws.onclose = () => {
                    console.log("[MP] WebSocket 連線已斷開");
                    this.connected = false;
                    this._updateStatus("已斷線", "red");
                    
                    // 自動重連
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`[MP] ${this.reconnectDelay/1000}秒後嘗試重連 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        setTimeout(() => this.connect(name), this.reconnectDelay);
                    } else {
                        console.error("[MP] 重連失敗");
                        reject(new Error("連線失敗"));
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error("[MP] WebSocket 錯誤:", error);
                    this._updateStatus("連線錯誤", "red");
                };
                
            } catch (e) {
                console.error("[MP] 連線失敗:", e);
                this._updateStatus("連線失敗", "red");
                reject(e);
            }
        });
    },

    // 斷開連線
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    },

    // 發送行動到伺服器
    sendAction(action) {
        if (!this.connected || !this.ws) {
            console.warn("[MP] 未連線，無法發送行動");
            return;
        }
        this.ws.send(JSON.stringify({
            type: "ACTION",
            ...action
        }));
    },

    // 發送聊天
    sendChat(text) {
        if (!text) return;
        this.ws.send(JSON.stringify({
            type: "CHAT",
            text: text
        }));
    },

    // 發送開始遊戲
    startGame() {
        this.ws.send(JSON.stringify({ type: "START_GAME" }));
    },

    // 發送準備
    setReady() {
        this.ws.send(JSON.stringify({ type: "READY" }));
    },

    // ---- 內部處理 ----

    _handleMessage(data) {
        switch (data.type) {
            case "REGISTERED":
                this.player_id = data.player_id;
                this.client_id = data.client_id;
                this._applyServerState(data.state);
                this._showNotification(`你被分配為【${this.player_id === 1 ? "劉備" : this.player_id === 2 ? "曹操" : "觀戰者"}】`, "info");
                
                // 隱藏連線螢幕，顯示遊戲
                const connectScreen = document.getElementById('mp-connect-screen');
                const modeSelect = document.getElementById('mp-mode-select');
                const connecting = document.getElementById('mp-connecting');
                const connected = document.getElementById('mp-connected');
                if (connectScreen) connectScreen.style.display = 'none';
                const mpPanel = document.getElementById('mp-panel');
                if (mpPanel) mpPanel.style.display = 'block';
                
                // 派發自定義事件讓 index.html 處理
                window.dispatchEvent(new CustomEvent('MP_CONNECTED', {
                    detail: {
                        player_id: data.player_id,
                        client_id: data.client_id,
                        state: data.state
                    }
                }));
                
                // 初始化本地遊戲
                if (typeof hideOriginalStartScreen === 'function') {
                    hideOriginalStartScreen(this.player_id);
                }
                break;
                
            case "STATE_UPDATE":
                this._applyServerState(data.state);
                break;
                
            case "TURN_CHANGED":
                const cp = data.current_player;
                const isMe = (cp === this.player_id);
                if (isMe) {
                    this._showNotification("⬆️ 輪到你了！", "success");
                }
                break;
                
            case "PLAYER_JOINED":
                this._showNotification(`${data.name} 加入了遊戲`, "info");
                break;
                
            case "PLAYER_LEFT":
                if (data.name) {
                    this._showNotification(`${data.name} 離開了`, "warning");
                }
                break;
                
            case "ACTION_RESULT":
                if (data.error) {
                    this._showNotification(`⚠️ ${data.error}`, "error");
                }
                if (data.type === "DICE_ROLLED") {
                    this._animateDice(data.result);
                }
                if (data.type === "TURN_ENDED" || data.type === "TURN_CHANGED") {
                    this._checkOwnTurn();
                }
                break;
                
            case "GAME_STARTED":
                this._applyServerState(data.state);
                this._showNotification("🎮 遊戲開始！", "success");
                break;
                
            case "GAME_RESET":
                this._applyServerState(data.state);
                this._showNotification("🔄 遊戲已重置", "info");
                location.reload();
                break;
                
            case "GAME_OVER":
                const winner = data.winner;
                const winnerName = winner === 1 ? "劉備" : winner === 2 ? "曹操" : 
                                   winner === 3 ? "孫權" : winner === 4 ? "董卓" : "信長";
                this._showNotification(`🏆 遊戲結束！勝者：${winnerName}`, "success");
                break;
                
            case "CHAT":
                this._appendChat(data.name, data.text);
                break;
                
            case "READY_UPDATE":
                this._showNotification(`已準備人數: ${data.ready_count}/2`, "info");
                break;
                
            case "ERROR":
                this._showNotification(`⚠️ ${data.message}`, "error");
                break;
        }
    },

    _applyServerState(serverState) {
        /** 
         * 將伺服器狀態同步到本地端
         * 關鍵：只更新狀態，不重寫遊戲核心邏輯
         * 讓本地端的 game.js 繼續運作，只是把狀態更新套用上去
         */
        if (!serverState) return;

        // 更新金錢
        for (let i = 1; i <= 5; i++) {
            const sp = serverState.players[i.toString()];
            if (sp && typeof GAME_STATE !== 'undefined') {
                GAME_STATE.players[i].money = sp.money;
                GAME_STATE.players[i].position = sp.position;
                GAME_STATE.players[i].isBankrupt = sp.isBankrupt;
                // 只在人控制時更新（或在特定時機）
            }
        }

        // 更新地圖擁有權
        if (serverState.map_data && typeof MAP_DATA !== 'undefined') {
            serverState.map_data.forEach(m => {
                if (MAP_DATA[m.id]) {
                    MAP_DATA[m.id].owner = m.owner;
                    MAP_DATA[m.id].defenders = m.defenders || [];
                    MAP_DATA[m.id].development = m.development || 0;
                }
            });
        }

        // 更新當前玩家
        if (typeof GAME_STATE !== 'undefined') {
            GAME_STATE.currentPlayer = serverState.currentPlayer;
            GAME_STATE.currentRound = serverState.currentRound;
            GAME_STATE.gameOver = serverState.gameOver;
        }

        // 更新日誌
        if (serverState.logs && typeof GAME_STATE !== 'undefined') {
            GAME_STATE.logs = serverState.logs;
            this._syncLogPanel(serverState.logs);
        }

        // 更新 UI
        this._updatePlayerCards(serverState);
        this._updateBoardOwnership(serverState);
        this._updatePieces(serverState);
        
        // 更新按鈕狀態
        this._updateControls(serverState);

        // 更新同盟狀態
        if (typeof GAME_STATE !== 'undefined') {
            GAME_STATE.alliance = serverState.alliance || [];
        }
    },

    _updatePlayerCards(serverState) {
        for (let i = 1; i <= 5; i++) {
            const sp = serverState.players[i.toString()];
            if (!sp) continue;
            
            // 金錢
            const moneyEl = document.getElementById(`p${i}-money`);
            if (moneyEl) moneyEl.textContent = sp.money.toLocaleString();
            
            // 武將數
            const officerEl = document.getElementById(`p${i}-officers`);
            if (officerEl) officerEl.textContent = (sp.officers || []).length;
            
            // 啟用燈
            const card = document.getElementById(`p${i}-card`);
            if (card) {
                card.classList.toggle('active', sp.isBot ? false : (GAME_STATE.currentPlayer === i));
                // 如果是人操控的，顯示名稱
                if (sp.isBot === false) {
                    const h2 = card.querySelector('h2');
                    if (h2) {
                        const existingMark = h2.textContent.includes('(你)');
                        if (!existingMark && i === this.player_id) {
                            h2.textContent += " (你)";
                        }
                    }
                }
            }
        }
    },

    _updateBoardOwnership(serverState) {
        if (!serverState.map_data) return;
        
        serverState.map_data.forEach(m => {
            const cell = document.getElementById(`cell-${m.id}`);
            if (!cell) return;
            
            const marker = cell.querySelector('.owner-marker');
            if (!marker) return;
            
            // 移除所有 p-color 類
            for (let i = 1; i <= 5; i++) {
                marker.classList.remove(`p${i}-bg`);
            }
            
            if (m.owner) {
                marker.classList.add(`p${m.owner}-bg`);
                // 等級標記
                const levelBadge = cell.querySelector('.dev-level');
                if (m.development > 0) {
                    if (!levelBadge) {
                        const badge = document.createElement('span');
                        badge.className = 'dev-level';
                        badge.style.cssText = 'position:absolute;top:2px;right:2px;background:#f39c12;color:#000;font-size:0.6rem;padding:1px 3px;border-radius:3px;';
                        badge.textContent = `Lv${m.development}`;
                        cell.style.position = 'relative';
                        cell.appendChild(badge);
                    } else {
                        levelBadge.textContent = `Lv${m.development}`;
                    }
                }
            }
        });
    },

    _updatePieces(serverState) {
        for (let i = 1; i <= 5; i++) {
            const sp = serverState.players[i.toString()];
            if (!sp) continue;
            
            const piece = document.getElementById(`piece-p${i}`);
            if (!piece) continue;
            
            if (sp.isBankrupt) {
                piece.style.display = 'none';
                continue;
            }
            
            piece.style.display = '';
            
            const targetCell = document.getElementById(`cell-${sp.position}`);
            if (targetCell) {
                const board = document.getElementById('board');
                if (board && targetCell) {
                    const rect = targetCell.getBoundingClientRect();
                    const boardRect = board.getBoundingClientRect();
                    piece.style.left = `${rect.left - boardRect.left + rect.width / 2}px`;
                    piece.style.top = `${rect.top - boardRect.top + rect.height / 2}px`;
                }
            }
        }
    },

    _updateControls(serverState) {
        const cp = serverState.currentPlayer;
        const isMyTurn = (cp === this.player_id);
        
        const rollBtn = document.getElementById('btn-roll');
        if (rollBtn) rollBtn.disabled = !isMyTurn;
        
        const itemBtn = document.getElementById('btn-use-item');
        if (itemBtn) itemBtn.disabled = !isMyTurn;
        
        // 更新當前回合顯示
        const turnName = document.getElementById('current-turn-name');
        if (turnName && serverState.players[cp.toString()]) {
            const pName = serverState.players[cp.toString()].name;
            const colorClass = serverState.players[cp.toString()].colorClass || '';
            turnName.textContent = pName;
            turnName.className = colorClass + '-text';
        }
        
        // 高亮當前玩家卡片
        for (let i = 1; i <= 5; i++) {
            const card = document.getElementById(`p${i}-card`);
            if (card) card.classList.toggle('active', i === cp);
        }
    },

    _syncLogPanel(logs) {
        const logPanel = document.getElementById('log-panel');
        if (!logPanel || !logs) return;
        
        // 只更新最新的幾條，避免重繪整個面板
        logPanel.innerHTML = '';
        logs.slice(0, 20).forEach(msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            logPanel.prepend(p);
        });
    },

    _checkOwnTurn() {
        if (GAME_STATE && GAME_STATE.currentPlayer === this.player_id) {
            this._showNotification("⬆️ 輪到你了！", "success");
            // 如果有本地音效可以在這裡播放
        }
    },

    _animateDice(result) {
        const dice = document.getElementById('dice');
        if (!dice) return;
        
        const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const FINAL_FACE = result === 0 ? '💤' : DICE_FACES[result - 1];
        
        // 動畫
        let count = 0;
        const anim = setInterval(() => {
            dice.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
            count++;
            if (count > 10) {
                clearInterval(anim);
                dice.textContent = FINAL_FACE;
            }
        }, 60);
    },

    _showNotification(msg, type = "info") {
        // 建立通知元素
        const notif = document.createElement('div');
        notif.textContent = msg;
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            border-radius: 8px;
            font-weight: bold;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        // 加入動畫樣式（如果還沒有）
        if (!document.getElementById('mp-notif-style')) {
            const style = document.createElement('style');
            style.id = 'mp-notif-style';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notif);
        
        // 3秒後移除
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    },

    _appendChat(name, text) {
        const chatLog = document.getElementById('mp-chat-log');
        if (!chatLog) return;
        
        const entry = document.createElement('div');
        entry.style.cssText = 'padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem;';
        entry.innerHTML = `<strong style="color:#f1c40f;">${name}:</strong> <span style="color:#ecf0f1;">${this._escapeHtml(text)}</span>`;
        chatLog.appendChild(entry);
        chatLog.scrollTop = chatLog.scrollHeight;
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _updateStatus(text, color) {
        const dot = document.getElementById('mp-status-dot');
        const statusText = document.getElementById('mp-status-text');
        if (dot) dot.style.background = color;
        if (statusText) statusText.textContent = text;
    }
};

// DOM 載入後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MP.init());
} else {
    MP.init();
}