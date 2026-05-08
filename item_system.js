/**
 * item_system.js - 三國大富翁道具系統
 * 包含：useItem, consumeItem, openTargetSelect,
 *        openInventory, renderInventory,
 *        showChanganChoiceModal, showChanganModal, showChanganShopModal,
 *        toggleChanganOfficerSelection, updateChanganCostDisplay
 *        getSkillPowerPercentage
 * 依賴：utils.js (getOfficer, updateMoney, applyInjury, updateOfficerCountUI)
 */

// ============================================================
// 計算特技總加成百分點
// ============================================================
function getSkillPowerPercentage(skill) {
    if (!skill || !skill.effect) return 0;
    let mockStats = { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 };
    skill.effect(mockStats);
    let totalDiff = 0;
    for (let i = 1; i <= 6; i++) totalDiff += (mockStats[i] - 100);
    return totalDiff;
}

// ============================================================
// 道具核心邏輯
// ============================================================
function consumeItem(player, index) {
    player.items.splice(index, 1);
}

function useItem(player, itemInfo, aiTarget = null) {
    const item = itemInfo;
    const isBot = player.isBot;

    // 道具冷卻 (無懈可擊 id=6 被動，不受限)
    if (item.id !== 6) {
        player.itemCooldowns = player.itemCooldowns || {};
        const cooldownRemaining = (player.itemCooldowns[item.id] || 0) - (player.ownTurnCount || 0);
        if (cooldownRemaining > 0) {
            log(`🕐 【道具冷卻】${player.name} 的「${item.name}」尚在冷卻中，還需 ${cooldownRemaining} 個自身回合才能再次使用！`);
            GAME_STATE.isWaitingForAction = false;
            return;
        }
        player.itemCooldowns[item.id] = (player.ownTurnCount || 0) + 5;
    }

    log(`✨ ${player.name} 施展了計謀：【${item.name}】！`);
    if (isBot) playItemAnimation(item.name, player.name);

    switch (item.id) {
        case 1: // 瞞天過海: 走兩次
            player.actTwice = true;
            consumeItem(player, itemInfo.index);
            log(`步步為營！${player.name} 本回合結束後將可再次行動。`);
            GAME_STATE.isWaitingForAction = false;
            break;

        case 2: // 以逸待勞: 原地停留
            player.stayInPlace = true;
            consumeItem(player, itemInfo.index);
            log(`靜觀其變！${player.name} 下次擲骰將原地停留並直接觸發事件。`);
            GAME_STATE.isWaitingForAction = false;
            break;

        case 3: { // 暗度陳倉: 傳送
            const teleportTo = (target) => {
                const targetCellId = target.id;
                log(`出其不意！${player.name} 瞬間移動到了 ${target.name}！`);
                player.position = targetCellId;
                updatePiecesPosition();
                consumeItem(player, itemInfo.index);
                setTimeout(() => {
                    GAME_STATE.isWaitingForAction = false;
                    triggerLandEvent(player, MAP_DATA[targetCellId]);
                }, 600);
            };
            if (isBot && aiTarget) teleportTo(aiTarget);
            else openTargetSelect('land', teleportTo);
            break;
        }

        case 4: { // 暗箭傷人
            const executeSabotage = (targetPlayer) => {
                if (GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(targetPlayer.id)) {
                    log(`🤝 「同盟保護」—— ${player.name} 記得與 ${targetPlayer.name} 是同盟，收回「暗筭傷人」！`);
                    GAME_STATE.isWaitingForAction = false;
                    return;
                }
                const shieldIndex = targetPlayer.items.findIndex(it => it.id === 6);
                if (shieldIndex !== -1) {
                    log(`🛡️ 【無懈可擊】！${targetPlayer.name} 識破了計謀，道具抵消！`);
                    consumeItem(targetPlayer, shieldIndex);
                    consumeItem(player, itemInfo.index);
                    GAME_STATE.isWaitingForAction = false;
                    return;
                }

                let healthyOfficers = [], injuredOfficers = [];
                const processOfficer = (id) => {
                    let o = getOfficer(id);
                    if (o && !o.isDead) {
                        if ((o.injuryRate || 0) === 0) healthyOfficers.push(o);
                        else injuredOfficers.push(o);
                    }
                };
                targetPlayer.officers.forEach(processOfficer);
                MAP_DATA.forEach(land => {
                    if (land.owner === targetPlayer.id) land.defenders.forEach(processOfficer);
                });

                let shuffleHealthy = [...healthyOfficers].sort(() => 0.5 - Math.random());
                let sortInjured = [...injuredOfficers].sort((a, b) => (a.injuryRate || 0) - (b.injuryRate || 0));
                let victims = [...shuffleHealthy, ...sortInjured].slice(0, 3);

                if (victims.length > 0) {
                    let victimNames = [];
                    victims.forEach(victim => { applyInjury(victim, 99); victimNames.push(victim.name); });
                    log(`🏹 暗箭噴射！${targetPlayer.name} 麾下的 ${victimNames.join('、')} 遭到伏擊，負傷累累！(健康度僅剩 1%)`);
                } else {
                    log(`${targetPlayer.name} 帳下無將，逃過一劫。`);
                }
                
                // 紀錄恩怨：誰對我放冷箭
                targetPlayer.history = targetPlayer.history || { sieges: [], item_hits: {}, land_attacks: {} };
                targetPlayer.history.item_hits[player.id] = (targetPlayer.history.item_hits[player.id] || 0) + 1;

                consumeItem(player, itemInfo.index);
                GAME_STATE.isWaitingForAction = false;
            };
            if (isBot && aiTarget) executeSabotage(aiTarget);
            else openTargetSelect('player', executeSabotage, player.id);
            break;
        }

        case 5: // 臨陣磨槍: 需於攻城介面使用
            log(`[提示] 此錦囊需在「發起攻城」時於武將選擇介面中勾選使用，無法於此處直接施放。`);
            GAME_STATE.isWaitingForAction = false;
            break;

        case 6: // 無懈可擊: 被動
            log(`[提示] 此為被動道具，將在敵方對您使用負面計謀時自動發動。`);
            GAME_STATE.isWaitingForAction = false;
            break;

        case 7: { // 迴光返照: 治療
            const executeHeal = (targetOfficerId) => {
                let o = getOfficer(targetOfficerId);
                o.injuryRate = 0;
                o.cumulativeInjury = Math.max(0, (o.cumulativeInjury || 0) - 100);
                log(`✨ 神醫再世！${o.name} 的傷勢康復，且長期調養後體質恢復！`);
                consumeItem(player, itemInfo.index);
                GAME_STATE.isWaitingForAction = false;
            };
            if (isBot && aiTarget) executeHeal(aiTarget);
            else openTargetSelect('officer', executeHeal, player);
            break;
        }

        case 8: { // 殺人放火
            const executeArson = (targetLand) => {
                if (!targetLand || targetLand.type !== 'LAND' || !targetLand.owner || targetLand.owner === player.id) {
                    log(`[提示] 無法對此地使用【殺人放火】。請選擇敵方的城池。`);
                    GAME_STATE.isWaitingForAction = false;
                    return;
                }
                const targetPlayer = GAME_STATE.players[targetLand.owner];
                if (GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(targetLand.owner)) {
                    log(`🤝 「同盟保護」—— ${player.name} 記得 ${targetLand.name} 是盟友 ${targetPlayer.name} 的城池，收回「殺人放火」！`);
                    GAME_STATE.isWaitingForAction = false;
                    return;
                }
                const shieldIndex = targetPlayer.items.findIndex(it => it.id === 6);
                if (shieldIndex !== -1) {
                    log(`🛡️ 【無懈可擊】！${targetPlayer.name} 識破了計謀，道具抵消！`);
                    consumeItem(targetPlayer, shieldIndex);
                    consumeItem(player, itemInfo.index);
                    GAME_STATE.isWaitingForAction = false;
                    return;
                }

                log(`🔥 【殺人放火】！${player.name} 在 ${targetLand.name} 點燃了熊熊大火！`);
                const oldLv = targetLand.development || 0;
                const newLv = Math.floor(oldLv / 2);
                targetLand.development = newLv;
                if (oldLv > newLv) {
                    log(`🏚️ ${targetLand.name} 的建設在火光中毀於一旦，等級從 Lv ${oldLv} 降為 Lv ${newLv}！`);
                }
                updateBoardUI();

                if (targetLand.defenders && targetLand.defenders.length > 0) {
                    targetLand.defenders.forEach(id => {
                        if (Math.random() < 0.5) {
                            const o = getOfficer(id);
                            if (o) {
                                const dmg = Math.floor(Math.random() * 61) + 20;
                                applyInjury(o, dmg);
                                log(`🩸 ${o.name} 在混亂中遭到重創，負傷 ${dmg}%！`);
                            }
                        }
                    });
                }
                // 紀錄恩怨：誰燒了我的城
                targetPlayer.history = targetPlayer.history || { sieges: [], item_hits: {}, land_attacks: {} };
                targetPlayer.history.item_hits[player.id] = (targetPlayer.history.item_hits[player.id] || 0) + 1;

                consumeItem(player, itemInfo.index);
                GAME_STATE.isWaitingForAction = false;
            };
            if (isBot && aiTarget) executeArson(aiTarget);
            else openMapCitySelect(executeArson, player);
            break;
        }

        case 9: { // 天下為公
            if ((player.item9UseCount || 0) >= 3) {
                log(`🚫 ${player.name} 使用「天下為公」的次數已達單局上限 (3次)，本計謀已被封印無法發動！`);
                GAME_STATE.isWaitingForAction = false;
                return;
            }
            player.item9UseCount = (player.item9UseCount || 0) + 1;
            const activePids = GAME_STATE.activePlayers.filter(pid => !GAME_STATE.players[pid].isBankrupt);
            const totalMoney = activePids.reduce((sum, pid) => sum + GAME_STATE.players[pid].money, 0);
            const share = Math.floor(totalMoney / activePids.length);
            log(`⚖️ 【天下為公】！${player.name} 宣告財富共享，各方主公重新整理金庫，基準金額為 $${share}！ (剩餘發動次數: ${3 - player.item9UseCount})`);

            activePids.forEach(pid => {
                const targetP = GAME_STATE.players[pid];
                if (targetP.money > share) {
                    const shieldIndex = targetP.items.findIndex(it => it.id === 6);
                    if (shieldIndex !== -1) {
                        log(`🛡️ 【無懈可擊】！${targetP.name} 手握重金並識破了共產計畫，消耗道具成功保住了財產！`);
                        consumeItem(targetP, shieldIndex);
                        return;
                    }
                }
                const diff = share - targetP.money;
                updateMoney(pid, diff);
            });
            consumeItem(player, itemInfo.index);
            GAME_STATE.isWaitingForAction = false;
            break;
        }

        case 10: { // 起死回生
            const executeResurrect = (targetOfficerId) => {
                let o = getOfficer(targetOfficerId);
                o.isDead = false;
                o.injuryRate = 0;
                o.cumulativeInjury = 0;
                if (!player.officers.includes(o.id)) player.officers.push(o.id);
                player.officers = [...new Set(player.officers)];
                MAP_DATA.forEach(land => {
                    if (land.defenders) land.defenders = land.defenders.filter(id => id !== o.id);
                });
                log(`🌟 天降甘霖！【${o.name}】獲得起死回生，積傷全數歸零，奇蹟復甦重新加入戰鬥！`);
                consumeItem(player, itemInfo.index);
                updateOfficerCountUI(player.id);
                GAME_STATE.isWaitingForAction = false;
            };
            if (isBot && aiTarget) executeResurrect(aiTarget);
            else openTargetSelect('dead_officer', executeResurrect, player);
            break;
        }

        case 11: { // 離間之計
            log(`📜 【離間之計】！${player.name} 散布謠言，挑撥各方關係！`);
            if (GAME_STATE.alliance.length > 0) {
                const names = GAME_STATE.alliance.map(id => GAME_STATE.players[id].name).join('、');
                log(`💔 「同盟瓦解」 —— 受流言蜚語影響，${names} 的同盟關係徹底破裂！`);
                GAME_STATE.alliance = [];
                updateAllianceUI();
            }
            GAME_STATE.alienationTurns = 15;
            log(`📵 天下猜疑四起，未來 15 回合內各方將無法達成任何同盟！`);
            consumeItem(player, itemInfo.index);
            GAME_STATE.isWaitingForAction = false;
            break;
        }
    }
}

// ============================================================
// 被動迴光返照 - 自動觸發邏輯
// ============================================================
/**
 * 檢查玩家是否需要被動使用「迴光返照」。
 * 條件：玩家持有 ID=7 的道具 + 有武將受傷超過 90%。
 * 優先對能力總和最高的重傷武將施放。
 * @param {Object} player - 要檢查的玩家物件
 * @returns {boolean} 是否觸發了被動治療
 */
function checkPassiveHeal(player) {
    if (!player || player.isBot) return false; // 僅對人類玩家被動觸發

    const itemIdx = player.items ? player.items.findIndex(it => it.id === 7) : -1;
    if (itemIdx === -1) return false; // 沒有迴光返照

    // 收集所有受傷超過 90% 且未陣亡的武將
    const criticalOfficers = [];
    const checkOfficer = (id) => {
        const o = getOfficer(id);
        if (o && !o.isDead && (o.injuryRate || 0) > 90) {
            let total = 0;
            for (let i = 1; i <= 6; i++) total += (o.stats[i] || 0);
            criticalOfficers.push({ id: o.id, name: o.name, total });
        }
    };

    player.officers.forEach(checkOfficer);
    MAP_DATA.forEach(land => {
        if (land.owner === player.id) land.defenders.forEach(checkOfficer);
    });

    if (criticalOfficers.length === 0) return false;

    // 對能力總和最高的武將使用
    criticalOfficers.sort((a, b) => b.total - a.total);
    const target = criticalOfficers[0];
    const o = getOfficer(target.id);

    log(`💊 【迴光返照 · 被動】${player.name} 的 ${o.name} 傷勢危急 (${o.injuryRate}%)，自動施放神醫妙術！`);
    o.injuryRate = 0;
    o.cumulativeInjury = Math.max(0, (o.cumulativeInjury || 0) - 100);
    log(`✨ ${o.name} 傷勢康復，重煥鬥志！`);

    player.items.splice(itemIdx, 1);
    updateOfficerCountUI(player.id);
    return true;
}

// ============================================================
// 地圖城池選取模式 (殺人放火專用)
// ============================================================
/**
 * 進入「地圖選城」模式：高亮顯示可攻擊的城池，讓玩家直接在地圖上點選。
 * @param {Function} callback - 選定城池後的回呼，傳入 landInfo 物件
 * @param {Object}   player   - 使用道具的玩家物件
 */
function openMapCitySelect(callback, player) {
    // 找出所有「可攻擊」的城池（敵方城池，且不是盟友）
    const validLands = MAP_DATA.filter(land =>
        land.type === 'LAND' &&
        land.owner &&
        land.owner !== player.id &&
        !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(land.owner))
    );

    if (validLands.length === 0) {
        log(`[提示] 目前沒有可以放火的敵方城池。`);
        GAME_STATE.isWaitingForAction = false;
        return;
    }

    const validIds = new Set(validLands.map(l => l.id));
    let selectedLand = null;

    // ── 建立頂部提示橫幅 ──
    const banner = document.createElement('div');
    banner.id = 'arson-map-banner';
    banner.innerHTML = `
        <span>🔥 <span class="banner-hint">【殺人放火】</span> 請在地圖上點選目標城池</span>
        <button id="arson-cancel-btn">✕ 取消</button>
    `;
    document.body.appendChild(banner);

    // ── 建立底部確認按鈕 ──
    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'arson-confirm-btn';
    confirmBtn.textContent = '🔥 確認放火！';
    confirmBtn.disabled = true;
    document.body.appendChild(confirmBtn);

    // ── 為地圖格子套用樣式 ──
    document.querySelectorAll('.cell').forEach(cellEl => {
        const idx = parseInt(cellEl.getAttribute('data-index'), 10);
        if (validIds.has(idx)) {
            cellEl.classList.add('arson-targetable');
        } else {
            cellEl.classList.add('arson-dimmed');
        }
    });

    // ── 點選城池邏輯 ──
    const handleCellClick = (e) => {
        const cellEl = e.currentTarget;
        const idx = parseInt(cellEl.getAttribute('data-index'), 10);
        const land = MAP_DATA[idx];
        if (!land || !validIds.has(idx)) return;

        // 清除上一個選取
        document.querySelectorAll('.cell.arson-selected').forEach(el => {
            el.classList.remove('arson-selected');
            el.classList.add('arson-targetable');
        });

        cellEl.classList.remove('arson-targetable');
        cellEl.classList.add('arson-selected');
        selectedLand = land;
        confirmBtn.disabled = false;

        const owner = GAME_STATE.players[land.owner];
        confirmBtn.textContent = `🔥 放火於 ${land.name}（${owner.name}）！`;
    };

    // 綁定點擊事件到所有可選格子
    document.querySelectorAll('.cell.arson-targetable').forEach(cellEl => {
        cellEl.addEventListener('click', handleCellClick);
    });

    // ── 清理函式 ──
    const cleanup = () => {
        document.querySelectorAll('.cell').forEach(el => {
            el.classList.remove('arson-targetable', 'arson-selected', 'arson-dimmed');
            el.removeEventListener('click', handleCellClick);
        });
        if (banner.parentNode) banner.remove();
        if (confirmBtn.parentNode) confirmBtn.remove();
    };

    // ── 確認按鈕 ──
    confirmBtn.onclick = () => {
        if (!selectedLand) return;
        cleanup();
        callback(selectedLand);
    };

    // ── 取消按鈕 ──
    document.getElementById('arson-cancel-btn').onclick = () => {
        cleanup();
        log(`${player.name} 收回了「殺人放火」之計。`);
        GAME_STATE.isWaitingForAction = false;
    };
}

// ============================================================
// 目標選擇介面 (清單 Modal 版 — 暗度陳倉、迴光返照等使用)
// ============================================================
function openTargetSelect(type, callback, extra) {
    if (!UI.targetSelectList) return;
    UI.targetSelectList.innerHTML = '';
    UI.targetSelectTitle.textContent = type === 'land' ? '選擇傳送地點' : (type === 'player' ? '選擇施計對象' : '選擇治療對象');
    UI.targetSelectMessage.textContent = '請從清單中點選一個目標：';
    UI.btnTargetConfirm.disabled = true;
    let selectedTarget = null;

    if (type === 'land') {
        MAP_DATA.forEach(land => {
            const div = document.createElement('div');
            div.className = 'officer-item';
            let ownerName = '';
            if (land.owner) {
                const owner = GAME_STATE.players[land.owner];
                ownerName = ` <span style="color:var(--primary-color)">[${owner.name}]</span>`;
            }
            div.innerHTML = `<strong>${land.name}</strong> (${land.id === 0 ? '起點' : land.id + '號地'})${ownerName}`;
            div.onclick = () => {
                document.querySelectorAll('#target-select-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTarget = land;
                UI.btnTargetConfirm.disabled = false;
            };
            UI.targetSelectList.appendChild(div);
        });
    } else if (type === 'player') {
        GAME_STATE.activePlayers.forEach(pid => {
            if (pid === extra) return;
            const p = GAME_STATE.players[pid];
            if (p.isBankrupt) return;
            const div = document.createElement('div');
            div.className = 'officer-item';
            div.innerHTML = `<strong>${p.name}</strong>`;
            div.onclick = () => {
                document.querySelectorAll('#target-select-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTarget = p;
                UI.btnTargetConfirm.disabled = false;
            };
            UI.targetSelectList.appendChild(div);
        });
    } else if (type === 'officer' || type === 'dead_officer') {
        const playerRef = extra;
        let targetMap = new Map();
        const check = (id) => {
            let o = getOfficer(id);
            if (type === 'officer' && o && o.injuryRate > 0 && !o.isDead) targetMap.set(o.id, o);
            if (type === 'dead_officer' && o && o.isDead) targetMap.set(o.id, o);
        };
        playerRef.officers.forEach(check);
        MAP_DATA.forEach(land => { if (land.owner === playerRef.id) land.defenders.forEach(check); });
        let targets = Array.from(targetMap.values());

        if (targets.length === 0) {
            log(type === 'dead_officer' ? `[提示] 您麾下目前沒有陣亡的武將。` : `[提示] 您麾下目前沒有受傷的武將。`);
            GAME_STATE.isWaitingForAction = false;
            return;
        }

        targets.forEach(o => {
            const div = document.createElement('div');
            div.className = 'officer-item';
            div.innerHTML = `<strong>${o.name}</strong> ` + (type === 'dead_officer' ? `(陣亡)` : `(傷勢: ${o.injuryRate}%)`);
            div.onclick = () => {
                document.querySelectorAll('#target-select-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTarget = o.id;
                UI.btnTargetConfirm.disabled = false;
            };
            UI.targetSelectList.appendChild(div);
        });
    }

    UI.btnTargetConfirm.onclick = () => { UI.targetSelectModal.classList.add('hidden'); callback(selectedTarget); };
    UI.btnTargetCancel.onclick = () => { UI.targetSelectModal.classList.add('hidden'); GAME_STATE.isWaitingForAction = false; };
    UI.targetSelectModal.classList.remove('hidden');
}

// ============================================================
// 道具背包 UI
// ============================================================
function openInventory() {
    const player = GAME_STATE.players[GAME_STATE.currentPlayer];
    if (!player.items || player.items.length === 0) {
        log(`${player.name} 目前身上沒有任何錦囊道具。`);
        return;
    }
    GAME_STATE.isWaitingForAction = true;
    selectedInventoryItem = null;
    if (UI.btnConfirmUseItem) {
        UI.btnConfirmUseItem.disabled = true;
        UI.btnConfirmUseItem.onclick = () => {
            if (!selectedInventoryItem) return;
            UI.inventoryModal.classList.add('hidden');
            useItem(player, selectedInventoryItem);
        };
    }
    if (UI.btnCancelInventory) {
        UI.btnCancelInventory.onclick = () => {
            UI.inventoryModal.classList.add('hidden');
            GAME_STATE.isWaitingForAction = false;
        };
    }
    renderInventory(player);
    if (UI.inventoryModal) UI.inventoryModal.classList.remove('hidden');
}

let selectedInventoryItem = null;

function renderInventory(player) {
    if (!UI.inventoryItemList) return;
    UI.inventoryItemList.innerHTML = '';
    player.items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'officer-item';
        div.style.textAlign = 'left';

        const cooldownRemaining = item.id !== 6
            ? Math.max(0, ((player.itemCooldowns || {})[item.id] || 0) - (player.ownTurnCount || 0))
            : 0;
        const isOnCooldown = cooldownRemaining > 0;

        let extraDesc = '';
        let isDisabled = isOnCooldown;
        if (item.id === 9) {
            let usedCount = player.item9UseCount || 0;
            extraDesc = ` <span style="color:#d32f2f; font-weight:bold;">(已用: ${usedCount}/3次)</span>`;
            if (usedCount >= 3) isDisabled = true;
        }

        let cooldownTag = '';
        if (isOnCooldown) {
            cooldownTag = ` <span style="color:#ff9800; font-weight:bold;">⏳ 冷卻中 (剩 ${cooldownRemaining} 回合)</span>`;
        }

        div.innerHTML = `<strong>${item.name}</strong>${extraDesc}${cooldownTag}<br><small>${item.desc}</small>`;
        if (isDisabled) {
            div.style.opacity = '0.5';
            div.style.cursor = 'not-allowed';
            div.onclick = () => {
                if (isOnCooldown) alert(`道具冷卻中！還需 ${cooldownRemaining} 個自身回合後才能再次使用計謀。`);
                else alert(`「${item.name}」單場遊戲每位主公最多發動 3 次，您已經無法再使用本計謀。`);
            };
        } else {
            div.onclick = () => {
                document.querySelectorAll('#inventory-item-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedInventoryItem = { ...item, index: index };
                if (UI.btnConfirmUseItem) UI.btnConfirmUseItem.disabled = false;
            };
        }
        UI.inventoryItemList.appendChild(div);
    });
}

// ============================================================
// 長安/江夏 招募系統
// ============================================================
let changanSelectedOfficers = [];

function showChanganModal(player, offeredIds) {
    GAME_STATE.isWaitingForAction = true;
    changanSelectedOfficers = [];
    if (!UI.changanTotalCost) return;
    UI.changanTotalCost.textContent = '0';
    UI.changanOfficerList.innerHTML = '';

    offeredIds.forEach(id => {
        const o = getOfficer(id);
        if (!o) return;

        let cost = 0;
        for (let i = 1; i <= 6; i++) cost += o.stats[i];
        if (OFFICER_SKILLS[id]) {
            let power = getSkillPowerPercentage(OFFICER_SKILLS[id]);
            cost = power > 9 ? cost * 2 : Math.floor(cost * 1.5);
        }
        o._recruitCost = cost;

        let skillHtml = '';
        if (OFFICER_SKILLS[id]) {
            const skill = OFFICER_SKILLS[id];
            skillHtml = `<div style="font-size: 11px; margin-top: 5px; color: #ffeb3b; background: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px;">
                <strong>★${skill.name}★</strong>: ${skill.desc}
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'officer-item';
        div.style.textAlign = 'left';
        div.innerHTML = `
            <strong>${o.name}</strong>
            <div class="officer-stats">
                <span>武:${formatStatDisplay(o.baseStats[1], o.stats[1], o.injuryRate)}</span><span>智:${formatStatDisplay(o.baseStats[2], o.stats[2], o.injuryRate)}</span>
                <span>統:${formatStatDisplay(o.baseStats[3], o.stats[3], o.injuryRate)}</span><span>政:${formatStatDisplay(o.baseStats[4], o.stats[4], o.injuryRate)}</span>
                <span>魅:${formatStatDisplay(o.baseStats[5], o.stats[5], o.injuryRate)}</span><span>運:${formatStatDisplay(o.baseStats[6], o.stats[6], o.injuryRate)}</span>
            </div>
            ${skillHtml}
            <div class="officer-cost">招募金：$${cost}</div>
        `;
        div.onclick = () => toggleChanganOfficerSelection(div, o.id, player);
        UI.changanOfficerList.appendChild(div);
    });

    UI.btnChanganConfirm.onclick = () => {
        const totalCost = parseInt(UI.changanTotalCost.textContent, 10);
        if (player.money < totalCost) { alert('資金不足以招募所選武將！'); return; }
        if (changanSelectedOfficers.length > 0) {
            updateMoney(player.id, -totalCost);
            changanSelectedOfficers.forEach(id => {
                player.officers.push(id);
                GAME_STATE.changanOfficers = GAME_STATE.changanOfficers.filter(cid => cid !== id);
            });
            updateOfficerCountUI(player.id);
            log(`🎉 招賢納士！${player.name} 花費了 $${totalCost} 重金，在長安招募到 ${changanSelectedOfficers.length} 名猛將！`);
        }
        UI.changanModal.classList.add('hidden');
        showChanganShopModal(player);
    };

    UI.btnChanganCancel.onclick = () => {
        log(`${player.name} 視察了長安的在野武將，並未進行招募。`);
        UI.changanModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
    };

    UI.btnChanganConfirm.disabled = true;
    UI.changanModal.classList.remove('hidden');
}

function toggleChanganOfficerSelection(element, officerId, player) {
    const idx = changanSelectedOfficers.indexOf(officerId);
    if (idx > -1) {
        changanSelectedOfficers.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        if (changanSelectedOfficers.length >= 1) { alert('每次抵達長安，最多只能招募 1 名將領喔！'); return; }
        changanSelectedOfficers.push(officerId);
        element.classList.add('selected');
    }
    updateChanganCostDisplay(player);
}

function updateChanganCostDisplay(player) {
    let total = 0;
    changanSelectedOfficers.forEach(id => {
        const o = getOfficer(id);
        if (o && o._recruitCost) total += o._recruitCost;
    });
    UI.changanTotalCost.textContent = total;
    if (total === 0) {
        UI.changanTotalCost.style.color = 'inherit';
        UI.btnChanganConfirm.disabled = true;
    } else if (player.money < total) {
        UI.changanTotalCost.style.color = '#ff1744';
        UI.btnChanganConfirm.disabled = true;
    } else {
        UI.changanTotalCost.style.color = 'inherit';
        UI.btnChanganConfirm.disabled = false;
    }
}

// ============================================================
// 長安/江夏 選擇介面
// ============================================================
let changanCurrentPlayer = null;
let changanOfferedIds = [];

function showChanganChoiceModal(player, offeredIds) {
    GAME_STATE.isWaitingForAction = true;
    changanCurrentPlayer = player;
    changanOfferedIds = offeredIds;
    UI.btnChanganGoRecruit.disabled = (offeredIds.length === 0);
    
    UI.btnChanganGoRecruit.onclick = () => {
        UI.changanChoiceModal.classList.add('hidden');
        showChanganModal(changanCurrentPlayer, changanOfferedIds);
    };
    
    UI.btnChanganGoShop.onclick = () => {
        UI.changanChoiceModal.classList.add('hidden');
        showChanganShopModal(changanCurrentPlayer);
    };
    
    UI.btnChanganLeave.onclick = () => {
        log(`${changanCurrentPlayer.name} 在行館外駐足片刻，便轉身離去。`);
        UI.changanChoiceModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
    };

    UI.changanChoiceModal.classList.remove('hidden');
}

// ============================================================
// 道具商店
// ============================================================
let shopSelectedItem = null;

function showChanganShopModal(player) {
    GAME_STATE.isWaitingForAction = true;
    changanCurrentPlayer = player;
    shopSelectedItem = null;
    UI.changanItemCost.textContent = '0';
    UI.btnChanganBuyItem.disabled = true;
    UI.changanItemList.innerHTML = '';

    if (typeof ITEMS_DATA === 'undefined') {
        log(`[系統區] 道具資料未載入，無法開啟道具店。`);
        UI.changanItemShopModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
        return;
    }

    Object.values(ITEMS_DATA).forEach(item => {
        const div = document.createElement('div');
        div.className = 'officer-item';
        div.style.textAlign = 'left';
        let isDisabled = false;
        let disableReason = '';
        const alreadyOwned = player.items.some(it => it.id === item.id);

        if (alreadyOwned) {
            isDisabled = true;
            disableReason = '(已擁有)';
        } else if (item.id === 9 && (player.item9UseCount || 0) >= 3) {
            isDisabled = true;
            disableReason = '(已達單局上限)';
        }

        if (isDisabled) {
            div.style.opacity = '0.5';
            div.innerHTML = `<strong>${item.name}</strong> <span style="color:#f44336;">${disableReason}</span><br><small>${item.desc}</small>`;
        } else {
            div.innerHTML = `<strong>${item.name}</strong> <span style="float:right;">$${item.price}</span><br><small>${item.desc}</small>`;
            div.onclick = () => {
                document.querySelectorAll('#changan-item-list .officer-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                shopSelectedItem = item;
                UI.changanItemCost.textContent = item.price;
                if (player.money >= item.price) {
                    UI.btnChanganBuyItem.disabled = false;
                    UI.changanItemCost.style.color = 'inherit';
                } else {
                    UI.btnChanganBuyItem.disabled = true;
                    UI.changanItemCost.style.color = '#ff1744';
                }
            };
        }
        UI.changanItemList.appendChild(div);
    });

    UI.btnChanganBuyItem.onclick = () => {
        if (!shopSelectedItem) return;
        if (player.money >= shopSelectedItem.price) {
            updateMoney(player.id, -shopSelectedItem.price);
            player.items.push({ ...shopSelectedItem });
            log(`🎁 奇珍異寶！${player.name} 買下了道具【${shopSelectedItem.name}】！`);
            // 重整商店畫面，不關閉視窗，讓玩家可以繼續購買
            showChanganShopModal(player);
        }
    };

    UI.btnChanganShopCancel.onclick = () => {
        log(`${player.name} 在市集逛了一圈，沒有看中需要的道具，轉身離開了。`);
        UI.changanItemShopModal.classList.add('hidden');
        GAME_STATE.isWaitingForAction = false;
        endTurn();
    };

    UI.changanItemShopModal.classList.remove('hidden');
}
