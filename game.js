/**
 * 三國大富翁 - 核心邏輯
 * 安全性注意:
 * - 狀態完全存放於記憶體變數中，不依賴 DOM 的 textContent 來計算金額
 * - 增加 parseInt() 確保運算安全，預防 XSS 及型別錯誤
 */

// Fallback: 如果 items.js 未能載入，此處提供備用資料
if (typeof window.ITEMS_DATA === 'undefined') {
    window.ITEMS_DATA = {
        1: { id: 1, name: "瞞天過海", price: 1000, desc: "使用後這個回合可以走兩次", type: "active" },
        2: { id: 2, name: "以逸待勞", price: 500, desc: "原地停留一次 (直接觸發事件)", type: "active" },
        3: { id: 3, name: "暗度陳倉", price: 1000, desc: "到達任意位置", type: "active_target_land" },
        4: { id: 4, name: "暗箭傷人", price: 1000, desc: "選定一名主公，使其有效能力最高的前三名武將受到 99% 重傷", type: "active_target_player" },
        5: { id: 5, name: "臨陣磨槍", price: 1000, desc: "攻城戰時可選用，我方全能力增加 10%", type: "active_buff" },
        6: { id: 6, name: "無懈可擊", price: 500, desc: "被動防禦，抵銷敵方對自己使用的負面計謀", type: "passive" },
        7: { id: 7, name: "迴光返照", price: 300, desc: "治療己方任意武將 (傷勢歸零)", type: "active_target_officer" },
        11: { id: 11, name: "離間之計", price: 2000, desc: "使用後立即解除現有同盟，且全場 15 回合內無法組成任何同盟", type: "active" }
    };
    console.warn('[Fallback] ITEMS_DATA was not loaded from items.js, using built-in fallback.');
}

// 遊戲資料模型
const GAME_STATE = {
    currentRound: 1, // Phase 70: 回合計算
    currentPlayer: 1, // 1: 劉備, 2: 曹操, 3: 孫權
    isWaitingForAction: false,
    gameOver: false,
    activePlayers: [1, 2, 3, 4, 5], // 記錄存活玩家的 ID
    changanOfficers: [], // 流亡長安的在野武將 (Phase 15)
    logs: [], // 記錄最近的日誌語記 (存檔用)
    alliance: [], // Phase 110: 同盟玩家 ID 陣列
    alienationTurns: 0, // 離間之計剩餘回合數
    // Phase 65: 擴充 items 陣列與相關 flag (actTwice, stayInPlace, siegeBuff, blockScheme)
    players: {
        1: { id: 1, name: "劉備", money: 15000, position: 0, colorClass: 'p1', nameClass: 'p1-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false, ownTurnCount: 0, itemCooldowns: {}, history: { sieges: [], item_hits: {}, land_attacks: {} } },
        2: { id: 2, name: "曹操", money: 15000, position: 0, colorClass: 'p2', nameClass: 'p2-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false, ownTurnCount: 0, itemCooldowns: {}, history: { sieges: [], item_hits: {}, land_attacks: {} } },
        3: { id: 3, name: "孫權", money: 15000, position: 0, colorClass: 'p3', nameClass: 'p3-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false, ownTurnCount: 0, itemCooldowns: {}, history: { sieges: [], item_hits: {}, land_attacks: {} } },
        4: { id: 4, name: "董卓", money: 15000, position: 0, colorClass: 'p4', nameClass: 'p4-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false, ownTurnCount: 0, itemCooldowns: {}, history: { sieges: [], item_hits: {}, land_attacks: {} } },
        5: { id: 5, name: "信長", money: 15000, position: 0, colorClass: 'p5', nameClass: 'p5-text', isBot: false, isBankrupt: false, officers: [], items: [], actTwice: false, stayInPlace: false, siegeBuff: false, blockScheme: false, ownTurnCount: 0, itemCooldowns: {}, history: { sieges: [], item_hits: {}, land_attacks: {} } }
    }
};

// getCityChainLength -> 已移至 utils.js



// getEffectiveStat -> 已移至 utils.js


// formatStatDisplay -> 已移至 utils.js


// applyInjury -> 已移至 utils.js


// 地圖資料 (20格)
const MAP_DATA = [
    { id: 0, name: "水鏡莊", type: "START", price: 0, owner: null },
    { id: 1, name: "長安", type: "LAND", price: 2500, owner: null, defenders: [], development: 0 },
    { id: 2, name: "洛陽", type: "LAND", price: 2000, owner: null, defenders: [], development: 0 },
    { id: 3, name: "許昌", type: "LAND", price: 2200, owner: null, defenders: [], development: 0 },
    { id: 4, name: "鄴城", type: "LAND", price: 2000, owner: null, defenders: [], development: 0 },
    { id: 5, name: "下邳", type: "LAND", price: 1200, owner: null, defenders: [], development: 0 },
    { id: 6, name: "宛城", type: "LAND", price: 1000, owner: null, defenders: [], development: 0 },
    { id: 7, name: "襄陽", type: "LAND", price: 1800, owner: null, defenders: [], development: 0 },
    { id: 8, name: "江陵", type: "LAND", price: 1800, owner: null, defenders: [], development: 0 },
    { id: 9, name: "長沙", type: "LAND", price: 1500, owner: null, defenders: [], development: 0 },
    { id: 10, name: "奇珍閣", type: "ITEM_SHOP", price: 0, owner: null }, // 招募與道具店
    { id: 11, name: "廬江", type: "LAND", price: 1200, owner: null, defenders: [], development: 0 },
    { id: 12, name: "建業", type: "LAND", price: 2200, owner: null, defenders: [], development: 0 },
    { id: 13, name: "永安", type: "LAND", price: 1000, owner: null, defenders: [], development: 0 },
    { id: 14, name: "成都", type: "LAND", price: 2200, owner: null, defenders: [], development: 0 },
    { id: 15, name: "漢中", type: "LAND", price: 1600, owner: null, defenders: [], development: 0 },
    { id: 16, name: "京都", type: "LAND", price: 2500, owner: null, defenders: [], development: 0 },
    { id: 17, name: "大阪", type: "LAND", price: 2000, owner: null, defenders: [], development: 0 },
    { id: 18, name: "名古屋", type: "LAND", price: 1500, owner: null, defenders: [], development: 0 },
    { id: 19, name: "江戶", type: "LAND", price: 2200, owner: null, defenders: [], development: 0 },
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// DOM 元件
const UI = {
    startScreen: document.getElementById('start-screen'),
    startScreenStage1: document.getElementById('start-screen-stage1'),
    startScreenStage2: document.getElementById('start-screen-stage2'),
    currentSelectingPlayer: document.getElementById('current-selecting-player'),

    btnRoll: document.getElementById('btn-roll'),
    dice: document.getElementById('dice'),
    p1Card: document.getElementById('p1-card'),
    p2Card: document.getElementById('p2-card'),
    p3Card: document.getElementById('p3-card'),
    p4Card: document.getElementById('p4-card'),
    p5Card: document.getElementById('p5-card'),
    p1Money: document.getElementById('p1-money'),
    p2Money: document.getElementById('p2-money'),
    p3Money: document.getElementById('p3-money'),
    p4Money: document.getElementById('p4-money'),
    p5Money: document.getElementById('p5-money'),
    currentTurnName: document.getElementById('current-turn-name'),
    logPanel: document.getElementById('log-panel'),
    pieces: {
        1: document.getElementById('piece-p1'),
        2: document.getElementById('piece-p2'),
        3: document.getElementById('piece-p3'),
        4: document.getElementById('piece-p4'),
        5: document.getElementById('piece-p5')
    },
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    btnModalYes: document.getElementById('btn-modal-yes'),
    btnModalExtra: document.getElementById('btn-modal-extra'),
    btnModalNo: document.getElementById('btn-modal-no'),
    officerModal: document.getElementById('officer-modal'),
    officerModalTitle: document.getElementById('officer-modal-title'),
    officerModalMessage: document.getElementById('officer-modal-message'),
    officerList: document.getElementById('officer-list') || document.getElementById('officer-list-tbody'),
    btnOfficerConfirm: document.getElementById('btn-officer-confirm'),
    btnOfficerCancel: document.getElementById('btn-officer-cancel'),

    infoModal: document.getElementById('info-modal'),
    infoModalTitle: document.getElementById('info-modal-title'),
    infoModalMessage: document.getElementById('info-modal-message'),
    btnInfoClose: document.getElementById('btn-info-close'),

    // 圖鑑專用
    btnShowEncyclopedia: document.getElementById('btn-show-encyclopedia'),
    encyclopediaModal: document.getElementById('encyclopedia-modal'),
    btnEncyclopediaClose: document.getElementById('btn-encyclopedia-close'),
    encyclopediaTbody: document.getElementById('encyclopedia-tbody'),

    // 長安招募專用
    changanModal: document.getElementById('changan-modal'),
    changanOfficerList: document.getElementById('changan-officer-list'),
    btnChanganConfirm: document.getElementById('btn-changan-confirm'),
    btnChanganCancel: document.getElementById('btn-changan-cancel'),
    changanTotalCost: document.getElementById('changan-total-cost'),

    // Phase 65: 道具系統專用 UI
    btnUseItem: document.getElementById('btn-use-item'),
    changanChoiceModal: document.getElementById('changan-choice-modal'),
    btnChanganGoRecruit: document.getElementById('btn-changan-go-recruit'),
    btnChanganGoShop: document.getElementById('btn-changan-go-shop'),
    btnChanganLeave: document.getElementById('btn-changan-leave'),

    changanItemShopModal: document.getElementById('changan-item-shop-modal'),
    changanItemList: document.getElementById('changan-item-list'),
    btnChanganBuyItem: document.getElementById('btn-changan-buy-item'),
    btnChanganShopCancel: document.getElementById('btn-changan-shop-cancel'),
    changanItemCost: document.getElementById('changan-item-cost'),

    inventoryModal: document.getElementById('inventory-modal'),
    inventoryItemList: document.getElementById('inventory-item-list'),
    btnConfirmUseItem: document.getElementById('btn-confirm-use-item'),
    btnCancelInventory: document.getElementById('btn-cancel-inventory'),

    targetSelectModal: document.getElementById('target-select-modal'),
    targetSelectTitle: document.getElementById('target-select-title'),
    targetSelectMessage: document.getElementById('target-select-message'),
    targetSelectList: document.getElementById('target-select-list'),
    btnTargetConfirm: document.getElementById('btn-target-confirm'),
    btnTargetCancel: document.getElementById('btn-target-cancel'),
    
    // Phase 69: 臨陣磨槍 Siege checkbox
    siegeBuffContainer: document.getElementById('siege-buff-container'),
    useSiegeBuffCheckbox: document.getElementById('use-siege-buff-checkbox'),

    // Save/Load
    btnSaveGame: document.getElementById('btn-save-game'),
    btnLoadGame: document.getElementById('btn-load-game'),
    btnRestartGame: document.getElementById('btn-restart-game'),

    // Drive Sync UI
    driveSyncPanel: document.getElementById('drive-sync-panel'),
    driveAuthLoggedOut: document.getElementById('drive-auth-logged-out'),
    driveAuthLoggedIn: document.getElementById('drive-auth-logged-in'),
    btnDriveLogin: document.getElementById('btn-drive-login'),
    btnDriveLogout: document.getElementById('btn-drive-logout'),
    saveSlotsGrid: document.getElementById('save-slots-grid')
};

// Modal 回調函數
let modalConfirmCallback = null;
let modalExtraCallback = null;
let modalCancelCallback = null;
let officerConfirmCallback = null;
let officerCancelCallback = null;
let selectedOfficers = [];
let maxSelectableOfficers = 3;

// 初始化遊戲
function initGame() {
    console.log("Game initialization started...");

    try {
        // 優先綁定核心按鈕，防止後續資料出錯導致功能全滅
        if (UI.btnRoll) UI.btnRoll.addEventListener('click', handleRollDice);
        // Phase 65: 使用道具
        if (UI.btnUseItem) UI.btnUseItem.addEventListener('click', openInventory);
        if (UI.btnShowEncyclopedia) UI.btnShowEncyclopedia.addEventListener('click', openEncyclopedia);
        if (UI.btnEncyclopediaClose) UI.btnEncyclopediaClose.addEventListener('click', () => UI.encyclopediaModal.classList.add('hidden'));

        // Save/Load bindings
        if (UI.btnSaveGame) UI.btnSaveGame.addEventListener('click', saveGame);
        if (UI.btnLoadGame) UI.btnLoadGame.addEventListener('click', loadGame);
        if (UI.btnRestartGame) UI.btnRestartGame.addEventListener('click', () => {
            if (confirm("確定要重新開始遊戲嗎？目前的進度將會遺失。")) {
                location.reload();
            }
        });
        
        // Drive Sync bindings
        if (UI.btnDriveLogin) UI.btnDriveLogin.addEventListener('click', handleDriveLogin);
        if (UI.btnDriveLogout) UI.btnDriveLogout.addEventListener('click', handleDriveLogout);

        // Initialize Google APIs
        initGoogleAPIs();

        // 分配初始武將 (強化錯誤處理)
        if (typeof OFFICERS_DATA === 'undefined') {
            throw new Error("找不到 OFFICERS_DATA，請檢查 officers.js 是否載入成功。");
        }

        OFFICERS_DATA.forEach(officer => {
            if (officer && officer.faction && GAME_STATE.players[officer.faction]) {
                GAME_STATE.players[officer.faction].officers.push(officer.id);
            } else {
                console.warn(`跳過無效武將資料或陣營:`, officer);
            }
        });

        // 綁定其餘 Modal 事件
        if (UI.btnModalYes) UI.btnModalYes.addEventListener('click', () => {
            hideModal();
            if (modalConfirmCallback) {
                const cb = modalConfirmCallback;
                modalConfirmCallback = null;
                try {
                    cb();
                } catch (e) {
                    console.error('modalConfirmCallback error:', e);
                    log(`[系統區] 確認回調錯誤: ${e.message}`);
                    GAME_STATE.isWaitingForAction = false;
                    endTurn();
                }
            }
        });


        if (UI.btnModalExtra) UI.btnModalExtra.addEventListener('click', () => {
            hideModal();
            if (modalExtraCallback) {
                const cb = modalExtraCallback;
                modalExtraCallback = null;
                cb();
            }
        });

        UI.btnModalNo.addEventListener('click', () => {
            hideModal();
            if (modalCancelCallback) {
                modalCancelCallback();
                modalCancelCallback = null;
            }
        });

        UI.btnOfficerConfirm.addEventListener('click', () => {
            hideOfficerModal();
            let consumedBuff = false;
            
            // Phase 69: Consume item if checked
            if (UI.useSiegeBuffCheckbox && UI.useSiegeBuffCheckbox.checked) {
                if (currentSiegePlayer && currentSiegePlayer.items) {
                    const itemIdx = currentSiegePlayer.items.findIndex(it => it.id === 5);
                    if (itemIdx !== -1) {
                        consumeItem(currentSiegePlayer, itemIdx);
                        playItemAnimation("臨陣磨槍", currentSiegePlayer.name);
                        log(`🔥 士氣大振！${currentSiegePlayer.name} 使用了「臨陣磨槍」，全軍能力提升 10%！`);
                        consumedBuff = true;
                    }
                }
            }

            if (officerConfirmCallback) {
                officerConfirmCallback([...selectedOfficers], consumedBuff);
                officerConfirmCallback = null;
            }
        });

        UI.btnOfficerCancel.addEventListener('click', () => {
            hideOfficerModal();
            if (officerCancelCallback) {
                officerCancelCallback();
                officerCancelCallback = null;
            }
        });

        updateOfficerCountUI(1);
        updateOfficerCountUI(2);
        updateOfficerCountUI(3);
        updateOfficerCountUI(4); // Added for player 4

        UI.btnInfoClose.addEventListener('click', () => {
            UI.infoModal.classList.add('hidden');
        });

        UI.btnShowEncyclopedia.addEventListener('click', () => {
            openEncyclopedia();
        });

        UI.btnEncyclopediaClose.addEventListener('click', () => {
            UI.encyclopediaModal.classList.add('hidden');
        });

        setupEncyclopediaSort();

        if (UI.useSiegeBuffCheckbox) {
            UI.useSiegeBuffCheckbox.addEventListener('change', () => {
                if (currentSiegePlayer && window.currentDefIds) {
                    const result = getBestSiegeTeam(currentSiegePlayer.officers, window.currentDefIds, currentSiegeCityId, UI.useSiegeBuffCheckbox.checked, true);
                    const bestTeam = result.team;
                    if (bestTeam && bestTeam.length > 0) {
                        selectedOfficers = [...bestTeam];
                    } else {
                        selectedOfficers = [];
                    }
                    renderSiegeOfficerList();
                } else {
                    updateWinRateDisplay();
                }
            });
        }

        // 點擊玩家頭像卡片可檢視麾下武將與駐地
        if (UI.p1Card) { UI.p1Card.addEventListener('click', () => showPlayerOfficers(1)); UI.p1Card.style.cursor = 'pointer'; }
        if (UI.p2Card) { UI.p2Card.addEventListener('click', () => showPlayerOfficers(2)); UI.p2Card.style.cursor = 'pointer'; }
        if (UI.p3Card) { UI.p3Card.addEventListener('click', () => showPlayerOfficers(3)); UI.p3Card.style.cursor = 'pointer'; }
        if (UI.p4Card) { UI.p4Card.addEventListener('click', () => showPlayerOfficers(4)); UI.p4Card.style.cursor = 'pointer'; }
        if (UI.p5Card) { UI.p5Card.addEventListener('click', () => showPlayerOfficers(5)); UI.p5Card.style.cursor = 'pointer'; }

        // 為所有地圖格子加上點擊事件 (查看情報)
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', () => {
                // 如果正在進行地圖選城模式 (殺人放火)，不觸發情報視窗
                if (document.getElementById('arson-map-banner')) return;

                const index = parseInt(cell.getAttribute('data-index'), 10);
                const landInfo = MAP_DATA[index];
                if (!landInfo) return;


                let info = `<div style="border-bottom: 2px solid #8e735b; padding-bottom: 10px; margin-bottom: 10px;">`;
                if (landInfo.type === 'START' || landInfo.type === 'ITEM_SHOP') {
                    info += `<p style="font-size: 1.1rem; color: #f1c40f;">此地乃中立設施。</p>`;
                    info += `</div>`;
                    
                    let wildOfficers = GAME_STATE.changanOfficers.map(id => getOfficer(id)).filter(o => o != null);
                    if (wildOfficers.length > 0) {
                        info += '<p style="font-weight: bold; margin-top: 10px; border-left: 4px solid #f1c40f; padding-left: 8px;">【在野武將】</p>';
                        info += '<table style="width:100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 8px; border: 1px solid var(--border-color);">';
                        info += '<tr style="background:rgba(255,255,255,0.1); border-bottom: 2px solid var(--border-color); font-size: 0.75rem;">';
                        info += '<th style="padding:4px; width:15%;">姓名</th><th>武</th><th>智</th><th>統</th><th>政</th><th>魅</th><th>運</th><th style="width:35%;">特技</th></tr>';
                        wildOfficers.forEach(o => {
                            let injuryClass = o.injuryRate > 0 ? 'background-color: rgba(231,76,60,0.1); color: #e74c3c;' : '';
                            let injuryIcon = o.injuryRate > 0 ? '🤕' : '';
                            let skills = [];
                            if (OFFICER_SKILLS[o.id]) skills.push(`<strong style="color:var(--primary-color)">【${OFFICER_SKILLS[o.id].name}】</strong>`);
                            let ss = getSuperSkillDescription(o);
                            if (ss) skills.push(ss);
                            info += `<tr style="border-bottom: 1px dotted var(--border-color); ${injuryClass}">`;
                            info += `<td style="padding: 6px 4px; font-weight:bold;">${injuryIcon}${o.name}</td>`;
                            for (let i = 1; i <= 6; i++) {
                                let val = getEffectiveStat(o, i);
                                info += `<td style="text-align:center;">${val}</td>`;
                            }
                            info += `<td style="font-size: 0.75rem; padding: 4px; line-height: 1.3;">${skills.join('<br>')}</td>`;
                            info += `</tr>`;
                        });
                        info += '</table>';
                    } else {
                        info += '<p style="color: #999; font-style: italic;">(目前沒有武將在野)</p>';
                    }
                } else if (landInfo.owner) {
                    const owner = GAME_STATE.players[landInfo.owner];
                    const cityValue = Math.floor(landInfo.price * (1 + (landInfo.development || 0) * 0.1));
                    const tax = getCityTaxIncome(landInfo);
                    info += `<p><strong>擁有者：</strong>${owner.name}</p>`;
                    info += `<p><strong>城池價值：</strong><span style="color:#d35400; font-weight:bold;">$${cityValue}</span> (Lv.${landInfo.development || 0})</p>`;
                    info += `<p><strong>過路費：</strong>$${getCityToll(landInfo)}</p>`;
                    info += `<p><strong>每回合稅收：</strong>$${tax}</p>`;
                    const geoBonus = getDevelopmentGeoBonus(landInfo.development || 0);
                    const chainBonus = getCityChainLength(landInfo.owner, index);
                    const totalGeoBonus = geoBonus + chainBonus;
                    info += `<p><strong>屬性加成：</strong>價值 +${(landInfo.development || 0) * 10}% / 地利 +${totalGeoBonus}%</p>`;
                    info += `</div>`;

                    if (landInfo.defenders.length > 0) {
                        info += '<p style="font-weight: bold; margin-top: 10px; border-left: 4px solid var(--primary-color); padding-left: 8px;">【駐軍陣容】</p>';
                        info += '<table style="width:100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 8px; border: 1px solid var(--border-color);">';
                        info += '<tr style="background:rgba(255,255,255,0.1); border-bottom: 2px solid var(--border-color); font-size: 0.75rem;">';
                        info += '<th style="padding:4px; width:15%;">姓名</th><th>武</th><th>智</th><th>統</th><th>政</th><th>魅</th><th>運</th><th style="width:35%;">特技</th></tr>';
                        let totalStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                        landInfo.defenders.forEach(id => {
                            const o = getOfficer(id);
                            if (o) {
                                let injuryClass = o.injuryRate > 0 ? 'background-color: rgba(231,76,60,0.1); color: #e74c3c;' : '';
                                let injuryIcon = o.injuryRate > 0 ? '🤕' : '';
                                let skills = [];
                                if (OFFICER_SKILLS[id]) skills.push(`<strong style="color:var(--primary-color)">【${OFFICER_SKILLS[id].name}】</strong>`);
                                let ss = getSuperSkillDescription(o);
                                if (ss) skills.push(ss);
                                info += `<tr style="border-bottom: 1px dotted var(--border-color); ${injuryClass}">`;
                                let isHomeCity = (typeof OFFICER_HOME_CITY !== 'undefined' && OFFICER_HOME_CITY[o.id] === landInfo.id);
                                let nameDisplay = isHomeCity ? `<span style="color:#00bcd4; font-weight:bold; text-shadow: 0 0 3px rgba(0,188,212,0.6);">🏠 ${o.name}</span>` : o.name;
                                info += `<td style="padding: 6px 4px; font-weight:bold;">${injuryIcon}${nameDisplay}</td>`;
                                for (let i = 1; i <= 6; i++) {
                                    let val = getEffectiveStat(o, i);
                                    totalStats[i] += val;
                                    info += `<td style="text-align:center;">${val}</td>`;
                                }
                                info += `<td style="font-size: 0.75rem; padding: 4px; line-height: 1.3;">${skills.join('<br>')}</td>`;
                                info += `</tr>`;
                            }
                        });
                        info += '<tr style="background: rgba(0,0,0,0.2); font-weight: bold; border-top: 2px solid var(--gold);">';
                        info += '<td style="padding: 6px 4px; text-align: right;">團隊總合</td>';
                        for (let i = 1; i <= 6; i++) {
                            info += `<td style="text-align:center; color: var(--primary-color);">${totalStats[i]}</td>`;
                        }
                        info += '<td></td></tr>';
                        info += '</table>';
                    } else {
                        info += '<p style="color: #999; font-style: italic;">(目前空無一人駐守)</p>';
                    }
                } else {
                    info += `<p style="font-size: 1.1rem; color: #7f8c8d;">此城池尚未被佔領。</p>`;
                    info += `<p style="margin-top:10px;"><strong>佔領價格：</strong>$${landInfo.price}</p>`;
                    info += `</div>`;
                }

                if (typeof OFFICER_HOME_CITY !== 'undefined') {
                    let homeOfficers = Object.keys(OFFICER_HOME_CITY)
                        .filter(id => OFFICER_HOME_CITY[id] === landInfo.id)
                        .map(id => getOfficer(parseInt(id)))
                        .filter(o => o != null)
                        .map(o => o.name);
                    if (homeOfficers.length > 0) {
                        info += `<div style="margin-top: 15px; padding: 10px; background: rgba(0, 188, 212, 0.1); border-left: 4px solid #00bcd4; border-radius: 4px;">`;
                        info += `<p style="color: #00bcd4; font-weight: bold; margin-bottom: 5px; font-size: 0.9rem;">🏠 專屬故地加成英雄 (戰鬥全能力 +5%)</p>`;
                        info += `<p style="font-size: 0.85rem; color: #ddd; line-height: 1.4;">${homeOfficers.join('、')}</p>`;
                        info += `</div>`;
                    }
                }
                UI.infoModalTitle.textContent = `${landInfo.name} 情報`;
                UI.infoModalMessage.innerHTML = info;
                UI.infoModal.classList.remove('hidden');
            });
        });

        // 等待玩家選擇人數與勢力...
        // 初始化地圖顯示
        updateBoardUI();

        console.log("Game initialized successfully.");
    } catch (e) {
        console.error("Critical error in initGame:", e);
        // 若日誌尚未準備好，嘗試在 body 頂端警告
        if (UI && UI.logPanel) {
            log(`[致命錯誤] 遊戲初始化失敗: ${e.message}`);
        } else {
            alert(`遊戲初始化致命錯誤: ${e.message}`);
        }
    }
}

let selectedPlayerCount = 1;
let humanFactions = [];

function updateFactionButtons() {
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`btn-faction-${i}`);
        if (btn) btn.style.display = humanFactions.includes(i) ? 'none' : 'inline-block';
    }
}

// 第一步：選擇遊玩人數
function selectPlayerCount(count) {
    selectedPlayerCount = count;
    UI.startScreenStage1.classList.add('hidden');
    UI.startScreenStage2.classList.remove('hidden');

    if (count === 5) {
        // 如果選 5 人，不需選陣營
        humanFactions = [1, 2, 3, 4, 5];
        startGame();
    } else {
        UI.currentSelectingPlayer.textContent = humanFactions.length + 1;
        updateFactionButtons();
    }
}

// 第二步：選擇操作勢力
function selectFaction(factionId) {
    humanFactions.push(factionId);
    document.getElementById(`btn-faction-${factionId}`).style.display = 'none';

    if (humanFactions.length < selectedPlayerCount) {
        UI.currentSelectingPlayer.textContent = humanFactions.length + 1;
        updateFactionButtons();
    } else {
        startGame();
    }
}

// 開始遊戲初始化
function startGame() {
    UI.startScreen.classList.add('hidden');

    // 沒被人類選走的陣營，給電腦設定
    for (let i = 1; i <= 5; i++) {
        GAME_STATE.players[i].isBot = !humanFactions.includes(i);

        // Phase 55: 開局隨機初始站位
        GAME_STATE.players[i].position = Math.floor(Math.random() * 20);
        
        // Phase 75: 天下為公單局使用次數初始化
        GAME_STATE.players[i].item9UseCount = 0;

        // 如果電腦玩家（非人類），顯示其 UI 為電腦標記，並設定初始金額為 20000
        if (GAME_STATE.players[i].isBot) {
            GAME_STATE.players[i].money = 20000;
            updateMoney(i, 0); // 刷新 UI 顯示
            const card = UI[`p${i}Card`];
            const strongElement = card.querySelector('.info h2'); // 原為 strong, 檢查 index.html 發現是 h2
            if (strongElement && !strongElement.textContent.includes('(電腦)')) {
                strongElement.textContent += " (電腦)";
            }
        }
    }

    // Phase 55: 隨機決定起手順序
    GAME_STATE.activePlayers = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    GAME_STATE.currentPlayer = GAME_STATE.activePlayers[0];

    // 更新 UI 指示燈
    UI.p1Card.classList.toggle('active', GAME_STATE.currentPlayer === 1);
    UI.p2Card.classList.toggle('active', GAME_STATE.currentPlayer === 2);
    UI.p3Card.classList.toggle('active', GAME_STATE.currentPlayer === 3);
    if (UI.p4Card) UI.p4Card.classList.toggle('active', GAME_STATE.currentPlayer === 4);
    if (UI.p5Card) UI.p5Card.classList.toggle('active', GAME_STATE.currentPlayer === 5);

    log(`遊戲開始！玩家操作：${humanFactions.map(id => GAME_STATE.players[id].name).join('、')}。`);

    // 首次排位
    setTimeout(() => updatePiecesPosition(true), 100);
    checkTurn();
}

// 日誌系統
function log(message) {
    const p = document.createElement('p');
    p.textContent = message; // 防止 XSS
    UI.logPanel.prepend(p);
    
    // 存入狀態以供存檔使用 (保留最近 50 條)
    GAME_STATE.logs.unshift(message);
    if (GAME_STATE.logs.length > 50) GAME_STATE.logs.pop();
}


// 檢查當前回合 (處理 AI)
function checkTurn() {
    if (GAME_STATE.gameOver) return;

    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];

    // UI 控制
    enableRollButton(!currentPlayer.isBot);
    // Phase 65: 控制使用道具按鈕 (戰鬥中或動畫中不可用)
    if (UI.btnUseItem) {
        UI.btnUseItem.disabled = currentPlayer.isBot || GAME_STATE.isWaitingForAction;
    }

    if (!currentPlayer.isBot) {
        checkPassiveHeal(currentPlayer);
    }

    if (currentPlayer.isBot) {
        log(`[電腦] 輪到 ${currentPlayer.name} 回合...`);
        const botPlayerId = currentPlayer.id;

        if (typeof isOllamaEnabled === 'function' && isOllamaEnabled() && currentPlayer.items.length > 0) {
            GAME_STATE.isWaitingForAction = true;
            askOllamaItemUsage(currentPlayer).then(async decision => {
                GAME_STATE.isWaitingForAction = false;
                let usedItem = false;
                if (decision && decision.use_item && decision.item_index != null && decision.item_index < currentPlayer.items.length) {
                    const idx = decision.item_index;
                    const item = currentPlayer.items[idx];
                    let target = null;
                    if (decision.target_land_id != null) target = MAP_DATA[decision.target_land_id];
                    else if (decision.target_player_id != null) target = GAME_STATE.players[decision.target_player_id];
                    else if (decision.target_officer_id != null) target = decision.target_officer_id;
                    if (decision.trash_talk) await showTrashTalk(currentPlayer.name, decision.trash_talk);
                    useItem(currentPlayer, { ...item, index: idx }, target);
                    usedItem = true;
                }
                // Ollama 決定不用計謀 → 讓傳統邏輯再補一次 (確保急迫道具不被浪費)
                if (!usedItem) {
                    handleAIItemUsage(currentPlayer);
                }
                setTimeout(() => checkTurnRollDice(botPlayerId), 1500);
            }).catch(e => {
                console.error("Ollama item use error:", e);
                GAME_STATE.isWaitingForAction = false;
                handleAIItemUsage(currentPlayer);
                setTimeout(() => checkTurnRollDice(botPlayerId), 3000);
            });
        } else {
            handleAIItemUsage(currentPlayer);
            setTimeout(() => checkTurnRollDice(botPlayerId), 3000); // 增加一點延遲讓玩家看清楚 AI 動作
        }
    }
}

function checkTurnRollDice(botPlayerId) {
    const activePlayer = GAME_STATE.players[GAME_STATE.currentPlayer];
    if (!activePlayer || !activePlayer.isBot || activePlayer.id !== botPlayerId) {
        console.log(`[Debug] Skipping handleRollDice: turn has changed to ${activePlayer?.name}`);
        return;
    }
    if (GAME_STATE.isWaitingForAction) {
        console.log(`[Debug] Skipping handleRollDice for AI - isWaitingForAction is true`);
        return;
    }
    handleRollDice();
}

// handleAIItemUsage -> 已移至 ai_model.js

// [以下已移除：原 handleAIItemUsage 全文]


// 擲骰子
function handleRollDice() {
    if (GAME_STATE.gameOver) return;
    if (GAME_STATE.isWaitingForAction) {
        log(`[提示] 系統正在處理對話框或動畫，請稍後再試。`);
        // 作為一種防禦機制，如果真的卡死，讓使用者有個反饋
        // 特別設計一個強行解除鎖定的 fallback:
        // 如果這個 log 連續出現，代表狀態機可能死鎖，直接釋放
        if (!window.__deadlockCounter) window.__deadlockCounter = 0;
        window.__deadlockCounter++;
        if (window.__deadlockCounter >= 3) {
            log(`[系統區] 偵測到可能卡死，強行解除等待鎖定。`);
            console.error('[Deadlock] Force clearing all modals and isWaitingForAction');
            try { hideModal(); } catch(e) {}
            try { hideOfficerModal(); } catch(e) {}
            // 安全關閉所有可能的 Modal
            try { UI.changanModal.classList.add('hidden'); } catch(e) {}
            try { UI.changanChoiceModal.classList.add('hidden'); } catch(e) {}
            try { UI.changanItemShopModal.classList.add('hidden'); } catch(e) {}
            try { UI.inventoryModal.classList.add('hidden'); } catch(e) {}
            try { UI.targetSelectModal.classList.add('hidden'); } catch(e) {}
            GAME_STATE.isWaitingForAction = false;
            window.__deadlockCounter = 0;
            enableRollButton(true);
        }
        return;
    }
    window.__deadlockCounter = 0;

    enableRollButton(false);
    UI.dice.classList.add('rolling');

    // 模擬擲骰延遲
    setTimeout(() => {
        UI.dice.classList.remove('rolling');
        const player = GAME_STATE.players[GAME_STATE.currentPlayer];

        let rollResult = Math.floor(Math.random() * 6) + 1; // 1-6

        // Phase 65: 【以逸待勞】 原地停留
        if (player.stayInPlace) {
            player.stayInPlace = false;
            rollResult = 0;
            log(`💤 【以逸待勞】！${player.name} 選擇原地休整。`);
        } else {
            log(`${player.name} 擲出了 ${rollResult} 點。`);
        }

        UI.dice.textContent = rollResult === 0 ? '💤' : DICE_FACES[rollResult - 1];

        movePlayer(player, rollResult);
    }, 600);
}

// 移動玩家格子
function movePlayer(player, steps) {
    let oldPos = player.position;
    let newPos = (oldPos + steps) % 20;

    // 已依需求取消經過起點發放 $2000 的設定

    player.position = newPos;
    updatePiecesPosition();

    // 抵達後觸發事件
    setTimeout(() => {
        triggerLandEvent(player, MAP_DATA[newPos]);
    }, 600); // 等待 CSS 動畫完成
}

// 根據玩家位置更新棋子座標 (相對於對應 cell)
function updatePiecesPosition(initial = false) {
    for (let i = 1; i <= 5; i++) {
        const p = GAME_STATE.players[i];
        const piece = UI.pieces[i];

        if (!piece) continue; // For pieces that might not be visible initially

        if (p.isBankrupt) {
            piece.style.display = 'none'; // 破產隱藏棋子
            continue;
        }

        const targetCell = document.getElementById(`cell-${p.position}`);

        if (targetCell && piece) {
            const rect = targetCell.getBoundingClientRect();
            const boardRect = document.getElementById('board').getBoundingClientRect();

            // 計算相對於 board 的中心
            let left = rect.left - boardRect.left + (rect.width / 2);
            let top = rect.top - boardRect.top + (rect.height / 2);

            piece.style.left = `${left}px`;
            piece.style.top = `${top}px`;
        }
    }
}

// 土地事件處理
function triggerLandEvent(player, landInfo) {
    if (landInfo.type === "START" || landInfo.type === "ITEM_SHOP") {
        let offeredIds = [];
        if (GAME_STATE.changanOfficers.length > 0) {
            // Phase 64: 隨機選出至多 3 名在野武將
            offeredIds = [...GAME_STATE.changanOfficers].sort(() => 0.5 - Math.random()).slice(0, 3);
        }
        
        let cityName = landInfo.name;
        
        if (offeredIds.length > 0) {
            log(`${player.name} 抵達了${cityName}。市集人聲鼎沸，發現了 ${offeredIds.length} 名在野武將的蹤跡與各式奇珍異寶！`);
        } else {
            log(`${player.name} 抵達了${cityName}。雖無在野武將可供招募，仍可逛逛市集購買奇珍異寶。`);
        }

        if (player.isBot) {
            handleCityMenuAI(player, offeredIds, cityName);
        } else {
            // Update modal title to reflect the city
            const modalTitle = UI.changanChoiceModal.querySelector('h3');
            if (modalTitle) modalTitle.textContent = `${cityName}行館`;
            showChanganChoiceModal(player, offeredIds);
        }
        return;
    }

    if (landInfo.owner === null) {
        let currentPrice = parseInt(landInfo.price);
        let priceText = `$${currentPrice}`;

        // 無人土地
        if (player.money < currentPrice) {
            log(`${player.name} 停在 ${landInfo.name}，但資金不足無法佔領 (持有 $${player.money}，需要 ${priceText})。`);
            endTurn();
        } else if (player.officers && player.officers.length === 0) {
            log(`${player.name} 停在 ${landInfo.name}，但無可用武將可派駐，放棄佔領。`);
            endTurn();
        } else if (player.money >= currentPrice && player.officers.length > 0) {
            if (player.isBot) {
                if (typeof isOllamaEnabled === 'function' && isOllamaEnabled()) {
                    GAME_STATE.isWaitingForAction = true;
                    askOllamaBuyLandDecision(player, landInfo).then(async decision => {
                        GAME_STATE.isWaitingForAction = false;
                        if (decision && decision.trash_talk) {
                            await showTrashTalk(player.name, decision.trash_talk);
                        }
                        if (decision && decision.action === 'buy' && decision.defenders && decision.defenders.length > 0) {
                            // 過濾掉不屬於閒置清單的無效武將
                            let validDefenders = decision.defenders.filter(id => player.officers.includes(id));
                            if (validDefenders.length > 3) validDefenders = validDefenders.slice(0, 3);
                            if (validDefenders.length === 0) {
                                log(`[電腦] ${player.name} 決定放棄佔領 ${landInfo.name}。`);
                                endTurn();
                            } else {
                                executeBuyLand(player, landInfo, validDefenders);
                            }
                        } else {
                            log(`[電腦] ${player.name} 決定放棄佔領 ${landInfo.name}。`);
                            endTurn();
                        }
                    }).catch(e => {
                        console.error('Ollama Error:', e);
                        log(`[電腦] ${player.name} 思緒混亂，放棄佔領 ${landInfo.name}。`);
                        GAME_STATE.isWaitingForAction = false;
                        endTurn();
                    });
                    return;
                }
                
                try {
                    // AI 自動購買邏輯
                    log(`[追蹤] 1. 準備佔領`);
                    log(`[電腦] ${player.name} 自動佔領了 ${landInfo.name}。`);
                    // Phase 54: 強制 AI 派滿 3 名守城武將 (若兵力不足則全派)
                    let sendCount = 3;
                    sendCount = Math.min(sendCount, player.officers.length);
                    
                    // 選將邏輯：優先故地加成武將，其餘隨機選取
                    let homeOfficers = player.officers.filter(id =>
                        (typeof OFFICER_HOME_CITY !== 'undefined' && OFFICER_HOME_CITY[id] === landInfo.id)
                    );
                    let otherOfficers = player.officers.filter(id =>
                        !(typeof OFFICER_HOME_CITY !== 'undefined' && OFFICER_HOME_CITY[id] === landInfo.id)
                    );
                    // 其餘武將打亂順序
                    otherOfficers.sort(() => Math.random() - 0.5);
                    
                    let poolOfficers = [...homeOfficers, ...otherOfficers];
                    let chosen = poolOfficers.slice(0, sendCount);
                    log(`[追蹤] 2. SetTimeout 設定前`);
                    setTimeout(() => {
                        log(`[追蹤] 3. SetTimeout 已觸發，呼叫 executeBuyLand...`);
                        executeBuyLand(player, landInfo, chosen);
                    }, 1000);
                    log(`[追蹤] 4. SetTimeout 設定完成`);
                } catch (e) {
                    log(`[追蹤錯誤] AI買地前崩潰: ${e.message}`);
                }
            } else {
                showModal(
                    `發現無主之地：${landInfo.name}`,
                    `是否花費 ${priceText} 佔領 ${landInfo.name}？\n需派駐至少1名武將。`,
                    () => {
                        // 打開選將畫面
                        showOfficerModal(
                            `派駐守將 - ${landInfo.name}`,
                            `請選擇 1~3 名武將駐防 ${landInfo.name} (佔領花費 ${priceText})`,
                            player,
                            (selectedIds) => {
                                executeBuyLand(player, landInfo, selectedIds);
                            },
                            () => {
                                log(`${player.name} 放棄佔領 ${landInfo.name}。`);
                                endTurn();
                            },
                            false,
                            false,
                            [],
                            false,
                            landInfo.id
                        );
                    },
                    () => {
                        log(`${player.name} 放棄佔領 ${landInfo.name}。`);
                        endTurn();
                    },
                    '佔領', '放棄'
                );
            }
        } else {
            log(`${player.name} 停在 ${landInfo.name}，發生未知錯誤無法佔領 (資金: ${player.money}, 武將數: ${player.officers ? player.officers.length : 'undefined'})。`);
            endTurn();
        }
    } else if (landInfo.owner === player.id) {
        // 自己的土地
        if (player.isBot) {
            if (typeof isOllamaEnabled === 'function' && isOllamaEnabled()) {
                GAME_STATE.isWaitingForAction = true;
                askOllamaUpgradeDecision(player, landInfo).then(async decision => {
                    GAME_STATE.isWaitingForAction = false;
                    if (decision) {
                        if (decision.defenders && Array.isArray(decision.defenders)) {
                            // 把原本的守將都放回閒置區
                            player.officers.push(...landInfo.defenders);
                            landInfo.defenders = [];
                            let validDefenders = decision.defenders.filter(id => player.officers.includes(id));
                            if (validDefenders.length > 3) validDefenders = validDefenders.slice(0, 3);
                            landInfo.defenders = validDefenders;
                            player.officers = player.officers.filter(id => !validDefenders.includes(id));
                            updateOfficerCountUI(player.id);
                            log(`🔄 【調兵遣將】[電腦] ${player.name} 重新部署了 ${landInfo.name} 的守將！`);
                        }
                        const buildCost = ((landInfo.development || 0) + 1) * 100;
                        if (decision.upgrade && player.money >= buildCost) {
                            updateMoney(player.id, -buildCost);
                            landInfo.development = (landInfo.development || 0) + 1;
                            updateBoardUI();
                            log(`🏗️ 【城池建設】[電腦] ${player.name} 斥資 $${buildCost} 建設 ${landInfo.name}，等級提升至 Lv ${landInfo.development}！`);
                        }
                    } else {
                        log(`[電腦] ${player.name} 視察 ${landInfo.name} 後離開。`);
                    }
                    endTurn();
                }).catch(e => {
                    console.error('Ollama Error:', e);
                    log(`[電腦] ${player.name} 視察 ${landInfo.name} 後離開。`);
                    GAME_STATE.isWaitingForAction = false;
                    endTurn();
                });
                return;
            }

            log(`${player.name} 回到自己的領地 ${landInfo.name}，軍心大振。`);
            
            // AI 每次走到自己的城池時，都會重新調配武將，邏輯與佔領空城相同
            // 先將所有守將退回閒置清單
            player.officers.push(...landInfo.defenders);
            landInfo.defenders = [];
            
            let sendCount = Math.min(3, player.officers.length);
            if (sendCount > 0) {
                // 選將邏輯：優先故地加成武將，其餘隨機選取
                let homeOfficers = player.officers.filter(id =>
                    (typeof OFFICER_HOME_CITY !== 'undefined' && OFFICER_HOME_CITY[id] === landInfo.id)
                );
                let otherOfficers = player.officers.filter(id =>
                    !(typeof OFFICER_HOME_CITY !== 'undefined' && OFFICER_HOME_CITY[id] === landInfo.id)
                );
                // 其餘武將打亂順序
                otherOfficers.sort(() => Math.random() - 0.5);
                
                let poolOfficers = [...homeOfficers, ...otherOfficers];
                let chosen = poolOfficers.slice(0, sendCount);
                
                landInfo.defenders = chosen;
                player.officers = player.officers.filter(id => !chosen.includes(id));
                updateOfficerCountUI(player.id);
                log(`🔄 【調兵遣將】[電腦] ${player.name} 視察了 ${landInfo.name}，並重新部署了 ${chosen.length} 名武將駐守！`);
            }

            // AI 建設邏輯：若手頭現金充足 (目前資金大於 建設費 + $1000)，則自動進行建設
            const buildCost = ((landInfo.development || 0) + 1) * 100;
            if (player.money >= 1000 + buildCost) {
                updateMoney(player.id, -buildCost);
                landInfo.development = (landInfo.development || 0) + 1;
                updateBoardUI(); // 更新地標顯示
                log(`🏗️ 【城池建設】[電腦] ${player.name} 斥資 $${buildCost} 建設 ${landInfo.name}，建設等級提升至 Lv ${landInfo.development}！`);
            }
            endTurn();
        } else {
            const originalDefenders = [...landInfo.defenders];
            const buildCost = ((landInfo.development || 0) + 1) * 100;
            
            // 檢查是否有重傷守將 (傷勢 > 50%)
            let injuredNames = [];
            landInfo.defenders.forEach(id => {
                let o = getOfficer(id);
                if (o && o.injuryRate > 50) injuredNames.push(o.name);
            });
            
            let warningHtml = "";
            if (injuredNames.length > 0) {
                warningHtml = `<br><br><div style="background-color:rgba(211,47,47,0.1); padding:10px; border-radius:5px; border:1px solid #d32f2f;"><span style="color:#d32f2f; font-weight:bold;">⚠️ 警告：駐守此地的【${injuredNames.join('、')}】受到重傷 (傷勢 > 50%)，極易遭到攻破，強烈建議立即更換健康的武將防守！</span></div>`;
            }

            const askUpgrade = () => {
                const currentBuildCost = ((landInfo.development || 0) + 1) * 100;
                showModal(
                    `建設領地：${landInfo.name}`,
                    `目前建設等級 Lv ${landInfo.development || 0}。<br>是否花費 $${currentBuildCost} 建設城池（使基礎稅率提升 1%）？`,
                    () => { // Yes
                        if (player.money >= currentBuildCost) {
                            updateMoney(player.id, -currentBuildCost);
                            landInfo.development = (landInfo.development || 0) + 1;
                            updateBoardUI(); 
                            log(`🏗️ 【城池建設】${player.name} 斥資 $${currentBuildCost} 建設 ${landInfo.name}，建設等級提升至 Lv ${landInfo.development}！`);
                            endTurn();
                        } else {
                            log(`[提示] 資金不足，無法進行建設 (需要 $${currentBuildCost})。`);
                            endTurn();
                        }
                    },
                    () => { // No
                        log(`${player.name} 結束了領地巡視。`);
                        endTurn();
                    },
                    '建設城池', '放棄建設'
                );
            };

            showModal(
                `回到領地：${landInfo.name}`,
                `歡迎來到 ${landInfo.name}，目前建設等級 Lv ${landInfo.development || 0}。<br>是否要更換駐軍武將？${warningHtml}`,
                () => { // 選擇更換
                    // 將守護武將暫時放回閒置清單
                    player.officers.push(...landInfo.defenders);
                    landInfo.defenders = [];
                    updateOfficerCountUI(player.id);

                    showOfficerModal(
                        `更換守將 - ${landInfo.name}`,
                        `請為 ${landInfo.name} 重新選擇 0~3 名武將駐防 (若不選將撤離所有守軍)`,
                        player,
                        (selectedIds) => { // 確認
                            landInfo.defenders = selectedIds;
                            player.officers = player.officers.filter(id => !selectedIds.includes(id));
                            updateOfficerCountUI(player.id);
                            log(`${player.name} 重新指派了 ${selectedIds.length} 名武將駐守 ${landInfo.name}。`);
                            askUpgrade();
                        },
                        () => { // 取消
                            landInfo.defenders = originalDefenders;
                            player.officers = player.officers.filter(id => !originalDefenders.includes(id));
                            updateOfficerCountUI(player.id);
                            log(`${player.name} 取消了更換守將。`);
                            askUpgrade();
                        },
                        true, // show cancel button
                        false, // isSiege
                        [], // defIds
                        true, // allowZero
                        landInfo.id
                    );
                },
                () => { // 選擇不更換
                    log(`${player.name} 決定維持 ${landInfo.name} 的守將陣容。`);
                    askUpgrade();
                },
                '更換守將', '不換守將'
            );
        }
    } else {
        // 別人的土地
        const owner = GAME_STATE.players[landInfo.owner];
        const toll = getCityToll(landInfo);

        // 若對方已破產則免付費並成為無主地
        if (owner.isBankrupt) {
            log(`${player.name} 來到 ${landInfo.name}，但原領主已破產。`);
            endTurn();
            return;
        }

        // Phase 110: 同盟免費通行
        if (GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(landInfo.owner)) {
            log(`🤝 【同盟通行】${player.name} 途經盟友 ${owner.name} 的領地 ${landInfo.name}，義結金蘭，無需繳納過路費！`);
            endTurn();
            return;
        }

        log(`${player.name} 來到 ${owner.name} 的領地 ${landInfo.name}，防守兵力：${landInfo.defenders.length}將！\n可繳交軍費 $${toll} 或 發起攻城！`);

        if (player.isBot) {
            // Phase 110: 同盟保護 — AI 不攻打盟友城池，直接通過
            if (GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(landInfo.owner)) {
                log(`🤝 【同盟通行】[電腦] ${player.name} 路過盟友 ${owner.name} 的 ${landInfo.name}，義不容辭，繼續前行。`);
                setTimeout(() => { endTurn(); }, 800);
                return;
            }

            if (typeof isOllamaEnabled === 'function' && isOllamaEnabled()) {
                GAME_STATE.isWaitingForAction = true;
                askOllamaSiegeDecision(player, landInfo).then(async decision => {
                    GAME_STATE.isWaitingForAction = false;
                    if (decision) {
                        if (decision.trash_talk && !owner.isBot) {
                            await showTrashTalk(player.name, decision.trash_talk);
                        }
                        if (decision.action === 'attack' && decision.officers && decision.officers.length > 0) {
                        let validAttackers = decision.officers.filter(id => player.officers.includes(id));
                        if (validAttackers.length > 3) validAttackers = validAttackers.slice(0, 3);
                        if (validAttackers.length > 0) {
                            log(`[電腦] ${player.name} 評估後決定發起攻城！`);
                            let useBuff = false;
                            if (decision.use_buff) {
                                const itemIdx = player.items.findIndex(it => it.id === 5);
                                if (itemIdx !== -1) {
                                    consumeItem(player, itemIdx);
                                    playItemAnimation("臨陣磨槍", player.name);
                                    log(`🔥 士氣大振！[電腦] ${player.name} 使用了「臨陣磨槍」，全軍能力提升 10%！`);
                                    useBuff = true;
                                }
                            }
                            executeSiege(player, landInfo, validAttackers, useBuff);
                            return;
                        }
                        }
                    }
                    log(`[電腦] ${player.name} 決定繳交過路費。`);
                    payToll(player, owner, toll);
                }).catch(e => {
                    console.error('Ollama Error:', e);
                    log(`[電腦] ${player.name} 放棄攻城，繳交過路費。`);
                    GAME_STATE.isWaitingForAction = false;
                    payToll(player, owner, toll);
                });
                return;
            }

            // AI 自動抉擇：計算所有可能派出的 1~3 名武將組合
            // 如果有一組陣容能在 6 個屬性中贏過對手至少 4 項 (>50% 勝率)，則發起攻城
            const result = getBestSiegeTeam(player.officers, landInfo.defenders, landInfo.id);
            const bestTeam = result.team;
            if (bestTeam) {
                log(`[電腦] ${player.name} 評估勝算極高，決定發起攻城！`);
                let useBuff = false;
                const itemIdx = player.items.findIndex(it => it.id === 5);
                if (itemIdx !== -1) {
                    consumeItem(player, itemIdx);
                    playItemAnimation("臨陣磨槍", player.name);
                    log(`🔥 士氣大振！[電腦] ${player.name} 使用了「臨陣磨槍」，全軍能力提升 10%！`);
                    useBuff = true;
                }
                setTimeout(() => { executeSiege(player, landInfo, bestTeam, useBuff); }, 1500);
            } else {
                log(`[電腦] ${player.name} 評估軍力不足以攻下 ${landInfo.name}，決定繳交過路費。`);
                setTimeout(() => { payToll(player, owner, toll); }, 1500);
            }
        } else {
            const canSiege = player.officers.length > 0;

            let defInfoHtml = ''; // Changed from defInfoStr to defInfoHtml
            if (landInfo.defenders.length > 0) {
                defInfoHtml = '\n\n【防守武將】';
                landInfo.defenders.forEach(id => {
                    const o = getOfficer(id);
                    if (!o) return;

                    let skillHtml = "";
                    if (OFFICER_SKILLS[id]) {
                        const skill = OFFICER_SKILLS[id];
                        skillHtml = `<div style="font-size: 11px; margin-top: 5px; color: #ffeb3b; background: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px; display: inline-block;">
                            <strong>★${skill.name}★</strong>: ${skill.desc}
                        </div>`;
                    }

                    defInfoHtml += `<div style="margin-bottom: 5px;">
                        <strong>${o.name}</strong>
                        <span style="font-size:12px;">(武${formatStatDisplay(o.baseStats[1], o.stats[1])} 智${formatStatDisplay(o.baseStats[2], o.stats[2])} 統${formatStatDisplay(o.baseStats[3], o.stats[3])} 政${formatStatDisplay(o.baseStats[4], o.stats[4])} 魅${formatStatDisplay(o.baseStats[5], o.stats[5])} 運${formatStatDisplay(o.baseStats[6], o.stats[6])})</span>
                        ${skillHtml}
                    </div>`;
                });
            } else {
                defInfoHtml = '\n\n(目前空無一人駐守)';
            }

            showModal(
                `抵達 ${landInfo.name} (擁有者: ${owner.name})`,
                `過路費: $${getCityToll(landInfo)}。<br>您要支付過路費，還是發起攻城？<br>${defInfoHtml}<br>(若攻城失敗需支付雙倍 $${getCityToll(landInfo) * 2})`,
                () => { payToll(player, owner, toll); },
                canSiege ? () => {
                    showOfficerModal(
                        `發起攻城 - ${landInfo.name}`,
                        `請選擇 1~3 名武將攻打 ${landInfo.name} (若失敗需付 $${toll * 2})`,
                        player,
                        (selectedIds, consumedBuff) => {
                            executeSiege(player, landInfo, selectedIds, consumedBuff);
                        },
                        () => { log(`我軍取消了進攻 ${landInfo.name} 的計畫，改為繳交軍費。`); payToll(player, owner, toll); },
                        true, // showCancelBtn
                        true, // isSiege
                        landInfo.defenders,
                        false, // allowZero
                        landInfo.id
                    );
                } : null,
                '繳交軍費', canSiege ? '發起攻城' : null
            );
        }
    }
}

// 買地與派駐守將處理
function executeBuyLand(player, landInfo, selectedIds) {
    try {
        let currentPrice = parseInt(landInfo.price);
        updateMoney(player.id, -currentPrice);
        landInfo.owner = player.id;

        // 轉移武將
        landInfo.defenders = selectedIds;
        player.officers = player.officers.filter(id => id != null && !selectedIds.includes(id));
        updateOfficerCountUI(player.id);

        let priceDesc = `花費 $${currentPrice}`;
        log(`${player.name} ${priceDesc}佔領了 ${landInfo.name}！派駐 ${selectedIds.length} 名武將守城。`);

        // 更新 UI 標示
        const cell = document.getElementById(`cell-${landInfo.id}`);
        const ownerMarker = cell.querySelector('.owner-marker');
        if (player.id === 1) ownerMarker.classList.add('owner-p1');
        if (player.id === 2) ownerMarker.classList.add('owner-p2');
        if (player.id === 3) ownerMarker.classList.add('owner-p3');
        if (player.id === 4) ownerMarker.classList.add('owner-p4');
        if (player.id === 5) ownerMarker.classList.add('owner-p5');

        endTurn();
    } catch (e) {
        log(`[系統區] executeBuyLand 崩潰: ${e.message}`);
        console.error("executeBuyLand error:", e);
        endTurn();
    }
}

// getBestSiegeTeam -> 已移至 combat_engine.js
// executeSiege -> 已移至 combat_engine.js

// (getBestSiegeTeam 、 executeSiege 已移至 combat_engine.js)

// 付費處理
function payToll(payer, receiver, toll) {
    try {
        // 直接扣掉全額，允許現金變成負數（負數 = 欠債）
        updateMoney(payer.id, -toll);
        updateMoney(receiver.id, toll);

        if (payer.money < 0) {
            // 現金不足，負數代表欠多少
            const debt = Math.abs(payer.money);
            log("💰 " + payer.name + " 負債 $" + debt + "，必須出售武將以補足差額！");
            tryEmergencySell(payer);
        } else {
            endTurn();
        }
    } catch (e) {
        log("[系統區] payToll 嚴重錯誤: " + e.message);
        console.error("payToll error:", e);
        endTurn(); // fallback
    }
}

// 計算武將的招募價格 (用於出售歸返)
function getOfficerRecruitCost(officer) {
    let cost = 0;
    for (let i = 1; i <= 6; i++) cost += officer.stats[i];
    if (OFFICER_SKILLS[officer.id]) {
        let power = getSkillPowerPercentage(OFFICER_SKILLS[officer.id]);
        cost = power > 9 ? cost * 2 : Math.floor(cost * 1.5);
    }
    return Math.floor(cost);
}
// 緊急出售武將（兵諫自保機制）
// targetAmount: 需要賺到的金額（填平負債）。0 = 只需要回正即可
function tryEmergencySell(player, targetAmount = 1) {
    const lordId = player.id * 100; // 君主 ID：100, 200, 300, 400, 500

    // 收集全部可用武將：閒置 + 守城
    function getAllOfficers() {
        let all = [];
        // 閒置武將
        player.officers.forEach(id => {
            const o = getOfficer(id);
            if (o) all.push({ id, o, isDefender: false, land: null });
        });
        // 守城武將
        MAP_DATA.forEach(land => {
            if (land.owner === player.id && land.defenders) {
                land.defenders.forEach(id => {
                    const o = getOfficer(id);
                    if (o) all.push({ id, o, isDefender: true, land });
                });
            }
        });
        return all;
    }

    function sellOne() {
        const allOfficers = getAllOfficers();
        if (allOfficers.length === 0) {
            log("⚠️ " + player.name + " 已無武將可用，勢力滅亡！");
            handleBankrupt(player);
            return;
        }

        const nonLords = allOfficers.filter(e => e.id !== lordId);
        const lordEntry = allOfficers.find(e => e.id === lordId);

        let toSell;
        if (nonLords.length > 0) {
            nonLords.sort((a, b) => {
                let ta = 0, tb = 0;
                for (let i = 1; i <= 6; i++) { ta += a.o.stats[i]; tb += b.o.stats[i]; }
                return ta - tb;
            });
            toSell = nonLords[0];
        } else if (lordEntry) {
            log("☠️ 《君主此去》" + player.name + " 大勢已去，連君主都無力保全，勢力滅亡！");
            const cost = getOfficerRecruitCost(lordEntry.o);
            GAME_STATE.changanOfficers.push(lordEntry.id);
            if (lordEntry.isDefender) {
                lordEntry.land.defenders = lordEntry.land.defenders.filter(id => id !== lordEntry.id);
            } else {
                player.officers = player.officers.filter(id => id !== lordEntry.id);
            }
            updateMoney(player.id, cost);
            updateOfficerCountUI(player.id);
            handleBankrupt(player);
            return;
        } else {
            handleBankrupt(player);
            return;
        }

        const cost = getOfficerRecruitCost(toSell.o);
        GAME_STATE.changanOfficers.push(toSell.id);
        if (toSell.isDefender) {
            toSell.land.defenders = toSell.land.defenders.filter(id => id !== toSell.id);
            log("💸 《兵諫自保》" + player.name + " 陷入困境，忍痛撤離守城武將 " + toSell.o.name + "，得金 $" + cost + "。" + toSell.o.name + " 重回在野...");
        } else {
            player.officers = player.officers.filter(id => id !== toSell.id);
            log("💸 《兵諫自保》" + player.name + " 陷入困境，忍痛遣散閒置武將 " + toSell.o.name + "，得金 $" + cost + "。" + toSell.o.name + " 重回在野...");
        }
        updateMoney(player.id, cost);
        updateOfficerCountUI(player.id);
        updateBoardUI();

        // 播放下野動畫
        const overlay = document.createElement("div");
        overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); z-index: 9999; display: flex; justify-content: center; align-items: center; pointer-events: none; opacity: 0; transition: opacity 0.3s;";
        overlay.innerHTML = "<h1 style=\"color: #f1c40f; font-size: 5vw; text-shadow: 0 0 20px #e67e22; transform: scale(0.5); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);\">🍂 " + toSell.o.name + " 下野了 🍂</h1>";
        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
            overlay.querySelector("h1").style.transform = "scale(1)";
        });

        setTimeout(() => {
            overlay.style.opacity = "0";
            setTimeout(() => overlay.remove(), 500);
            
            // 繼續賣，直到現金能覆蓋欠款 (money >= 0)
            if (player.money >= 0) {
                log("✅ " + player.name + " 透過遣散武將暫度危機，剩餘資金 $" + player.money + "。");
                endTurn();
            } else {
                log("⚠️ " + player.name + " 仍負債 $" + Math.abs(player.money) + "，繼續出售武將...");
                setTimeout(() => sellOne(), 500);
            }
        }, 1500);
    }

    log("🛑 " + player.name + " 資金歸零，啟動《兵諫自保》機制！");
    sellOne();
}

// 破產處理
function handleBankrupt(player) {
    log(`⚠️ ${player.name} 資金枯竭，宣告破產！`);
    player.isBankrupt = true;

    // 移除玩家卡片視覺
    const card = document.getElementById(`p${player.id}-card`);
    if (card) {
        card.classList.remove('active');
        card.style.opacity = '0.3';
        card.style.filter = 'grayscale(100%)';
    }

    // 棋子消失
    updatePiecesPosition();

    let exiledCount = 0;
    // 沒收閒置武將
    if (player.officers.length > 0) {
        GAME_STATE.changanOfficers.push(...player.officers);
        exiledCount += player.officers.length;
        player.officers = [];
        updateOfficerCountUI(player.id);
    }

    // 充公土地與沒收駐守武將
    MAP_DATA.forEach(land => {
        if (land.owner === player.id) {
            land.owner = null;
            if (land.defenders && land.defenders.length > 0) {
                GAME_STATE.changanOfficers.push(...land.defenders);
                exiledCount += land.defenders.length;
                land.defenders = [];
            }
            const cell = document.getElementById(`cell-${land.id}`);
            const marker = cell.querySelector('.owner-marker');
            marker.className = 'owner-marker'; // 重置
            log(`${land.name} 成為無主之地。`);
        }
    });

    if (exiledCount > 0) {
        log(`💨 失去君主的 ${exiledCount} 名將領皆已落難流亡至長安城...（招募系統開啟）`);
    }

    // 將玩家移出進行中列表
    GAME_STATE.activePlayers = GAME_STATE.activePlayers.filter(id => id !== player.id);

    // 退還所有閒置武將 (也可不退還，讓他們消失)
    player.officers = [];
    updateOfficerCountUI(player.id);

    // 檢查是否只剩一人獲勝
    if (GAME_STATE.activePlayers.length <= 1) {
        const winner = GAME_STATE.players[GAME_STATE.activePlayers[0]];
        GAME_STATE.gameOver = true;
        log(`🎉 遊戲結束！天下歸 ${winner.name} 所有！`);
        setTimeout(() => alert(`遊戲結束！${winner.name} 獲勝！`), 500);
    } else {
        endTurn();
    }
}

// updateMoney -> 已移至 utils.js


// updateOfficerCountUI -> 已移至 utils.js
// getOfficer -> 已移至 utils.js


// getCityValue, getDevelopmentGeoBonus, getCityToll, updateBoardUI
// getCityTaxIncome, processCityTaxesAndInflation, applyTeamSkills
// -> 已移至 utils.js / combat_engine.js


// 結束回合
// ============================================================
// Phase 110: 同盟系統
// ============================================================

/**
 * 演奏同盟成立動畫 (2 秒)
 */
function playAllianceAnimation(allianceIds, richestId) {
    const names = allianceIds.map(id => GAME_STATE.players[id].name).join(' & ');
    const richestName = GAME_STATE.players[richestId].name;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: linear-gradient(135deg, rgba(0,30,60,0.92), rgba(0,60,120,0.88));
        z-index: 10002; display: flex; flex-direction: column;
        justify-content: center; align-items: center;
        pointer-events: none; opacity: 0; transition: opacity 0.4s;
        font-family: 'Noto Serif TC', serif;
    `;
    overlay.innerHTML = `
        <div style="font-size: 4vw; color: #4fc3f7; text-shadow: 0 0 30px #4fc3f7, 0 0 60px #0288d1; margin-bottom: 20px;">🤝 弱弱聯合 🤝</div>
        <div style="font-size: 2.2vw; color: #e0f7fa; margin-bottom: 12px; letter-spacing: 0.15em;">[ ${names} ]</div>
        <div style="font-size: 1.5vw; color: #90caf9;">結盟共同對抗 『${richestName}』 !</div>
        <div style="margin-top: 25px; font-size: 1.1vw; color: #b0bec5;">同盟期間：互免過路費、不攻城、不用計謀攻擊對方</div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }, 2000);
}

/**
 * 更新玩家卡片同盟標記
 */
function updateAllianceUI() {
    for (let pid of [1, 2, 3, 4, 5]) {
        const cardEl = document.getElementById(`p${pid}-card`);
        if (!cardEl) continue;
        let badge = cardEl.querySelector('.alliance-badge');
        if (GAME_STATE.alliance.includes(pid)) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'alliance-badge';
                badge.style.cssText = `
                    font-size: 0.75rem; color: #4fc3f7; background: rgba(0,50,100,0.8);
                    border: 1px solid #4fc3f7; border-radius: 10px; padding: 2px 8px;
                    margin-top: 4px; text-align: center; letter-spacing: 0.05em;
                `;
                badge.textContent = '🤝 同盟中';
                cardEl.appendChild(badge);
            }
        } else {
            if (badge) badge.remove();
        }
    }
}

/**
 * 每回合檢查同盟成立 / 瓦解條件
 */
function updateAllianceStatus() {
    const activePids = GAME_STATE.activePlayers.filter(pid => !GAME_STATE.players[pid].isBankrupt);

    // --- 規則 1：同盟中有人破產 → 立即解散 ---
    if (GAME_STATE.alliance.length > 0) {
        const bankruptAlly = GAME_STATE.alliance.find(pid => !activePids.includes(pid));
        if (bankruptAlly) {
            const deadName = GAME_STATE.players[bankruptAlly].name;
            const oldNames = GAME_STATE.alliance.map(id => GAME_STATE.players[id].name).join('、');
            GAME_STATE.alliance = [];
            updateAllianceUI();
            log(`💔 「同盟瓦解」 —— 盟友 ${deadName} 宣告破產，${oldNames} 的同盟就此解散！各自為政，天下再起紛爭！`);
            return;
        }
    }

    if (activePids.length < 3) {
        if (GAME_STATE.alliance.length > 0) {
            log(`💧 「同盟瓦解」 —— 存活玩家已不足三人，同盟自動解散。`);
            GAME_STATE.alliance = [];
            updateAllianceUI();
        }
        return;
    }

    // 依金錢排序（小到大）
    const sorted = [...activePids].sort((a, b) => GAME_STATE.players[a].money - GAME_STATE.players[b].money);
    const richestId = sorted[sorted.length - 1];
    const richestMoney = GAME_STATE.players[richestId].money;

    // --- 已有同盟：檢查解散 & 動態擴張 ---
    if (GAME_STATE.alliance.length > 0) {
        const allianceSum = GAME_STATE.alliance.reduce((s, pid) => s + GAME_STATE.players[pid].money, 0);

        // 解散條件：同盟總金 > 最強者 × 120%
        if (allianceSum > richestMoney * 1.2) {
            const oldNames = GAME_STATE.alliance.map(id => GAME_STATE.players[id].name).join('、');
            GAME_STATE.alliance = [];
            updateAllianceUI();
            log(`💔 「同盟瓦解」 —— ${oldNames} 實力已足以對抗強權，同盟宣告解散！天下再起紛爭！`);
            return;
        }

        // --- 規則 2：2人同盟動態擴張 → 嘗試加入第三者 ---
        if (GAME_STATE.alliance.length === 2) {
            // 找出不在同盟、也不是最富者、且尚存活的玩家
            const candidates = activePids.filter(pid =>
                !GAME_STATE.alliance.includes(pid) && pid !== richestId
            );
            // 按金錢由小到大排序，優先讓最弱者加入
            candidates.sort((a, b) => GAME_STATE.players[a].money - GAME_STATE.players[b].money);

            for (const candidateId of candidates) {
                const allianceSumWith3rd = allianceSum + GAME_STATE.players[candidateId].money;
                if (allianceSumWith3rd < richestMoney) {
                    GAME_STATE.alliance.push(candidateId);
                    updateAllianceUI();
                    const newName = GAME_STATE.players[candidateId].name;
                    const allNames = GAME_STATE.alliance.map(id => GAME_STATE.players[id].name).join('、');
                    log(`🤝 「同盟擴張」！${newName} 見局勢不利，加入同盟！盟友現為：${allNames}，共同對抗 ${GAME_STATE.players[richestId].name}！`);
                    break; // 一次只加一人
                }
            }
        }

        // 同盟持續中
        return;
    }

    // --- 無同盟：檢查是否應成立 ---
    if (GAME_STATE.alienationTurns > 0) return; // 離間之計效力中
    let newAlliance = [];
    if (activePids.length >= 4) {
        const cands3 = sorted.slice(0, 3);
        const sum3 = cands3.reduce((s, id) => s + GAME_STATE.players[id].money, 0);
        if (richestMoney > sum3) newAlliance = cands3;
    }
    if (newAlliance.length === 0) {
        const cands2 = sorted.slice(0, 2);
        const sum2 = cands2.reduce((s, id) => s + GAME_STATE.players[id].money, 0);
        if (richestMoney > sum2) newAlliance = cands2;
    }

    if (newAlliance.length > 0) {
        GAME_STATE.alliance = newAlliance;
        updateAllianceUI();
        const names = newAlliance.map(id => GAME_STATE.players[id].name).join('、');
        log(`🤝 「弱弱聯合」！${names} 面對強權 ${GAME_STATE.players[richestId].name}，決定結盟。自此互免過路費、不攻城、不用計謀攻擊對方！`);
        playAllianceAnimation(newAlliance, richestId);
    }
}

function endTurn() {
    if (GAME_STATE.gameOver) return;

    // 檢查被動迴光返照 (針對所有存活人類玩家)
    GAME_STATE.activePlayers.forEach(pid => {
        const p = GAME_STATE.players[pid];
        if (!p.isBot && !p.isBankrupt && typeof checkPassiveHeal === 'function') {
            checkPassiveHeal(p);
        }
    });

    // Phase 48: 統一結算破產 (處理買地、招募、事件卡扣錢導致的破產)
    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];
    if (currentPlayer && currentPlayer.money <= 0 && !currentPlayer.isBankrupt) {
        // 先嘗試兵諫自保，而非直接破產
        tryEmergencySell(currentPlayer);
        return;
    }

    GAME_STATE.isWaitingForAction = false;
    UI.dice.classList.remove('rolling');

    // Phase 113: 增加當前玩家的個人回合計數 (道具冷卻用)
    if (currentPlayer && !currentPlayer.isBankrupt) {
        currentPlayer.ownTurnCount = (currentPlayer.ownTurnCount || 0) + 1;
    }

    let currentIndex = GAME_STATE.activePlayers.indexOf(GAME_STATE.currentPlayer);
    let nextPlayerId = GAME_STATE.currentPlayer;
    let foundNext = false;

    // 依據開局隨機洗牌後的 activePlayers 陣列順序尋找下一位非破產的玩家
    for (let i = 1; i <= GAME_STATE.activePlayers.length; i++) {
        let nextIndex = (currentIndex + i) % GAME_STATE.activePlayers.length;
        nextPlayerId = GAME_STATE.activePlayers[nextIndex];
        if (GAME_STATE.players[nextPlayerId] && !GAME_STATE.players[nextPlayerId].isBankrupt) {
            foundNext = true;
            break;
        }
    }

    try {
        if (foundNext) {
            // Phase 65: 檢查是否連續行動 (瞞天過海)
            const currentPlayerObj = GAME_STATE.players[GAME_STATE.currentPlayer];
            if (currentPlayerObj && currentPlayerObj.actTwice && !currentPlayerObj.isBankrupt) {
                currentPlayerObj.actTwice = false;
                log(`✨ 【瞞天過海】奏效！${currentPlayerObj.name} 獲得連續行動的機會！`);
            } else {
                let finalNextIndex = GAME_STATE.activePlayers.indexOf(nextPlayerId);
                if (finalNextIndex <= currentIndex) {
                    GAME_STATE.currentRound++;
                    log(`=== 第 ${GAME_STATE.currentRound} 回圈開始 ===`);
                }
                GAME_STATE.currentPlayer = nextPlayerId;
            }

            const nextPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];

            // 更新 UI 顯示 (四人版)
            UI.p1Card.classList.toggle('active', GAME_STATE.currentPlayer === 1);
            UI.p2Card.classList.toggle('active', GAME_STATE.currentPlayer === 2);
            UI.p3Card.classList.toggle('active', GAME_STATE.currentPlayer === 3);
            if (UI.p4Card) UI.p4Card.classList.toggle('active', GAME_STATE.currentPlayer === 4);
            if (UI.p5Card) UI.p5Card.classList.toggle('active', GAME_STATE.currentPlayer === 5);

            UI.currentTurnName.textContent = nextPlayer.name;
            UI.currentTurnName.className = nextPlayer.nameClass;

            log(`現在輪到 ${nextPlayer.name} 回合。`);

            // Phase 21: 執行武將復原判定
            healOfficers(nextPlayer);

            // Phase 30: 結算政治稅收與過路費通膨
            processCityTaxesAndInflation(nextPlayer);

            // Phase 110: 每回合更新同盟狀態
            if (GAME_STATE.alienationTurns > 0) {
                GAME_STATE.alienationTurns--;
                if (GAME_STATE.alienationTurns === 0) {
                    log(`📜 「離間之計」效力已過，天下英雄可重新商議合縱連橫之事。`);
                }
            }
            updateAllianceStatus();

            checkTurn();
        } else {
            // 所有玩家都破產了，遊戲結束
            GAME_STATE.gameOver = true;
            log("所有玩家都已破產，遊戲結束！");
            showModal("遊戲結束", "所有玩家都已破產！", () => { }, null, "確定");
        }
    } catch (e) {
        console.error("endTurn error:", e);
        log(`[系統區] endTurn 時發生未預期錯誤，遊戲進度可能中斷。`);
    }
}

// Phase 21: 武將自然恢復機制
function healOfficers(player) {
    let healed = [];

    const healLogic = (id) => {
        let o = getOfficer(id);
        if (o && o.injuryRate > 0 && !o.isDead) { // 陣亡武將無法自然恢復
            o.injuryRate = Math.max(0, o.injuryRate - 10);
            if (o.injuryRate === 0) healed.push(o.name);
        }
    };

    // 檢查閒置武將
    player.officers.forEach(healLogic);

    // 檢查駐守武將
    MAP_DATA.forEach(land => {
        if (land.owner === player.id) {
            land.defenders.forEach(healLogic);
        }
    });

    if (healed.length > 0) {
        log(`⚕️ 傷勢好轉！${player.name} 麾下的 ${healed.join('、')} 已經完全康復！`);
    }
}

// UI 輔助
function enableRollButton(enable) {
    UI.btnRoll.disabled = !enable;
}

// 播放「絕境逆轉」特效動畫 (Phase 37)
function playReversalAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'reversal-overlay';

    const text = document.createElement('div');
    text.className = 'reversal-text';
    text.textContent = '神機妙算';

    overlay.appendChild(text);
    document.body.appendChild(overlay);

    // 1秒後自動移除
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 1200); // 稍微多給一點緩衝
}

// 播放「武將覺醒」特效動畫 (Phase 39)
function playAwakeningAnimation(officerName, attrName) {
    const overlay = document.createElement('div');
    overlay.className = 'awakening-overlay';

    const title = document.createElement('div');
    title.className = 'awakening-title';
    title.textContent = '能力覺醒';

    const subtitle = document.createElement('div');
    subtitle.className = 'awakening-subtitle';
    subtitle.textContent = `${officerName} 領悟了新的特技！`;

    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    document.body.appendChild(overlay);

    // 1.5秒後自動移除
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 1500);
}

// Phase 71: 播放「武將能力破極」特效動畫 (能力 101+)
function playBreakthroughAnimation(officerName, attrName) {
    const overlay = document.createElement('div');
    overlay.className = 'awakening-overlay';
    // 改為紅色/金色放射狀漸層，營造更強烈的衝擊感
    overlay.style.background = 'radial-gradient(circle, rgba(211, 47, 47, 0.6) 0%, rgba(0, 0, 0, 0) 70%)';

    const title = document.createElement('div');
    title.className = 'awakening-title';
    title.textContent = '登峰造極';
    title.style.textShadow = '0 0 15px #d32f2f, 0 0 30px #d32f2f, 0 0 45px #fff';
    title.style.color = '#fff';

    const subtitle = document.createElement('div');
    subtitle.className = 'awakening-subtitle';
    subtitle.textContent = `${officerName} 的特技獲得強化！`;
    subtitle.style.borderColor = '#d32f2f';
    subtitle.style.color = '#ffc107';

    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    document.body.appendChild(overlay);

    // 1秒後自動移除
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 1200);
}

// 播放武將陣亡動畫
function playDeathAnimation(officerName) {
    const overlay = document.createElement('div');
    overlay.className = 'awakening-overlay';
    // 灰黑深淵黯淡風格
    overlay.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(50, 50, 50, 0.7) 100%)';

    const title = document.createElement('div');
    title.className = 'awakening-title';
    title.textContent = '將星隕落';
    title.style.textShadow = '0 0 15px #ff4444, 0 0 30px #000, 0 0 45px #333';
    title.style.color = '#ccc';

    const subtitle = document.createElement('div');
    subtitle.className = 'awakening-subtitle';
    subtitle.textContent = `【 ${officerName} 】傷勢過重，命喪沙場！`;
    subtitle.style.borderColor = '#666';
    subtitle.style.color = '#fff';

    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    document.body.appendChild(overlay);

    // 1秒後自動移除
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 1200);
}

// Phase 67: AI 招募動畫
function playRecruitAnimation(officerName, playerName) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        flex-direction: column; pointer-events: none; opacity: 0; transition: opacity 0.4s;
    `;
    overlay.innerHTML = `
        <div style="color: #ffd700; font-size: 2.5vw; text-shadow: 0 0 10px #ffd700; margin-bottom: 20px; font-family: 'Noto Serif TC', serif;">✨ 賢才歸心 ✨</div>
        <div style="color: white; font-size: 4vw; text-shadow: 0 0 20px rgba(255,255,255,0.5); transform: scale(0.6); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <span style="color: #64b5f6;">${playerName}</span> 成功招募了 <span style="color: #ffb74d;">${officerName}</span>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('div:last-child').style.transform = 'scale(1)';
    });

    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }, 1200);
}

// Phase 68: AI 使用道具動畫
function playItemAnimation(itemName, playerName) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        flex-direction: column; pointer-events: none; opacity: 0; transition: opacity 0.4s;
    `;
    overlay.innerHTML = `
        <div style="color: #ff5252; font-size: 2.5vw; text-shadow: 0 0 10px #ff5252; margin-bottom: 20px; font-family: 'Noto Serif TC', serif;">✨ 施展奇謀 ✨</div>
        <div style="color: white; font-size: 4vw; text-shadow: 0 0 20px rgba(255,255,255,0.5); transform: scale(0.6); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <span style="color: #64b5f6;">${playerName}</span> 使用了錦囊 <span style="color: #ffeb3b;">【${itemName}】</span>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('div:last-child').style.transform = 'scale(1)';
    });

    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }, 1200);
}

function showModal(title, messageHtml, onConfirm, onCancel, confirmText = "確定", cancelText = "取消", onExtra = null, extraText = "") {
    GAME_STATE.isWaitingForAction = true;
    UI.modalTitle.textContent = title;
    UI.modalMessage.innerHTML = messageHtml;

    UI.btnModalYes.textContent = confirmText || "確定";
    UI.btnModalNo.style.display = onCancel ? 'inline-block' : 'none';
    UI.btnModalNo.textContent = cancelText || "取消";

    if (onExtra) {
        UI.btnModalExtra.style.display = 'inline-block';
        UI.btnModalExtra.textContent = extraText || "額外選項";
        modalExtraCallback = onExtra;
    } else {
        UI.btnModalExtra.style.display = 'none';
        modalExtraCallback = null;
    }

    modalConfirmCallback = onConfirm;
    modalCancelCallback = onCancel;

    UI.modal.classList.remove('hidden');
}

function hideModal() {
    UI.modal.classList.add('hidden');
    GAME_STATE.isWaitingForAction = false;
}

// Phase 22: 攻城選陣清單改革
let currentSiegePlayer = null;
let currentSiegeCityId = -1;
let currentSiegeSortKey = 'total';
let currentSiegeSortOrder = -1;

function showOfficerModal(title, message, player, onConfirm, onCancel, showCancelBtn = false, isSiege = false, defIds = [], allowZero = false, cityId = -1) {
    GAME_STATE.isWaitingForAction = true;
    selectedOfficers = [];
    maxSelectableOfficers = 3;
    window.allowZeroSelection = allowZero;
    currentSiegePlayer = player;
    currentSiegeCityId = cityId;

    UI.officerModalTitle.textContent = title;
    UI.officerModalMessage.textContent = message;

    let winRateEl = document.getElementById('officer-win-rate');
    let comparePanel = document.getElementById('officer-compare-panel');

    if (isSiege) {
        if (comparePanel) comparePanel.style.display = 'block';
        window.currentDefIds = defIds;

        // Phase 69: 檢查是否有臨陣磨槍
        const hasSiegeBuffItem = player.items && player.items.some(item => item.id === 5);
        if (hasSiegeBuffItem) {
            UI.siegeBuffContainer.style.display = 'block';
            UI.useSiegeBuffCheckbox.checked = false;
        } else {
            UI.siegeBuffContainer.style.display = 'none';
            UI.useSiegeBuffCheckbox.checked = false;
        }

        // Phase 22 & 69: 智能預設最佳陣容 (針對 checkbox 狀態計算)
        // 取得預設最佳陣容並自動勾選，forUI 傳入 true 確保回傳盡可能最佳的一組
        const result = getBestSiegeTeam(player.officers, defIds, cityId, UI.useSiegeBuffCheckbox.checked, true);
        const bestTeam = result.team;
        if (bestTeam && bestTeam.length > 0) {
            selectedOfficers = [...bestTeam];
        } else {
            selectedOfficers = [];
        }
    } else {
        if (comparePanel) comparePanel.style.display = 'none';
        window.currentDefIds = [];
        UI.siegeBuffContainer.style.display = 'none';
        UI.useSiegeBuffCheckbox.checked = false;
    }

    renderSiegeOfficerList();

    UI.btnOfficerConfirm.disabled = !window.allowZeroSelection && selectedOfficers.length === 0;
    UI.btnOfficerCancel.style.display = showCancelBtn ? 'inline-block' : 'none';

    officerConfirmCallback = onConfirm;
    officerCancelCallback = onCancel;

    UI.officerModal.classList.remove('hidden');

    // 初始化排序事件 (避免重複綁定，可在 window.onload 處理或確保只註冊一次)
    setupSiegeSort();
}

function renderSiegeOfficerList() {
    const tbody = document.getElementById('officer-list-tbody');
    if (!tbody) {
        // Fallback for older HTML caching
        console.warn("officer-list-tbody not found! Skip rendering list.");
        return;
    }
    tbody.innerHTML = '';

    if (!currentSiegePlayer) return;

    let officers = currentSiegePlayer.officers.map(id => getOfficer(id)).filter(o => o != null);

    // 套用排序
    officers.sort((a, b) => {
        let valA, valB;
        if (currentSiegeSortKey === 'total') {
            valA = 0; valB = 0;
            for (let i = 1; i <= 6; i++) { valA += getEffectiveStat(a, i); valB += getEffectiveStat(b, i); }
        } else if (['1', '2', '3', '4', '5', '6'].includes(currentSiegeSortKey)) {
            valA = getEffectiveStat(a, currentSiegeSortKey);
            valB = getEffectiveStat(b, currentSiegeSortKey);
        } else {
            valA = a[currentSiegeSortKey];
            valB = b[currentSiegeSortKey];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * currentSiegeSortOrder;
        }
        return (valA - valB) * currentSiegeSortOrder;
    });

    officers.forEach(o => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const isSelected = selectedOfficers.includes(o.id);
        if (isSelected) tr.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';

        // 計算折損後的總和
        let total = 0;
        for (let i = 1; i <= 6; i++) total += getEffectiveStat(o, i);

        let skillText = "-";
        if (OFFICER_SKILLS[o.id]) {
            let isBreakthrough = false;
            for (let i = 1; i <= 6; i++) {
                if (getEffectiveStat(o, i) >= 101 && o.injuryRate === 0) { isBreakthrough = true; break; }
            }
            let skillName = OFFICER_SKILLS[o.id].name;
            if (isBreakthrough) skillName += ' (極)';
            
            skillText = `<strong style="color:var(--primary-color)">【${skillName}】</strong>`;
        }
        if (o.isDead) {
            skillText += ` <span style="color:#666; font-size:0.85em; font-weight:bold;">(💀 陣亡)</span>`;
            tr.style.opacity = '0.5';
            tr.style.pointerEvents = 'none'; // 禁止點擊
        } else if (o.injuryRate > 0) {
            skillText += ` <span style="color:#e57373; font-size:0.85em;">(受傷 -${o.injuryRate}%)</span>`;
        }

        let isHomeCity = (typeof OFFICER_HOME_CITY !== 'undefined' && OFFICER_HOME_CITY[o.id] === currentSiegeCityId);
        let nameHtml = o.name;
        if (isHomeCity) {
            nameHtml = `<span style="color:#00bcd4; font-weight:900; text-shadow: 0 0 5px rgba(0,188,212,0.6);">🏠 ${o.name} (+5%)</span>`;
        }

        tr.innerHTML = `
            <td><input type="checkbox" ${isSelected ? 'checked' : ''} style="pointer-events: none; transform: scale(1.3);"></td>
            <td style="font-weight:bold; font-size:1.1em;">${nameHtml}</td>
            <td>${formatStatDisplay(o.baseStats[1], o.stats[1], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[2], o.stats[2], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[3], o.stats[3], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[4], o.stats[4], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[5], o.stats[5], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[6], o.stats[6], o.injuryRate)}</td>
            <td style="color:var(--primary-color); font-weight:bold;">${total}</td>
            <td class="desc-col">${skillText}</td>
        `;

        tr.onclick = () => {
            toggleOfficerSelection(tr, o.id);
            // 同步 Checkbox 狀態與樣式
            const cb = tr.querySelector('input[type="checkbox"]');
            const nowSelected = selectedOfficers.includes(o.id);
            cb.checked = nowSelected;
            if (nowSelected) {
                tr.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
            } else {
                tr.style.backgroundColor = '';
            }
        };

        tbody.appendChild(tr);
    });

    // 每次重新渲染，更新面板
    updateWinRateDisplay();
}

function hideOfficerModal() {
    UI.officerModal.classList.add('hidden');
    GAME_STATE.isWaitingForAction = false;
}

function toggleOfficerSelection(element, officerId) {
    const idx = selectedOfficers.indexOf(officerId);
    if (idx > -1) {
        selectedOfficers.splice(idx, 1);
    } else {
        if (selectedOfficers.length >= maxSelectableOfficers) return;
        selectedOfficers.push(officerId);
    }

    UI.btnOfficerConfirm.disabled = !window.allowZeroSelection && selectedOfficers.length === 0;

    if (window.currentDefIds && window.currentDefIds.length > 0) {
        updateWinRateDisplay();
    }
}

function updateWinRateDisplay() {
    const el = document.getElementById('officer-win-rate');
    const comparePanel = document.getElementById('officer-compare-panel');
    if (!el) return;

    // 清零顯示
    const resetDisplay = () => {
        for (let i = 1; i <= 6; i++) {
            const aEl = document.getElementById(`atk-stat-${i}`);
            const dEl = document.getElementById(`def-stat-${i}`);
            if (aEl) { aEl.textContent = '-'; aEl.style.color = ''; }
            if (dEl) { dEl.textContent = '-'; dEl.style.color = ''; }
        }
    };

    if (!window.currentDefIds || window.currentDefIds.length === 0) {
        resetDisplay();
        return;
    }

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    window.currentDefIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) {
            defStats[i] += getEffectiveStat(o, i);
        }
    });

    applyTeamSkills(window.currentDefIds, defStats, selectedOfficers, true, MAP_DATA[currentSiegeCityId]);

    // Level-based Geographical Advantage (1% per Lv)
    // Level-based Geographical Advantage (Lv0-3: 3%, Lv4+: n%)
    const geoBonus = getDevelopmentGeoBonus(MAP_DATA[currentSiegeCityId]?.development || 0);
    let geoHtml = "";
    if (geoBonus > 0) {
        for (let i = 1; i <= 6; i++) {
            defStats[i] = Math.ceil(defStats[i] * (1 + geoBonus / 100));
        }
        geoHtml = ` <b style="color: #6d4c41; font-size: 0.9em; background: rgba(109, 76, 65, 0.1); padding: 2px 4px; border-radius: 3px; border: 1px solid #6d4c41; margin-left: 5px;">⛰️ 地利 +${geoBonus}%</b>`;
    }

    // Phase 66: 連續封地加成 (n%)
    const chainBonus = getCityChainLength(MAP_DATA[currentSiegeCityId]?.owner, currentSiegeCityId);
    console.log(`[Phase 66] currentSiegeCityId: ${currentSiegeCityId}, owner: ${MAP_DATA[currentSiegeCityId]?.owner}, bonus: ${chainBonus}%`);
    let chainHtml = "";
    if (chainBonus > 0) {
        for (let i = 1; i <= 6; i++) {
            defStats[i] = Math.ceil(defStats[i] * (1 + chainBonus / 100));
        }
        chainHtml = ` <b style="color: #2e7d32; font-size: 0.9em; background: rgba(76, 175, 80, 0.1); padding: 2px 4px; border-radius: 3px; border: 1px solid #4caf50; margin-left: 5px;">🏰 連橫 +${chainBonus}%</b>`;
    }

    const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    selectedOfficers.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) {
            atkStats[i] += getEffectiveStat(o, i);
        }
    });

    applyTeamSkills(selectedOfficers, atkStats, window.currentDefIds, false, MAP_DATA[currentSiegeCityId]);

    // Phase 69: 臨陣磨槍加成
    let siegeBuffHtml = "";
    if (UI.useSiegeBuffCheckbox && UI.useSiegeBuffCheckbox.checked) {
        for (let i = 1; i <= 6; i++) {
            atkStats[i] = Math.ceil(atkStats[i] * 1.10);
        }
        siegeBuffHtml = ` <b style="color: #d35400; font-size: 0.9em; background: rgba(211, 84, 0, 0.1); padding: 2px 4px; border-radius: 3px; border: 1px solid #d35400; margin-left: 5px;">🔥 臨陣磨槍 +10%</b>`;
    }

    if (selectedOfficers.length === 0) {
        resetDisplay();
        el.textContent = '預估勝率：請先選擇作戰武將...';
        return;
    }

    let expectedWins = 0;
    // 動態判斷屬性權重 (武力>95可累加機制)
    let atkStr = atkStats[1], defStr = defStats[1];
    let strWeight = 1;
    
    let dominantTeamPrediction = null;
    if (atkStr > defStr) dominantTeamPrediction = selectedOfficers;
    else if (defStr > atkStr) dominantTeamPrediction = window.currentDefIds;
    
    if (dominantTeamPrediction) {
        dominantTeamPrediction.forEach(id => {
            let o = getOfficer(id);
            if (o) {
                if (getEffectiveStat(o, 1) >= 101 && o.injuryRate === 0) strWeight += 2;
                else if (getEffectiveStat(o, 1) >= 95) strWeight += 1;
            }
        });
    }

    const totalOutcomes = 5 + strWeight;

    // 更新個別數字與顏色
    for (let i = 1; i <= 6; i++) {
        const aEl = document.getElementById(`atk-stat-${i}`);
        const dEl = document.getElementById(`def-stat-${i}`);
        if (aEl && dEl) {
            aEl.textContent = atkStats[i];
            dEl.textContent = defStats[i];

            if (atkStats[i] > defStats[i]) {
                expectedWins += (i === 1) ? strWeight : 1;
                aEl.style.color = '#27ae60'; // 勝: 綠色
                aEl.style.fontWeight = 'bold';
                dEl.style.color = '#c0392b'; // 敗: 紅色
                dEl.style.fontWeight = 'normal';
            } else if (atkStats[i] < defStats[i]) {
                aEl.style.color = '#c0392b';
                aEl.style.fontWeight = 'normal';
                dEl.style.color = '#27ae60';
                dEl.style.fontWeight = 'bold';
            } else {
                aEl.style.color = '#555';
                aEl.style.fontWeight = 'normal';
                dEl.style.color = '#555';
                dEl.style.fontWeight = 'normal';
            }
        }
    }

    const winRate = Math.round((expectedWins / totalOutcomes) * 100);
    // 統合顯示：城池等級 + 連橫加成 = 總地利
    const totalGeoBonus = geoBonus + chainBonus;
    let combinedGeoHtml = "";
    if (totalGeoBonus > 0) {
        combinedGeoHtml = ` <b style="color: #6d4c41; font-size: 0.9em; background: rgba(109, 76, 65, 0.1); padding: 2px 4px; border-radius: 3px; border: 1px solid #6d4c41; margin-left: 5px;">⛰️ 地利 +${totalGeoBonus}%</b>`;
    }
    el.innerHTML = `預估勝率：<span style="color: ${winRate >= 50 ? '#27ae60' : '#e67e22'}; font-size: 1.2rem;">${winRate}%</span>${combinedGeoHtml}${siegeBuffHtml} (${expectedWins} / ${totalOutcomes} 預期期望值)`;
}

// 事件綁定只須執行一次
let isSiegeSortSetup = false;
function setupSiegeSort() {
    if (isSiegeSortSetup) return;
    const headers = document.querySelectorAll('.sortable-siege');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort-siege');
            if (currentSiegeSortKey === sortKey) {
                currentSiegeSortOrder *= -1;
            } else {
                currentSiegeSortKey = sortKey;
                currentSiegeSortOrder = -1;
                if (sortKey === 'name') currentSiegeSortOrder = 1;
            }
            renderSiegeOfficerList();
        });
    });
    isSiegeSortSetup = true;
}

// 顯示特定玩家的麾下所有武將清單
function showPlayerOfficers(playerId) {
    const player = GAME_STATE.players[playerId];
    if (!player) return;

    let officerList = [];
    
    // 依據佔領地取得駐防武將
    MAP_DATA.forEach(land => {
        if (land.owner === playerId && land.defenders && land.defenders.length > 0) {
            land.defenders.forEach(id => {
                officerList.push({ id: id, loc: `<span style="color:#e67e22;">駐防: ${land.name}</span>` });
            });
        }
    });

    // 取得閒置武將 (目前在 player.officers 中的)
    if (player.officers && player.officers.length > 0) {
        player.officers.forEach(id => {
            officerList.push({ id: id, loc: '<span style="color:#27ae60;">本隊 (閒置)</span>' });
        });
    }

    let html = `
    <div style="font-weight: bold; margin-bottom: 10px; font-size: 1.1em; color: var(--gold);">
        總武將數: ${officerList.length} 名
    </div>
    <div style="max-height: 400px; overflow-y: auto; text-align: left; padding: 10px; background: rgba(0,0,0,0.5); border: 1px inset var(--border-color); color: var(--ink-light);">`;
    
    if (officerList.length === 0) {
        html += `<p style="text-align:center;">目前麾下無武將跟隨</p>`;
    } else {
        html += `<table style="width:100%; border-collapse: collapse; font-size: 0.9em; text-align: center;">
                    <tr style="border-bottom: 1px solid #555; background: rgba(255,255,255,0.1);">
                        <th style="padding: 5px;">姓名</th>
                        <th style="padding: 5px;">所在地</th>
                        <th style="padding: 5px;">綜合能力</th>
                        <th style="padding: 5px;">特技</th>
                    </tr>`;
        officerList.forEach(item => {
            const o = getOfficer(item.id);
            if(o) {
                let skillText = "-";
                if (OFFICER_SKILLS[o.id]) {
                    let isBreakthrough = [1,2,3,4,5,6].some(i => getEffectiveStat(o, i) >= 101 && o.injuryRate === 0);
                    skillText = OFFICER_SKILLS[o.id].name + (isBreakthrough ? ' (極)' : '');
                }
                
                let total = 0;
                for(let i=1;i<=6;i++) total += getEffectiveStat(o, i);
                
                html += `<tr style="border-bottom: 1px dotted #444; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background=''">
                            <td style="padding: 5px; color: var(--gold); font-weight: bold;">${o.name}</td>
                            <td style="padding: 5px;">${item.loc}</td>
                            <td style="padding: 5px; color: #aaa;">${total}</td>
                            <td style="padding: 5px; color: #888; font-size: 0.85em;">${skillText}</td>
                         </tr>`;
            }
        });
        html += `</table>`;
    }
    html += `</div>`;

    UI.infoModalTitle.textContent = `${player.name} 麾下陣容清單`;
    UI.infoModalMessage.innerHTML = html;
    UI.infoModal.classList.remove('hidden');
}


// 啟動點
window.onload = initGame;


// --- 武將圖鑑系統 (Phase 14) ---
let currentSortKey = 'id';
let currentSortOrder = 1; // 1 = ASC, -1 = DESC

function getSuperSkillDescription(o) {
    let superSkills = [];
    
    // 武力 (1)
    let str = getEffectiveStat(o, 1);
    if (str >= 101 && o.injuryRate === 0) superSkills.push(`<span style="color:#d32f2f">【萬夫莫敵】</span>優位時武力機率 3 倍`);
    else if (str >= 95) superSkills.push(`<span style="color:#e67e22">【一夫當關】</span>優位時武力機率 2 倍`);

    // 智力 (2)
    let int = getEffectiveStat(o, 2);
    if (int >= 101 && o.injuryRate === 0) superSkills.push(`<span style="color:#d32f2f">【神鬼莫測】</span>75% 逆轉且犧牲保隊`);
    else if (int >= 95) superSkills.push(`<span style="color:#9b59b6">【神機妙算】</span>50% 機率絕境逆轉`);

    // 統率 (3)
    let cmd = getEffectiveStat(o, 3);
    if (cmd >= 101 && o.injuryRate === 0) superSkills.push(`<span style="color:#d32f2f">【神級指揮】</span>全體友軍免疫受傷`);
    else if (cmd >= 95) superSkills.push(`<span style="color:#3498db">【統兵有方】</span>全體隊友受傷減半`);

    // 政治 (4)
    let pol = getEffectiveStat(o, 4);
    if (pol >= 101 && o.injuryRate === 0) superSkills.push(`<span style="color:#d32f2f">【富國強兵】</span>駐守城池稅收 5 倍`);
    else if (pol >= 95) superSkills.push(`<span style="color:#27ae60">【經世濟民】</span>駐守城池稅收加倍`);

    // 魅力 (5)
    let cha = getEffectiveStat(o, 5);
    if (cha >= 101 && o.injuryRate === 0) {
        const isF = (typeof FEMALE_OFFICER_IDS !== 'undefined' && FEMALE_OFFICER_IDS.includes(o.id));
        const sName101 = isF ? '傾世紅顏' : '天選之子';
        superSkills.push(`<span style="color:#d32f2f">【${sName101}】</span>(魅力>攻) 75% 勸退敵軍`);
    } else if (cha >= 95) {
        const isF = (typeof FEMALE_OFFICER_IDS !== 'undefined' && FEMALE_OFFICER_IDS.includes(o.id));
        const sName95 = isF ? '傾國傾城' : '名德眾望';
        superSkills.push(`<span style="color:#e91e63">【${sName95}】</span>(魅力>攻) 50% 勸退敵軍`);
    }

    // 運氣 (6)
    let luc = getEffectiveStat(o, 6);
    if (luc >= 101 && o.injuryRate === 0) superSkills.push(`<span style="color:#d32f2f">【天降甘霖】</span>戰後全隊傷勢歸零，總計消退100點累積受傷`);
    else if (luc >= 95) superSkills.push(`<span style="color:#f1c40f">【吉星高照】</span>戰後隨機治癒一人，消退50點累積受傷`);

    return superSkills.join('<br>');
}

function openEncyclopedia() {
    renderEncyclopedia();
    UI.encyclopediaModal.classList.remove('hidden');
}

function renderEncyclopedia() {
    UI.encyclopediaTbody.innerHTML = '';

    const factionMap = { 1: "蜀國", 2: "魏國", 3: "吳國", 4: "群雄", 5: "戰國" };

    // 計算動態總和與即時陣營 (Phase 23)
    let displayData = OFFICERS_DATA.map(o => {
        let total = 0;
        for (let i = 1; i <= 6; i++) total += o.stats[i]; // 使用原始成長後數值計算基底總合

        // 尋找當前所屬活體玩家
        let currentOwnerId = null;

        // 1. 先檢索玩家手中的閒置武將
        for (let pid in GAME_STATE.players) {
            let p = GAME_STATE.players[pid];
            if (p && !p.isBankrupt && p.officers.includes(o.id)) {
                currentOwnerId = parseInt(pid);
                break;
            }
        }

        // 2. 若不在閒置區，則檢索全地圖的守城武將
        if (!currentOwnerId) {
            for (let i = 0; i < MAP_DATA.length; i++) {
                let land = MAP_DATA[i];
                if (land.owner && land.defenders && land.defenders.includes(o.id)) {
                    // 若這塊地的物主尚未破產，則該守軍屬於該物主
                    let ownerPlayer = GAME_STATE.players[land.owner];
                    if (ownerPlayer && !ownerPlayer.isBankrupt) {
                        currentOwnerId = land.owner;
                        break;
                    }
                }
            }
        }

        let fname = currentOwnerId ? factionMap[currentOwnerId] : "在野";
        let fcolor = currentOwnerId ? `var(--faction-${currentOwnerId})` : "#999";

        return {
            ...o,
            dynTotal: total,
            dynFaction: fname,
            dynFactionColor: fcolor
        };
    });

    // 複製一份陣列用來排序
    let sortedOfficers = displayData.sort((a, b) => {
        let valA, valB;
        if (['1', '2', '3', '4', '5', '6'].includes(currentSortKey)) {
            valA = a.stats[currentSortKey];
            valB = b.stats[currentSortKey];
        } else if (currentSortKey === 'total') {
            valA = a.dynTotal;
            valB = b.dynTotal;
        } else if (currentSortKey === 'battle') { // Phase 26
            valA = a.battleCount;
            valB = b.battleCount;
        } else if (currentSortKey === 'winrate') { // Phase 26
            valA = a.battleCount > 0 ? a.winCount / a.battleCount : -1;
            valB = b.battleCount > 0 ? b.winCount / b.battleCount : -1;
        } else if (currentSortKey === 'cumulativeInjury') {
            valA = a.cumulativeInjury || 0;
            valB = b.cumulativeInjury || 0;
        } else if (currentSortKey === 'faction') {
            valA = a.dynFaction;
            valB = b.dynFaction;
        } else {
            valA = a[currentSortKey];
            valB = b[currentSortKey];
        }

        // 字串比較 (姓名、陣營)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * currentSortOrder;
        }
        return (valA - valB) * currentSortOrder;
    });

    sortedOfficers.forEach(o => {
        const tr = document.createElement('tr');

        let skillParts = [];
        if (OFFICER_SKILLS[o.id]) {
            skillParts.push(`<strong style="color:var(--primary-color)">【${OFFICER_SKILLS[o.id].name}】</strong> ${OFFICER_SKILLS[o.id].desc}`);
        }
        let ssDesc = getSuperSkillDescription(o);
        if (ssDesc) skillParts.push(ssDesc);

        let skillHtml = skillParts.length > 0 ? skillParts.join('<br>') : "-";
        let winRateStr = o.battleCount > 0 ? Math.round((o.winCount / o.battleCount) * 100) + '%' : '-';
        const cumInj = o.cumulativeInjury || 0;
        const statusText = o.isDead ? `<span style="color:#aaa; font-weight:bold;">💀 陣亡</span>` 
                         : cumInj > 0 ? `<span style="color:${cumInj >= 400 ? '#e53935' : cumInj >= 300 ? '#e67e22' : '#888'}">${cumInj}</span>` 
                         : `<span style="color:#4caf50">0</span>`;

        tr.innerHTML = `
            <td>${o.id}</td>
            <td style="font-weight:bold;">${o.name}</td>
            <td style="color: ${o.dynFactionColor}; font-weight:bold;">${o.dynFaction}</td>
            <td>${formatStatDisplay(o.baseStats[1], o.stats[1], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[2], o.stats[2], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[3], o.stats[3], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[4], o.stats[4], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[5], o.stats[5], o.injuryRate)}</td>
            <td>${formatStatDisplay(o.baseStats[6], o.stats[6], o.injuryRate)}</td>
            <td style="font-weight:bold; color:var(--ink-dark);">${o.dynTotal}</td>
            <td style="text-align:center;">${o.battleCount}</td>
            <td style="text-align:center;">${winRateStr}</td>
            <td style="text-align:center;">${statusText}</td>
            <td class="desc-col">${skillHtml}</td>
        `;
        UI.encyclopediaTbody.appendChild(tr);
    });
}

function setupEncyclopediaSort() {
    const headers = document.querySelectorAll('.encyclopedia-table th.sortable');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            if (currentSortKey === sortKey) {
                currentSortOrder *= -1; // 反轉順序
            } else {
                currentSortKey = sortKey;
                currentSortOrder = -1;  // 預設切換時用降冪排列數字 (比較直觀看最強)
                if (sortKey === 'id' || sortKey === 'name') currentSortOrder = 1;
            }
            renderEncyclopedia();
        });
    });
}

/**
 * 存檔系統 (Phase: Persistence)
 */
function saveGame() {
    if (GAME_STATE.isWaitingForAction || (GAME_STATE.players[GAME_STATE.currentPlayer] && GAME_STATE.players[GAME_STATE.currentPlayer].isBot)) {
        alert("❌ 請在「輪到您的回合，且尚未擲骰子」的狀態下存檔，以免造成遊戲進度卡死！");
        return;
    }
    try {
        const saveData = {
            GAME_STATE: GAME_STATE,
            MAP_DATA: MAP_DATA,
            OFFICERS_DATA: OFFICERS_DATA,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('TR_RICH_SAVE', JSON.stringify(saveData));
        log(`📂 [系統] 存檔成功！(${new Date().toLocaleTimeString()})`);
        alert("存檔成功！");
    } catch (e) {
        console.error("Save error:", e);
        alert("存檔失敗: " + e.message);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem('TR_RICH_SAVE');
        if (!raw) {
            alert("找不到任何存檔紀錄！");
            return;
        }
        const data = JSON.parse(raw);
        
        // 恢復數據 (Object.assign 保持引用或直接覆蓋)
        Object.assign(GAME_STATE, data.GAME_STATE);
        
        // MAP_DATA 和 OFFICERS_DATA 是陣列，必須透過 ID 對應來覆寫 (避免版本更新導致 index 錯亂)
        data.MAP_DATA.forEach((savedLand) => {
            const target = MAP_DATA.find(l => l.id === savedLand.id);
            if (target) Object.assign(target, savedLand);
        });
        
        data.OFFICERS_DATA.forEach((savedOfficer) => {
            const target = OFFICERS_DATA.find(o => o.id === savedOfficer.id);
            if (target) Object.assign(target, savedOfficer);
        });

        // 恢復 UI
        restoreUI();
        
        // 隱藏開始畫面 (如果還在的話)
        UI.startScreen.classList.add('hidden');
        
        log(`📂 [系統] 讀檔成功！載入自 ${new Date(data.timestamp).toLocaleString()}`);
        alert("讀檔成功！");
    } catch (e) {
        console.error("Load error:", e);
        alert("讀檔失敗: " + e.message);
    }
}

/**
 * Google Drive 雲端同步功能
 */
const GOOGLE_CLIENT_ID = '674910216281-tvqq96g383mbesttgvivm42f4klfgdgl.apps.googleusercontent.com';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
let tokenClient;
let gapiInited = false;
let currentAccessToken = null;

function initGoogleAPIs() {
    if (typeof gapi !== 'undefined') {
        gapi.load('client', initializeGapiClient);
    } else {
        setTimeout(initGoogleAPIs, 500); // Wait for script to load
    }
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapiInited = true;
        
        if (typeof google !== 'undefined') {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: GOOGLE_SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse.error !== undefined) {
                        throw (tokenResponse);
                    }
                    currentAccessToken = tokenResponse.access_token;
                    UI.driveAuthLoggedOut.classList.add('hidden');
                    UI.driveAuthLoggedIn.classList.remove('hidden');
                    log(`🔐 [系統] 已授權 Google Drive 存取`);
                    renderSaveSlots();
                },
            });
        }
    } catch (e) {
        console.error('Error initializing GAPI client', e);
    }
}

function handleDriveLogin() {
    if (!tokenClient) {
        alert("Google 服務載入中，請稍後再試...");
        return;
    }
    tokenClient.requestAccessToken({prompt: 'consent'});
}

function handleDriveLogout() {
    if (currentAccessToken) {
        google.accounts.oauth2.revoke(currentAccessToken, () => {
            log('🔓 [系統] 已解除 Google Drive 授權');
        });
        currentAccessToken = null;
        UI.driveAuthLoggedOut.classList.remove('hidden');
        UI.driveAuthLoggedIn.classList.add('hidden');
    }
}

// ---- 10 存檔欄位 ----
let driveFileIndex = {}; // { 'Rich3_Slot_1.json': fileId, ... }

async function fetchDriveFileIndex() {
    const response = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
        pageSize: 20
    });
    const files = response.result.files || [];
    driveFileIndex = {};
    files.forEach(f => { driveFileIndex[f.name] = f.id; });
}

async function renderSaveSlots() {
    if (!UI.saveSlotsGrid) return;
    try {
        await fetchDriveFileIndex();
    } catch(e) { /* might fail if not authed yet */ }

    UI.saveSlotsGrid.innerHTML = '';
    const timestampCache = {};

    // Fetch timestamps for all occupied slots
    const fetchPromises = Object.entries(driveFileIndex).map(async ([name, fileId]) => {
        if (!name.startsWith('Rich3_Slot_')) return;
        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: 'Bearer ' + currentAccessToken }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.timestamp) timestampCache[name] = data.timestamp;
            }
        } catch(e) {}
    });
    await Promise.all(fetchPromises);

    for (let slot = 1; slot <= 10; slot++) {
        const fileName = `Rich3_Slot_${slot}.json`;
        const fileId = driveFileIndex[fileName];
        const btn = document.createElement('button');
        btn.className = 'save-slot-btn';
        btn.id = `save-slot-btn-${slot}`;

        if (fileId && timestampCache[fileName]) {
            const ts = new Date(timestampCache[fileName]);
            const dateStr = `${ts.getMonth()+1}/${ts.getDate()} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;
            btn.innerHTML = `<span class="slot-num">📁 ${slot}</span><span class="slot-info">${dateStr}</span>`;
        } else if (fileId) {
            btn.innerHTML = `<span class="slot-num">📁 ${slot}</span><span class="slot-info">已有存檔</span>`;
        } else {
            btn.innerHTML = `<span class="slot-num">🆕 ${slot}</span><span class="slot-info">空欄位</span>`;
        }

        btn.addEventListener('click', () => openSlotDialog(slot, fileName, fileId));
        UI.saveSlotsGrid.appendChild(btn);
    }
}

function openSlotDialog(slot, fileName, fileId) {
    const existText = fileId ? `（已有存檔）` : `（空欄位）`;
    const msg = `欄位 ${slot} ${existText}
請選擇操作：`;

    // Use custom in-page dialog
    showSlotModal(slot, !!fileId, async (action) => {
        if (action === 'save') await saveToSlot(slot, fileName, fileId);
        else if (action === 'load') await loadFromSlot(fileName, fileId, slot);
    });
}

function showSlotModal(slot, hasData, callback) {
    // Remove existing
    const existing = document.getElementById('slot-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'slot-modal-overlay';
    overlay.innerHTML = `
        <div id="slot-modal-box">
            <div id="slot-modal-title">☁️ 存檔欄位 ${slot}</div>
            <div id="slot-modal-body">${hasData ? '此欄位已有存檔，請選擇操作：' : '此欄位為空，是否存入新檔？'}</div>
            <div id="slot-modal-actions">
                <button id="slot-modal-save" class="btn cloud-btn">💾 存入此欄位</button>
                ${hasData ? `<button id="slot-modal-load" class="btn cloud-btn">📂 讀取此欄位</button>` : ''}
                <button id="slot-modal-cancel" class="btn-text">取消</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('slot-modal-save').addEventListener('click', () => {
        overlay.remove();
        callback('save');
    });
    if (hasData) {
        document.getElementById('slot-modal-load').addEventListener('click', () => {
            overlay.remove();
            callback('load');
        });
    }
    document.getElementById('slot-modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

async function saveToSlot(slot, fileName, existingFileId) {
    if (!currentAccessToken) { alert('請先授權 Google Drive！'); return; }
    if (GAME_STATE.isWaitingForAction || (GAME_STATE.players[GAME_STATE.currentPlayer] && GAME_STATE.players[GAME_STATE.currentPlayer].isBot)) {
        alert('❌ 請在「輪到您的回合，且尚未擲骰子」的狀態下存檔！');
        return;
    }

    try {
        const saveData = {
            GAME_STATE: GAME_STATE,
            MAP_DATA: MAP_DATA,
            OFFICERS_DATA: OFFICERS_DATA,
            timestamp: new Date().toISOString(),
            slotLabel: `欄位 ${slot}`
        };
        const fileContent = JSON.stringify(saveData);

        // PATCH (覆蓋) 不能包含 parents，POST (新建) 才需要
        const metadata = existingFileId
            ? { name: fileName, mimeType: 'application/json' }
            : { name: fileName, mimeType: 'application/json', parents: ['appDataFolder'] };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const method = existingFileId ? 'PATCH' : 'POST';
        const uploadUrl = existingFileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const res = await fetch(uploadUrl, { method, body: form, headers: { Authorization: 'Bearer ' + currentAccessToken } });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`上傳失敗 (${res.status}): ${errText}`);
        }

        log(`☁️ [系統] 欄位 ${slot} 存檔成功！(${new Date().toLocaleTimeString()})`);
        alert(`欄位 ${slot} 存檔成功！`);
        await renderSaveSlots(); // Refresh slot display
    } catch (e) {
        console.error('Drive save error:', e);
        alert('雲端存檔失敗: ' + e.message);
    }
}

async function loadFromSlot(fileName, fileId, slot) {
    if (!currentAccessToken) { alert('請先授權 Google Drive！'); return; }
    if (!fileId) { alert('此欄位沒有存檔！'); return; }

    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: 'Bearer ' + currentAccessToken }
        });
        if (!res.ok) throw new Error('下載失敗');
        const data = await res.json();

        Object.assign(GAME_STATE, data.GAME_STATE);
        data.MAP_DATA.forEach((savedLand) => {
            const target = MAP_DATA.find(l => l.id === savedLand.id);
            if (target) Object.assign(target, savedLand);
        });
        data.OFFICERS_DATA.forEach((savedOfficer) => {
            const target = OFFICERS_DATA.find(o => o.id === savedOfficer.id);
            if (target) Object.assign(target, savedOfficer);
        });

        restoreUI();
        if (UI.startScreen) UI.startScreen.classList.add('hidden');

        log(`☁️ [系統] 欄位 ${slot} 讀檔成功！載入自 ${new Date(data.timestamp).toLocaleString()}`);
        alert(`欄位 ${slot} 讀檔成功！`);
    } catch (e) {
        console.error('Drive load error:', e);
        alert('雲端讀檔失敗: ' + e.message);
    }
}

function restoreUI() {
    // 1. 金額更新與電腦標記恢復
    for (let i = 1; i <= 5; i++) {
        updateMoney(i, 0); 
        updateOfficerCountUI(i);
        
        // 恢復電腦玩家標記
        if (GAME_STATE.players[i] && GAME_STATE.players[i].isBot) {
            const card = UI[`p${i}Card`];
            if (card) {
                const strongElement = card.querySelector('.info h2');
                if (strongElement && !strongElement.textContent.includes('(電腦)')) {
                    strongElement.textContent += " (電腦)";
                }
            }
        }
    }
    
    // 2. 棋子位置更新
    updatePiecesPosition();
    
    // 3. 地圖格子與擁有者標記更新
    MAP_DATA.forEach(land => {
        const cell = document.getElementById(`cell-${land.id}`);
        if (cell) {
            const ownerMarker = cell.querySelector('.owner-marker');
            if (ownerMarker) {
                ownerMarker.className = 'owner-marker';
                if (land.owner === 1) ownerMarker.classList.add('owner-p1');
                else if (land.owner === 2) ownerMarker.classList.add('owner-p2');
                else if (land.owner === 3) ownerMarker.classList.add('owner-p3');
                else if (land.owner === 4) ownerMarker.classList.add('owner-p4');
                else if (land.owner === 5) ownerMarker.classList.add('owner-p5');
            }
        }
    });
    updateBoardUI(); // 更新價值與等級文字

    // 4. 重建日誌
    UI.logPanel.innerHTML = '';
    if (GAME_STATE.logs) {
        // logs 是 unshift 進去的，所以最新的在前面
        GAME_STATE.logs.forEach(msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            UI.logPanel.appendChild(p);
        });
    }

    // 5. 輪次指示器
    const currentPlayer = GAME_STATE.players[GAME_STATE.currentPlayer];
    UI.currentTurnName.textContent = currentPlayer.name;
    UI.currentTurnName.className = currentPlayer.nameClass;
    
    // 6. 啟用/禁用 動作按鈕 (根據狀態)
    if (!GAME_STATE.gameOver && !GAME_STATE.isWaitingForAction) {
        enableRollButton(true);
    } else {
        enableRollButton(false);
    }
}

// ============================================================
// Phase X: 動畫佇列系統 (避免多個特效重疊播放)
// ============================================================
(function() {
    window._animQueue = [];
    window._isAnimating = false;
    
    function enqueueAnimation(duration, animFn) {
        window._animQueue.push({duration, animFn});
        const processNext = () => {
            if (window._isAnimating || window._animQueue.length === 0) return;
            window._isAnimating = true;
            let task = window._animQueue.shift();
            task.animFn();
            setTimeout(() => {
                window._isAnimating = false;
                processNext();
            }, task.duration + 200); // 加上 200ms 的過渡間隔
        };
        processNext();
    }

    // 攔截並覆寫原始的動畫函式
    if (typeof playReversalAnimation === 'function') {
        const origReversal = playReversalAnimation;
        playReversalAnimation = (...args) => enqueueAnimation(1200, () => origReversal(...args));
    }
    
    if (typeof playAwakeningAnimation === 'function') {
        const origAwakening = playAwakeningAnimation;
        playAwakeningAnimation = (...args) => enqueueAnimation(1500, () => origAwakening(...args));
    }
    
    if (typeof playBreakthroughAnimation === 'function') {
        const origBreakthrough = playBreakthroughAnimation;
        playBreakthroughAnimation = (...args) => enqueueAnimation(1200, () => origBreakthrough(...args));
    }
    
    if (typeof playDeathAnimation === 'function') {
        const origDeath = playDeathAnimation;
        playDeathAnimation = (...args) => enqueueAnimation(1200, () => origDeath(...args));
    }
    
    if (typeof playRecruitAnimation === 'function') {
        const origRecruit = playRecruitAnimation;
        playRecruitAnimation = (...args) => enqueueAnimation(1200, () => origRecruit(...args));
    }
    
    if (typeof playItemAnimation === 'function') {
        const origItem = playItemAnimation;
        playItemAnimation = (...args) => enqueueAnimation(1200, () => origItem(...args));
    }
    
    if (typeof playAllianceAnimation === 'function') {
        const origAlliance = playAllianceAnimation;
        playAllianceAnimation = (...args) => enqueueAnimation(2000, () => origAlliance(...args));
    }
})();
