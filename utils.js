/**
 * utils.js - 三國大富翁共用工具函式
 * 此檔案包含所有可被多個模組共用的計算邏輯
 */

// ============================================================
// Phase 21: 武將能力計算
// ============================================================

function getEffectiveStat(o, statIdx) {
    let val = o.stats[statIdx];
    if (o.injuryRate > 0) {
        val = Math.floor(val * (100 - o.injuryRate) / 100);
    }
    return val;
}

function formatStatDisplay(base, current, injuryRate = 0) {
    let effective = current;
    if (injuryRate > 0) {
        effective = Math.floor(current * (100 - injuryRate) / 100);
    }
    let html = `${base}`;
    if (current > base) {
        html += ` &nbsp;<span style="color: #ff5252; font-weight: bold;">(+${current - base})</span>`;
    }
    if (injuryRate > 0) {
        html += ` <span style="color: #e57373; font-weight: bold; font-size: 0.9em;">(傷&rarr;${effective})</span>`;
    }
    return html;
}

// ============================================================
// Phase 76: 受傷與陣亡判定
// ============================================================

function applyInjury(officer, dmg) {
    if (officer.isDead) return;
    let actualDmg = Math.max(0, dmg);
    if (actualDmg === 0) return;

    officer.injuryRate = Math.min(100, (officer.injuryRate || 0) + actualDmg);
    officer.cumulativeInjury = (officer.cumulativeInjury || 0) + actualDmg;

    if (officer.cumulativeInjury >= 500) {
        officer.isDead = true;
        officer.injuryRate = 100;

        let ownerName = "在野";
        for (let pid in GAME_STATE.players) {
            let p = GAME_STATE.players[pid];
            if (p.officers.includes(officer.id)) {
                ownerName = p.name;
                break;
            }
        }
        for (let land of MAP_DATA) {
            if (land.defenders && land.defenders.includes(officer.id)) {
                let p = GAME_STATE.players[land.owner];
                ownerName = p.name;
                land.defenders = land.defenders.filter(id => id !== officer.id);
                if (!p.officers.includes(officer.id)) {
                    p.officers.push(officer.id);
                }
                break;
            }
        }

        log(`☠️ 【武將陣亡】${ownerName} 麾下的 ${officer.name} 傷勢累積達 500，不幸陣亡！`);
        playDeathAnimation(officer.name);
        updateOfficerCountUI(1); updateOfficerCountUI(2); updateOfficerCountUI(3); updateOfficerCountUI(4); updateOfficerCountUI(5);
    }
}

// ============================================================
// 根據 ID 獲取武將資料
// ============================================================

function getOfficer(id) {
    return OFFICERS_DATA.find(o => o.id === id);
}

// ============================================================
// Phase 66: 地利計算 (連橫 + 中心加成)
// ============================================================

function getCityChainLength(playerId, cityId) {
    if (cityId === 0 || cityId === 10 || playerId == null) return 0;

    const visited = new Set();
    visited.add(cityId);

    const getNextLandIndex = (cur, step) => {
        let next = (cur + step + 20) % 20;
        while (next === 0 || next === 10) {
            next = (next + step + 20) % 20;
        }
        return next;
    };

    let curL = cityId;
    while (true) {
        let next = getNextLandIndex(curL, -1);
        if (visited.has(next)) break;
        if (MAP_DATA[next] && MAP_DATA[next].owner === playerId) {
            visited.add(next);
            curL = next;
        } else {
            break;
        }
    }

    let curR = cityId;
    while (true) {
        let next = getNextLandIndex(curR, 1);
        if (visited.has(next)) break;
        if (MAP_DATA[next] && MAP_DATA[next].owner === playerId) {
            visited.add(next);
            curR = next;
        } else {
            break;
        }
    }

    const count = visited.size;

    // 規則 2: 連橫加成 +n%
    // 規則 3: 中心加成 +2%
    let bonus = 0;
    if (count > 1) {
        bonus += count;
        let leftCity = getNextLandIndex(cityId, -1);
        let rightCity = getNextLandIndex(cityId, 1);
        let hasLeft = MAP_DATA[leftCity] && MAP_DATA[leftCity].owner === playerId;
        let hasRight = MAP_DATA[rightCity] && MAP_DATA[rightCity].owner === playerId;
        if (hasLeft && hasRight) {
            bonus += 2;
        }
    }

    return bonus;
}

/**
 * 計算建設等級帶來的地利加成
 * 規則 1: Lv 0-3 固定 +3%, Lv 4+ = +lv%
 */
function getDevelopmentGeoBonus(development) {
    const lv = development || 0;
    if (lv <= 3) return 3;
    return lv;
}

/**
 * 計算城池當前價值 (基礎價格 + 等級加成)
 */
function getCityValue(land) {
    if (!land || land.type !== 'LAND') return 0;
    return Math.floor(land.price * (1 + (land.development || 0) * 0.1));
}

/**
 * 計算城池當前過路費 (價值的 50%)
 */
function getCityToll(land) {
    if (!land || land.type !== 'LAND') return 0;
    return Math.floor(getCityValue(land) * 0.5);
}

// ============================================================
// UI 更新工具函式
// ============================================================

function updateMoney(playerId, amount) {
    const p = GAME_STATE.players[playerId];
    p.money = parseInt(p.money, 10) + parseInt(amount, 10);
    if (playerId === 1) UI.p1Money.textContent = p.money;
    if (playerId === 2) UI.p2Money.textContent = p.money;
    if (playerId === 3) UI.p3Money.textContent = p.money;
    if (playerId === 4 && UI.p4Money) UI.p4Money.textContent = p.money;
    if (playerId === 5 && UI.p5Money) UI.p5Money.textContent = p.money;
}

function updateOfficerCountUI(playerId) {
    const p = GAME_STATE.players[playerId];
    const el = document.getElementById(`p${playerId}-officers`);
    if (el) {
        const aliveCount = p.officers.filter(id => {
            const o = getOfficer(id);
            return o && !o.isDead;
        }).length;
        el.textContent = aliveCount;
    }
}

function updateBoardUI() {
    MAP_DATA.forEach(land => {
        const cell = document.getElementById(`cell-${land.id}`);
        if (cell) {
            const nameSpan = cell.querySelector('.city-name');
            if (nameSpan) {
                if (land.type === 'LAND') {
                    const cityValue = getCityValue(land);
                    let lvText = (land.development && land.development > 0) ? `<br><span style="color:#e67e22; font-weight:bold;">Lv ${land.development}</span>` : "";
                    nameSpan.innerHTML = `${land.name}<br><small>$${cityValue}</small>${lvText}`;
                } else if (land.type === 'START') {
                    nameSpan.innerHTML = `${land.name}<br><small>招募/領賞</small>`;
                } else if (land.type === 'ITEM_SHOP') {
                    nameSpan.innerHTML = `${land.name}<br><small>招募/道具</small>`;
                }
            }
        }
    });
}

// log() -> 保留在 game.js (具備防 XSS 版本)

// ============================================================
// Phase 12+: 城市稅收計算
// ============================================================

function getCityTaxIncome(land) {
    if (!land.owner || land.type !== 'LAND') return 0;
    const cityValue = getCityValue(land);
    const baseTax = cityValue * 0.01;

    let totalPolitics = 100;
    if (land.defenders && land.defenders.length > 0) {
        let teamStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        land.defenders.forEach(id => {
            const o = getOfficer(id);
            if (o) {
                for (let i = 1; i <= 6; i++) {
                    teamStats[i] += getEffectiveStat(o, i);
                }
            }
        });
        applyTeamSkills(land.defenders, teamStats, [], true, land);
        totalPolitics = teamStats[4];
    }

    let cityIncome = Math.floor((totalPolitics / 100) * baseTax);

    let superPolitician = land.defenders.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 4) >= 101 && o.injuryRate === 0;
    });
    let elitePolitician = land.defenders.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 4) >= 95;
    });

    if (superPolitician) cityIncome *= 5;
    else if (elitePolitician) cityIncome *= 2;

    return cityIncome;
}

function processCityTaxesAndInflation(player) {
    let totalTaxIncome = 0;
    let taxedCities = 0;
    let eliteTaxCities = 0;

    MAP_DATA.forEach(land => {
        if (land.owner === player.id) {
            let cityIncome = getCityTaxIncome(land);
            let superPolitician = land.defenders.find(id => {
                const o = getOfficer(id);
                return o && getEffectiveStat(o, 4) >= 101 && o.injuryRate === 0;
            });
            let elitePolitician = land.defenders.find(id => {
                const o = getOfficer(id);
                return o && getEffectiveStat(o, 4) >= 95;
            });
            if (superPolitician || elitePolitician) eliteTaxCities++;
            if (cityIncome > 0) {
                totalTaxIncome += cityIncome;
                taxedCities++;
            }
        }
    });

    if (totalTaxIncome > 0) {
        updateMoney(player.id, totalTaxIncome);
        let eliteStr = eliteTaxCities > 0 ? ` (含 ${eliteTaxCities} 座「富國強兵/經世濟民」加成)` : "";
        log(`💰 【城市稅收】${player.name} 從名下 ${taxedCities} 座城市獲稅 $${totalTaxIncome}！${eliteStr}`);
    }
}
