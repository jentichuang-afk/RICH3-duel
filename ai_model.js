/**
 * ai_model.js - 三國大富翁 AI 決策模組
 * 包含：handleAIItemUsage, handleCityMenuAI
 * 依賴：utils.js, combat_engine.js, item_system.js (getBestSiegeTeam, useItem 等)
 */

// ============================================================
// AI 道具使用決策
// ============================================================
function handleAIItemUsage(player) {
    if (!player.items || player.items.length === 0) return;

    // 優先順位：復活(10) > 治療(7，若有傷員) > 其他(隨機)
    const hasDead = player.officers.some(id => { const o = getOfficer(id); return o && o.isDead; });
    const hasInjured = player.officers.some(id => { const o = getOfficer(id); return o && o.injuryRate > 50 && !o.isDead; });

    let indices = player.items.map((_, i) => i).sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (hasDead && player.items[a].id === 10) scoreA = 1000;
        if (hasDead && player.items[b].id === 10) scoreB = 1000;
        if (hasInjured && player.items[a].id === 7) scoreA = 500;
        if (hasInjured && player.items[b].id === 7) scoreB = 500;
        return scoreB - scoreA || 0.5 - Math.random();
    });

    for (let idx of indices) {
        const item = player.items[idx];

        // 檢查單獨道具冷卻
        const cdRemaining = Math.max(0, ((player.itemCooldowns || {})[item.id] || 0) - (player.ownTurnCount || 0));
        if (item.id !== 6 && cdRemaining > 0) continue;

        if (item.id === 7) { // 迴光返照: 治療
            let targetId = null;
            const check = (id) => { let o = getOfficer(id); if (o && o.injuryRate > 50 && !o.isDead) targetId = id; };
            player.officers.forEach(check);
            if (!targetId) MAP_DATA.forEach(land => { if (land.owner === player.id) land.defenders.forEach(check); });
            if (targetId) {
                useItem(player, { ...item, index: idx }, targetId);
                return;
            }
        }

        if (item.id === 10) { // 起死回生
            let candidates = [];
            player.officers.forEach(id => {
                let o = getOfficer(id);
                if (o && o.isDead) {
                    let totalStat = 0;
                    for (let i = 1; i <= 6; i++) totalStat += (o.stats[i] || 0);
                    candidates.push({ id: id, total: totalStat });
                }
            });
            if (candidates.length > 0) {
                candidates.sort((a, b) => b.total - a.total);
                useItem(player, { ...item, index: idx }, candidates[0].id);
                return;
            }
        }

        if (item.id === 4) { // 暗箭傷人
            if (Math.random() < 0.65) {
                let enemies = GAME_STATE.activePlayers.filter(pid =>
                    pid !== player.id &&
                    !GAME_STATE.players[pid].isBankrupt &&
                    !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(pid))
                );
                if (enemies.length > 0) {
                    enemies.sort((a, b) => GAME_STATE.players[b].money - GAME_STATE.players[a].money);
                    useItem(player, { ...item, index: idx }, GAME_STATE.players[enemies[0]]);
                    return;
                }
            }
        }

        if (item.id === 1 || item.id === 5) { // 瞞天過海, 臨陣磨槍
            if (Math.random() < 0.35) {
                useItem(player, { ...item, index: idx });
                return;
            }
        }

        if (item.id === 2) { // 以逸待勞
            const currentLand = MAP_DATA[player.position];
            let shouldStay = false;
            let stayChance = 0.4;

            // 招募優先：只要在可招募地點且有在野武將，不論手下多少人，80% 機率留下
            const canRecruit = GAME_STATE.changanOfficers && GAME_STATE.changanOfficers.length > 0;
            if (canRecruit && (currentLand.type === 'START' || currentLand.type === 'ITEM_SHOP')) {
                shouldStay = true;
                stayChance = 0.8;
                log(`🏕️ 【廣納賢才】${player.name} 決定在 ${currentLand.name} 使用「以逸待勞」，繼續招賢納士！`);
            // 領地優勢：停在自己土地或勝率高的敵城
            } else if (currentLand.owner === player.id) {
                shouldStay = true;
                stayChance = 0.5;
            } else if (currentLand.type === 'LAND' && currentLand.owner && currentLand.owner !== player.id && !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(currentLand.owner))) {
                const res = getBestSiegeTeam(player.officers, currentLand.defenders, currentLand.id);
                if (res.rate >= 0.8) {
                    shouldStay = true;
                    stayChance = 0.6;
                }
            }

            if (shouldStay && Math.random() < stayChance) {
                useItem(player, { ...item, index: idx });
                return;
            }
        }

        if (item.id === 3) { // 暗度陳倉: 傳送
            const canRecruit = GAME_STATE.changanOfficers && GAME_STATE.changanOfficers.length > 0;

            // 補員邏輯：不論武將數目，只要錢 >= $2000 且有在野武將，就飛去招募
            if (canRecruit && player.money >= 2000) {
                let recruitTargets = MAP_DATA.filter(land => land.type === "START" || land.type === "ITEM_SHOP");
                if (recruitTargets.length > 0) {
                    let targetLand = recruitTargets[Math.floor(Math.random() * recruitTargets.length)];
                    log(`🎯 【求賢若渴】${player.name} 發現在野仍有人才，決定使用「暗度陳倉」去${targetLand.name}招募武將！`);
                    useItem(player, { ...item, index: idx }, targetLand);
                    return;
                }
            } else if (player.money > 4000) {
                // 奇襲邏輯：掃描全地圖，找勝率 > 80% 的敵方城市
                let siegeTargets = MAP_DATA.filter(land =>
                    land.type === 'LAND' &&
                    land.owner &&
                    land.owner !== player.id &&
                    !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(land.owner)) &&
                    (() => { const res = getBestSiegeTeam(player.officers, land.defenders, land.id); return res.rate > 0.8; })()
                );
                if (siegeTargets.length > 0 && Math.random() < 0.3) {
                    siegeTargets.sort((a, b) => b.price - a.price);
                    let targetLand = siegeTargets[0];
                    log(`⚔️ 【精準奇襲】${player.name} 勝算極高，決定使用「暗度陳倉」奇襲 ${targetLand.name}！`);
                    useItem(player, { ...item, index: idx }, targetLand);
                    return;
                }
            }
        }

        if (item.id === 8) { // 殺人放火
            let enemyLands = MAP_DATA.filter(land =>
                land.type === 'LAND' &&
                land.owner &&
                land.owner !== player.id &&
                !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(land.owner)) &&
                land.development >= 3
            );
            if (enemyLands.length > 0 && Math.random() < 0.55) {
                enemyLands.sort((a, b) => b.development - a.development);
                useItem(player, { ...item, index: idx }, enemyLands[0]);
                return;
            }
        }

        if (item.id === 9) { // 天下為公
            if ((player.item9UseCount || 0) >= 3) return;
            const activePids = GAME_STATE.activePlayers.filter(pid => !GAME_STATE.players[pid].isBankrupt);
            const isPoorest = activePids.every(pid => pid === player.id || GAME_STATE.players[pid].money >= player.money);
            if (isPoorest && activePids.length > 1) {
                useItem(player, { ...item, index: idx });
                return;
            }
        }

        if (item.id === 11) { // 離間之計
            // 當自己金錢超過其他所有人的總和時使用
            const othersMoney = GAME_STATE.activePlayers
                .filter(pid => pid !== player.id && !GAME_STATE.players[pid].isBankrupt)
                .reduce((sum, pid) => sum + (GAME_STATE.players[pid].money || 0), 0);
            
            if (player.money > othersMoney) {
                useItem(player, { ...item, index: idx });
                return;
            }
        }
    }
}

// ============================================================
// AI 城市選單決策 (長安/江夏：招募 + 買道具)
// ============================================================
function handleCityMenuAI(player, offeredIds, cityName) {
    if (typeof isOllamaEnabled === 'function' && isOllamaEnabled()) {
        GAME_STATE.isWaitingForAction = true;
        let offeredOfficers = offeredIds.map(id => {
            const o = getOfficer(id);
            let cost = 0;
            for (let i = 1; i <= 6; i++) cost += o.stats[i];
            if (OFFICER_SKILLS[id]) {
                let power = getSkillPowerPercentage(OFFICER_SKILLS[id]);
                cost = power > 9 ? cost * 2 : Math.floor(cost * 1.5);
            }
            return { id: o.id, name: o.name, cost: cost };
        });

        let availableItems = Object.values(ITEMS_DATA).filter(it => {
            const alreadyOwned = player.items.some(pi => pi.id === it.id);
            const limitReached = it.id === 9 && (player.item9UseCount || 0) >= 3;
            return !alreadyOwned && !limitReached;
        });

        askOllamaCityMenu(player, offeredOfficers, availableItems).then(async decision => {
            if (!decision) {
                return executeCityMenuAIFallback(player, offeredIds, cityName);
            }
            let canRecruit = false;
            let targetOfficer = null;
            let officerCost = 0;

            if (decision.recruit_officer_id != null) {
                let cand = offeredOfficers.find(o => o.id === decision.recruit_officer_id);
                if (cand && player.money >= cand.cost) {
                    canRecruit = true;
                    targetOfficer = cand;
                    officerCost = cand.cost;
                }
            }

            let boughtItemsList = [];
            let tempBudget = player.money - (canRecruit ? officerCost : 0);
            if (decision.buy_items && Array.isArray(decision.buy_items)) {
                for (let itemId of decision.buy_items) {
                    let it = availableItems.find(i => i.id === itemId);
                    if (it && tempBudget >= it.price) {
                        boughtItemsList.push(it);
                        tempBudget -= it.price;
                    }
                }
            }
            executeCityMenuAction(player, cityName, canRecruit, targetOfficer, officerCost, boughtItemsList);
        }).catch(e => {
            console.error('Ollama Error:', e);
            executeCityMenuAIFallback(player, offeredIds, cityName);
        });
        return;
    }

    executeCityMenuAIFallback(player, offeredIds, cityName);
}

function executeCityMenuAction(player, cityName, canRecruit, targetOfficer, officerCost, boughtItemsList) {
    setTimeout(() => {
        try {
            if (canRecruit) {
                playRecruitAnimation(targetOfficer.name, player.name);
                setTimeout(() => {
                    updateMoney(player.id, -officerCost);
                    GAME_STATE.changanOfficers = GAME_STATE.changanOfficers.filter(id => id !== targetOfficer.id);
                    player.officers.push(targetOfficer.id);
                    updateOfficerCountUI(player.id);
                    log(`🎉 [電腦] ${player.name} 在${cityName}花費了 $${officerCost} 招募了在野武將【${targetOfficer.name}】！`);

                    if (boughtItemsList.length > 0) {
                        boughtItemsList.forEach(item => {
                            updateMoney(player.id, -item.price);
                            player.items.push({ ...item });
                            log(`🎁 奇珍異寶！[電腦] ${player.name} 順便挑選了道具【${item.name}】！`);
                        });
                    }
                    GAME_STATE.isWaitingForAction = false;
                    endTurn();
                }, 1000);
            } else if (boughtItemsList.length > 0) {
                boughtItemsList.forEach(item => {
                    updateMoney(player.id, -item.price);
                    player.items.push({ ...item });
                    log(`🎁 奇珍異寶！[電腦] ${player.name} 在${cityName}挑選了道具【${item.name}】！`);
                });
                GAME_STATE.isWaitingForAction = false;
                endTurn();
            } else {
                log(`${player.name} 視察了${cityName}後，默默離開。`);
                GAME_STATE.isWaitingForAction = false;
                endTurn();
            }
        } catch (e) {
            console.error(e);
            endTurn();
        }
    }, 1500);
}

function executeCityMenuAIFallback(player, offeredIds, cityName) {
    GAME_STATE.isWaitingForAction = true;

    // 1. 決定招募對象
    let canRecruit = false;
    let targetOfficer = null;
    let officerCost = 0;

    if (offeredIds.length > 0) {
        let availableList = offeredIds.map(id => {
            const o = getOfficer(id);
            let cost = 0;
            for (let i = 1; i <= 6; i++) cost += o.stats[i];
            if (OFFICER_SKILLS[id]) {
                let power = getSkillPowerPercentage(OFFICER_SKILLS[id]);
                cost = power > 9 ? cost * 2 : Math.floor(cost * 1.5);
            }
            return { id: o.id, name: o.name, cost: cost };
        });
        availableList.sort((a, b) => b.cost - a.cost);

        for (let cand of availableList) {
            if (player.money >= cand.cost) {
                canRecruit = true;
                targetOfficer = cand;
                officerCost = cand.cost;
                break;
            }
        }
    }

    // 2. 決定購買道具
    let boughtItemsList = [];
    let tempBudget = player.money - (canRecruit ? officerCost : 0);
    let itemOptions = Object.values(ITEMS_DATA).filter(it => {
        const alreadyOwned = player.items.some(pi => pi.id === it.id);
        const limitReached = it.id === 9 && (player.item9UseCount || 0) >= 3;
        return !alreadyOwned && !limitReached;
    });

    if (itemOptions.length > 0 && tempBudget > 0) {
        const hasDeadPur = player.officers.some(id => { const o = getOfficer(id); return o && o.isDead; });
        const hasInjuredPur = player.officers.some(id => { const o = getOfficer(id); return o && o.injuryRate > 50 && !o.isDead; });

        let shuffle = [...itemOptions].sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            if (hasDeadPur && a.id === 10) scoreA = 1000;
            if (hasDeadPur && b.id === 10) scoreB = 1000;
            if (hasInjuredPur && a.id === 7) scoreA = 500;
            if (hasInjuredPur && b.id === 7) scoreB = 500;
            // 離間之計購買邏輯：金額超過 10000 才會考慮
            if (player.money > 10000 && a.id === 11) scoreA = 300;
            if (player.money > 10000 && b.id === 11) scoreB = 300;
            return scoreB - scoreA || 0.5 - Math.random();
        });

        for (let item of shuffle) {
            let afterPrice = tempBudget - item.price;
            if (afterPrice >= 0) {
                if (afterPrice >= 10000) {
                    tempBudget = afterPrice;
                    boughtItemsList.push(item);
                } else if (boughtItemsList.length === 0) {
                    tempBudget = afterPrice;
                    boughtItemsList.push(item);
                    break;
                } else {
                    break;
                }
            }
        }
    }

    // 3. 執行結果
    executeCityMenuAction(player, cityName, canRecruit, targetOfficer, officerCost, boughtItemsList);
}
