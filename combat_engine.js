/**
 * combat_engine.js - 三國大富翁戰鬥引擎
 * 包含：applyTeamSkills, getBestSiegeTeam, executeSiege
 * 依賴：utils.js (getEffectiveStat, applyInjury, getCityToll, etc.)
 */

// ============================================================
// 武將故地加成對應表 (武將ID -> 城池ID)
// 每位武將在對應城池守城或攻城時，全能力獲得 +5% 加成
// ============================================================
const OFFICER_HOME_CITY = {
    // 蜀國
    100: 14, // 劉備 -> 成都
    101: 8,  // 關羽 -> 江陵
    102: 15, // 張飛 -> 漢中
    103: 14, // 趙雲 -> 成都
    104: 1,  // 馬超 -> 長安
    105: 9,  // 黃忠 -> 長沙
    106: 7,  // 諸葛亮 -> 襄陽
    107: 7,  // 龐統 -> 襄陽
    108: 3,  // 徐庶 -> 許昌
    109: 9,  // 魏延 -> 長沙
    110: 15, // 姜維 -> 漢中
    111: 14, // 法正 -> 成都
    112: 1,  // 馬岱 -> 長安
    113: 15, // 王平 -> 漢中
    114: 8,  // 關平 -> 江陵
    115: 7,  // 黃月英 -> 襄陽
    116: 13, // 嚴顏 -> 永安
    117: 13, // 關興 -> 永安
    118: 13, // 張苞 -> 永安
    119: 14, // 蔣琬 -> 成都
    120: 14, // 董允 -> 成都
    // 魏國
    200: 3,  // 曹操 -> 許昌
    201: 4,  // 夏侯惇 -> 鄴城
    202: 15, // 夏侯淵 -> 漢中
    203: 5,  // 張遼 -> 下邳
    204: 6,  // 徐晃 -> 宛城
    205: 4,  // 張郃 -> 鄴城
    206: 2,  // 司馬懿 -> 洛陽
    207: 4,  // 郭嘉 -> 鄴城
    208: 3,  // 荀彧 -> 許昌
    209: 3,  // 荀攸 -> 許昌
    210: 1,  // 賈詡 -> 長安
    211: 3,  // 許褚 -> 許昌
    212: 6,  // 典韋 -> 宛城
    213: 15, // 龐德 -> 漢中
    214: 7,  // 曹仁 -> 襄陽
    215: 4,  // 甄姬 -> 鄴城
    216: 5,  // 樂進 -> 下邳
    217: 5,  // 李典 -> 下邳
    218: 4,  // 于禁 -> 鄴城
    219: 1,  // 王異 -> 長安
    220: 7,  // 滿寵 -> 襄陽
    // 吳國
    300: 12, // 孫權 -> 建業
    301: 11, // 周瑜 -> 廬江
    302: 12, // 魯肅 -> 建業
    303: 8,  // 呂蒙 -> 江陵
    304: 8,  // 陸遜 -> 江陵
    305: 8,  // 甘寧 -> 江陵
    306: 12, // 太史慈 -> 建業
    307: 9,  // 黃蓋 -> 長沙
    308: 9,  // 程普 -> 長沙
    309: 9,  // 韓當 -> 長沙
    310: 11, // 周泰 -> 廬江
    311: 11, // 大喬 -> 廬江
    312: 12, // 徐盛 -> 建業
    313: 11, // 丁奉 -> 廬江
    314: 11, // 凌統 -> 廬江
    315: 11, // 小喬 -> 廬江
    316: 12, // 孫尚香 -> 建業
    317: 12, // 諸葛瑾 -> 建業
    318: 12, // 張昭 -> 建業
    319: 12, // 張紘 -> 建業
    320: 9,  // 孫策 -> 長沙
    // 群雄
    400: 1,  // 董卓 -> 長安
    401: 5,  // 呂布 -> 下邳
    402: 1,  // 貂蟬 -> 長安
    403: 4,  // 袁紹 -> 鄴城
    404: 4,  // 顏良 -> 鄴城
    405: 4,  // 文醜 -> 鄴城
    406: 4,  // 公孫瓚 -> 鄴城
    407: 1,  // 馬騰 -> 長安
    408: 3,  // 張角 -> 許昌
    409: 3,  // 張寶 -> 許昌
    410: 3,  // 張梁 -> 許昌
    411: 2,  // 皇甫嵩 -> 洛陽
    412: 2,  // 盧植 -> 洛陽
    413: 2,  // 朱儁 -> 洛陽
    414: 2,  // 華雄 -> 洛陽
    415: 5,  // 陶謙 -> 下邳
    416: 2,  // 蔡文姬 -> 洛陽
    417: 11, // 袁術 -> 廬江
    418: 5,  // 呂玲綺 -> 下邳
    419: 5,  // 高順 -> 下邳
    420: 5,  // 陳宮 -> 下邳
    // 戰國（日本）
    500: 16, // 織田信長 -> 京都
    501: 17, // 豐臣秀吉 -> 大阪
    502: 19, // 德川家康 -> 江戶
    503: 18, // 武田信玄 -> 名古屋
    504: 18, // 上杉謙信 -> 名古屋
    505: 19, // 伊達政宗 -> 江戶
    506: 17, // 真田幸村 -> 大阪
    507: 17, // 毛利元就 -> 大阪
    508: 16, // 明智光秀 -> 京都
    509: 19, // 本多忠勝 -> 江戶
    510: 19, // 井伊直政 -> 江戶
    511: 17, // 石田三成 -> 大阪
    512: 17, // 黑田官兵衛 -> 大阪
    513: 16, // 竹中半兵衛 -> 京都
    514: 17, // 前田利家 -> 大阪
    515: 16, // 柴田勝家 -> 京都
    516: 17, // 島津義弘 -> 大阪
    517: 17, // 長宗我部元親 -> 大阪
    518: 19, // 北條氏康 -> 江戶
    519: 18, // 直江兼續 -> 名古屋
    520: 16, // お市 -> 京都
};

// 處理團隊特技光環加成
function applyTeamSkills(teamIds, teamStats, enemyIds = [], isDefense = false, landInfo = null, isSimulation = false) {
    teamIds.forEach(id => {
        if (OFFICER_SKILLS[id]) {
            OFFICER_SKILLS[id].effect(teamStats, enemyIds, isDefense, landInfo);

            // Phase 71: 能力 101 以上者，原先特技獲得大幅強化 (疊加一次)
            const o = getOfficer(id);
            if (o && o.injuryRate === 0) {
                let hasBreakthrough = false;
                for (let i = 1; i <= 6; i++) {
                    if (getEffectiveStat(o, i) >= 101) {
                        hasBreakthrough = true;
                        break;
                    }
                }
                if (hasBreakthrough) {
                    OFFICER_SKILLS[id].effect(teamStats, enemyIds, isDefense, landInfo);
                }
            }
        }
    });

    // 武將故地加成：只提升該武將個人的 5%，不可疊加
    if (landInfo && landInfo.id !== undefined) {
        teamIds.forEach(id => {
            if (OFFICER_HOME_CITY[id] === landInfo.id) {
                const o = getOfficer(id);
                if (o && !o.isDead) {
                    for (let i = 1; i <= 6; i++) {
                        const personalStat = getEffectiveStat(o, i);
                        teamStats[i] = Math.ceil(teamStats[i] + personalStat * 0.05);
                    }
                    if (!isSimulation) {
                        log(`🏠 【故地雄風】${o.name} 在故地 ${landInfo.name} 奮戰，個人全能力提升 5%！`);
                    }
                }
            }
        });
    }
}

// ============================================================
// 計算 AI 最佳攻城陣容 (>50% 勝率)
// ============================================================
function getBestSiegeTeam(attackerOfficerIds, defenderIds, cityId = -1, useBuff = false, forUI = false) {
    const validAttackerIds = attackerOfficerIds.filter(id => { let o = getOfficer(id); return o && !o.isDead; });
    const landInfo = (cityId !== -1) ? MAP_DATA[cityId] : null;
    let bestTeam = null;
    let maxWins = forUI ? -1 : 2;

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defenderIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) defStats[i] += getEffectiveStat(o, i);
    });

    const evaluateTeamWinRate = (teamIds) => {
        let expectedWins = 0;
        let totalStats = 0;
        const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        teamIds.forEach(id => {
            const o = getOfficer(id);
            if (o) {
                for (let i = 1; i <= 6; i++) {
                    let eff = getEffectiveStat(o, i);
                    atkStats[i] += eff;
                    totalStats += eff;
                }
            }
        });

        let currentDefStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (let i = 1; i <= 6; i++) currentDefStats[i] = defStats[i];
        applyTeamSkills(defenderIds, currentDefStats, teamIds, true, landInfo, true);

        // 地利加成 (規則 1: 建設加成)
        const geoBonus = (landInfo) ? getDevelopmentGeoBonus(landInfo.development || 0) : 0;
        if (geoBonus > 0) {
            for (let i = 1; i <= 6; i++) currentDefStats[i] = Math.ceil(currentDefStats[i] * (1 + geoBonus / 100));
        }

        // 地利加成 (規則 2+3: 連橫 + 中心加成)
        const chainBonus = (landInfo) ? getCityChainLength(landInfo.owner, landInfo.id) : 0;
        if (chainBonus > 0) {
            for (let i = 1; i <= 6; i++) currentDefStats[i] = Math.ceil(currentDefStats[i] * (1 + chainBonus / 100));
        }

        applyTeamSkills(teamIds, atkStats, defenderIds, false, landInfo, true);

        if (useBuff) {
            for (let i = 1; i <= 6; i++) {
                atkStats[i] = Math.ceil(atkStats[i] * 1.10);
            }
        }

        let atkStr = atkStats[1], defStr = currentDefStats[1];
        let strWeight = 1;

        let dominantTeamPrediction = null;
        if (atkStr > defStr) dominantTeamPrediction = teamIds;
        else if (defStr > atkStr) dominantTeamPrediction = defenderIds;

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

        for (let i = 1; i <= 6; i++) {
            if (atkStats[i] > currentDefStats[i]) {
                expectedWins += (i === 1) ? strWeight : 1;
            }
        }
        return { wins: expectedWins, totalStats, totalOutcomes };
    };

    let minTotalStats = Infinity;
    let bestRate = -1;
    let bestWins = 0;
    let bestDenom = 6;

    const checkTeam = (team) => {
        let res = evaluateTeamWinRate(team);
        let currentRate = res.wins / res.totalOutcomes;

        if (!forUI && currentRate <= 0.49) return;

        // 使用極小值來避免浮點數比較誤差
        const isSameRate = Math.abs(currentRate - bestRate) < 1e-7;

        if (currentRate > bestRate && !isSameRate) {
            bestRate = currentRate;
            bestWins = res.wins;
            bestDenom = res.totalOutcomes;
            minTotalStats = res.totalStats;
            bestTeam = team;
        } else if (isSameRate && res.totalStats < minTotalStats) {
            bestRate = currentRate;
            bestWins = res.wins;
            bestDenom = res.totalOutcomes;
            minTotalStats = res.totalStats;
            bestTeam = team;
        }
    };


    const officers = validAttackerIds;
    const n = Math.min(officers.length, 20);

    for (let i = 0; i < n; i++) checkTeam([officers[i]]);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) checkTeam([officers[i], officers[j]]);
    }
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) checkTeam([officers[i], officers[j], officers[k]]);
        }
    }

    return { team: bestTeam, rate: bestTeam ? bestRate : 0 };
}

// ============================================================
// 執行攻城結算
// ============================================================
async function executeSiege(attacker, landInfo, attackingIds, consumedBuff = false) {
    const defenderId = landInfo.owner;
    const defender = GAME_STATE.players[defenderId];
    const defendingIds = landInfo.defenders;
    
    let aiSkillTrashTalks = [];

    // ==========================================================
    // Phase 41, 45, 61: 魅力防禦機制 (選擇攻城時結算)
    // ==========================================================
    let attackerMaxCha = 0;
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) attackerMaxCha = Math.max(attackerMaxCha, getEffectiveStat(o, 5));
    });

    let superCharismaId = defendingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 5) >= 101 && o.injuryRate === 0 && getEffectiveStat(o, 5) > attackerMaxCha;
    });
    let topCharismaId = defendingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 5) >= 95 && getEffectiveStat(o, 5) > attackerMaxCha;
    });

    let charmId = superCharismaId || topCharismaId;
    let charmChance = superCharismaId ? 0.75 : 0.50;

    if (charmId && Math.random() < charmChance) {
        const charmer = getOfficer(charmId);
        const isFemale = (typeof FEMALE_OFFICER_IDS !== "undefined" && FEMALE_OFFICER_IDS.includes(charmer.id));
        let displayName;
        let flavorText;
        if (superCharismaId) {
            displayName = isFemale ? "傾世紅顏" : "天選之子";
            flavorText = isFemale ? charmer.name + " 的絕代仙姿令我軍神魂顛倒，不戰而降" : charmer.name + " 的天命威儀使我軍不戰而屈";
        } else {
            displayName = isFemale ? "傾國傾城" : "名德眾望";
            flavorText = isFemale ? charmer.name + " 的絕代風華令我軍神魂顛倒" : charmer.name + " 的仁德之風使我軍肅然起敬";
        }
        let toll = getCityToll(landInfo);

        log("✨ 【" + displayName + "】" + charmer.name + " 威名遠播！" + attacker.name + " 雖欲發起攻城，卻被其風采感化，最終放棄進攻，繳納軍費 $" + toll + " 後離去。");
        
        applyInjury(charmer, 50);
        log("🩸 " + charmer.name + " 因為發揮特技退敵而消耗大量精神，受傷程度增加！(目前健康: " + (100 - charmer.injuryRate) + "%)");
        updateOfficerCountUI(defenderId);

        const overlay = document.createElement("div");
        overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(156, 39, 176, 0.4); z-index: 9999; display: flex; justify-content: center; align-items: center; pointer-events: none; opacity: 0; transition: opacity 0.3s;";
        overlay.innerHTML = "<h1 style=\"color: white; font-size: 5vw; text-shadow: 0 0 20px #e1bee7; transform: scale(0.5); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);\">✨ " + displayName + " - " + charmer.name + " ✨</h1>";
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
            overlay.querySelector("h1").style.transform = "scale(1)";
        });

        setTimeout(async () => {
            overlay.style.opacity = "0";
            setTimeout(() => overlay.remove(), 500);

            if (defender.isBot && !attacker.isBot && typeof isOllamaEnabled === 'function' && isOllamaEnabled()) {
                try {
                    const talk = await askOllamaSkillTrashTalk(defender, attacker, displayName, charmer.name);
                    if (talk && talk.trash_talk) await showTrashTalk(defender.name, talk.trash_talk);
                } catch(e) {}
            }

            if (attacker.isBot) {
                setTimeout(() => { payToll(attacker, defender, toll); }, 500);
            } else {
                showModal(
                    displayName + " - " + charmer.name,
                    "<div style=\"text-align:center;\">"
                    + "<div style=\"font-size: 1.2rem; color: #9c27b0; font-weight: bold; margin-bottom: 10px;\">★ " + displayName + " ★</div>"
                    + "<p>" + flavorText + "！<br>我軍意志動搖，放棄攻城，僅繳交軍費 $" + toll + " 後離去。</p>"
                    + "<p style=\"color:#d32f2f; font-size: 0.9rem; margin-top: 10px;\">(※ " + charmer.name + " 因發動特技退敵，受傷程度增加 50%)</p>"
                    + "</div>",
                    () => { payToll(attacker, defender, toll); },
                    null, "繳交軍費", null
                );
            }
        }, 1500);
        return;
    }
    // ==========================================================

    attacker.officers = attacker.officers.filter(id => id != null && !attackingIds.includes(id));
    updateOfficerCountUI(attacker.id);

    let atkStr = 0, defStr = 0;
    attackingIds.forEach(id => { let o = getOfficer(id); if (o) atkStr += getEffectiveStat(o, 1); });
    defendingIds.forEach(id => { let o = getOfficer(id); if (o) defStr += getEffectiveStat(o, 1); });

    let dominantTeam = null;
    let dominantName = "";
    if (atkStr > defStr) { dominantTeam = attackingIds; dominantName = "攻方"; }
    else if (defStr > atkStr) { dominantTeam = defendingIds; dominantName = "守方"; }

    let statPool = [1, 2, 3, 4, 5, 6];
    let extraStrCount = 0;
    let hasSuperStr = false;

    if (dominantTeam) {
        dominantTeam.forEach(id => {
            let o = getOfficer(id);
            if (o) {
                if (getEffectiveStat(o, 1) >= 101 && o.injuryRate === 0) {
                    extraStrCount += 2;
                    statPool.push(1, 1);
                    hasSuperStr = true;
                } else if (getEffectiveStat(o, 1) >= 95) {
                    extraStrCount += 1;
                    statPool.push(1);
                }
            }
        });
    }

    if (extraStrCount > 0) {
        if (hasSuperStr) {
            log(`💪 【萬夫莫敵】戰場出現武力突破極限的猛將，且${dominantName}武力佔優，硬碰硬的機率巨幅疊加提升！(累積票數: ${extraStrCount})`);
        } else {
            log(`💪 【一夫當關】${dominantName}擁有多名驍勇虎將且總力佔優，硬碰硬的機率疊加提升！(累積票數: ${extraStrCount})`);
        }
    }
    const statRoll = statPool[Math.floor(Math.random() * statPool.length)];
    const statNames = { 1: '武力', 2: '智力', 3: '統率', 4: '政治', 5: '魅力', 6: '運氣' };
    const statName = statNames[statRoll];

    let attackerScore = 0;
    const atkTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) atkTempStats[i] += getEffectiveStat(o, i); }
    });
    applyTeamSkills(attackingIds, atkTempStats, defendingIds, false, landInfo);
    attackerScore = atkTempStats[statRoll];

    if (attacker.siegeBuff || consumedBuff) {
        attacker.siegeBuff = false;
        const defenderPlayer = (landInfo.owner) ? GAME_STATE.players[landInfo.owner] : null;
        const shieldIndex = defenderPlayer ? defenderPlayer.items.findIndex(it => it.id === 6) : -1;

        if (shieldIndex !== -1) {
            log(`🛡️ 【無懈可擊】！${defenderPlayer.name} 識破了敵方的臨陣磨槍，加成無效！`);
            consumeItem(defenderPlayer, shieldIndex);
        } else {
            log(`🔥 【臨陣磨槍】發動！攻城方比拚項目提升 10%！`);
            attackerScore = Math.floor(attackerScore * 1.10);
        }
    }

    let defenderScore = 0;
    const defTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) defTempStats[i] += getEffectiveStat(o, i); }
    });
    applyTeamSkills(defendingIds, defTempStats, attackingIds, true, landInfo);
    defenderScore = defTempStats[statRoll];

    // 地利加成 (規則 1: 建設加成)
    const geoBonus = (landInfo) ? getDevelopmentGeoBonus(landInfo.development || 0) : 0;
    if (geoBonus > 0) {
        defenderScore = Math.ceil(defenderScore * (1 + geoBonus / 100));
    }

    // 地利加成 (規則 2+3: 連橫 + 中心加成)
    const chainBonus = getCityChainLength(landInfo.owner, landInfo.id);
    if (chainBonus > 0) {
        log(`🏰 【連橫效應】此城發揮連橫地利，全防守屬性提升 ${chainBonus}%！`);
        defenderScore = Math.ceil(defenderScore * (1 + chainBonus / 100));
    }

    let isAttackerWin = attackerScore > defenderScore;

    // Phase 31: 頂尖智將「絕境逆轉」
    let reversalProc = false;
    let reversalHtml = "";
    let reversalSacrificeId = null;
    let actingStrategistIdGlobal = null;
    let losingIdsForCheck = isAttackerWin ? defendingIds : attackingIds;
    let winningIdsForCheck = isAttackerWin ? attackingIds : defendingIds;

    let maxWinnerInt = 0;
    winningIdsForCheck.forEach(id => {
        const o = getOfficer(id);
        if (o && getEffectiveStat(o, 2) >= 95) {
            maxWinnerInt = Math.max(maxWinnerInt, getEffectiveStat(o, 2));
        }
    });

    let superStrategistId = losingIdsForCheck.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 2) >= 101 && o.injuryRate === 0 && getEffectiveStat(o, 2) > maxWinnerInt;
    });

    let topStrategistId = losingIdsForCheck.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 2) >= 95 && getEffectiveStat(o, 2) > maxWinnerInt;
    });

    let revChance = superStrategistId ? 0.75 : (topStrategistId ? 0.50 : 0);
    let actingStrategistId = superStrategistId || topStrategistId;

    if (actingStrategistId && Math.random() < revChance) {
        reversalProc = true;
        actingStrategistIdGlobal = actingStrategistId;
        isAttackerWin = !isAttackerWin;
        playReversalAnimation();
        const strategistName = getOfficer(actingStrategistId).name;

        if (superStrategistId) {
            reversalSacrificeId = superStrategistId;
            reversalHtml = `<div style="margin-top: 15px; padding: 10px; background: rgba(156, 39, 176, 0.2); border: 2px solid #9C27B0; border-radius: 5px;">
                <div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">【神鬼莫測】絕境逆轉！</div>
                <div style="font-size: 14px; margin-top: 5px;">✨ <strong>${strategistName}</strong> 犧牲自我發動奇謀，成功扭轉了戰局！隊友毫髮無傷！</div>
            </div>`;
            log(`✨ 【神鬼莫測】${strategistName} 智力突破極限，犧牲自我發動奇謀扭轉戰局，且保護了其他隊友！`);
            
            let originalWinner = (!isAttackerWin) ? attacker : defender;
            let originalLoser = (!isAttackerWin) ? defender : attacker;
            if (originalLoser.isBot && !originalWinner.isBot) {
                aiSkillTrashTalks.push({ skillName: '神鬼莫測', officerName: strategistName, owner: originalLoser, opponent: originalWinner });
            }
        } else {
            reversalHtml = `<div style="margin-top: 15px; padding: 10px; background: rgba(156, 39, 176, 0.2); border: 1px solid #9C27B0; border-radius: 5px;">
                <div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">【神機妙算】絕境逆轉！</div>
                <div style="font-size: 14px; margin-top: 5px;">✨ <strong>${strategistName}</strong> 在絕境中看破敵陣，雙方兩敗俱傷，攻城瓦解！</div>
            </div>`;
            log(`✨ 【神機妙算】${strategistName} 智力超群，在絕境中看破敵陣，雙方兩敗俱傷，攻方無功而返，守方亦未得錢糧！`);
            
            let originalWinner = (!isAttackerWin) ? attacker : defender;
            let originalLoser = (!isAttackerWin) ? defender : attacker;
            if (originalLoser.isBot && !originalWinner.isBot) {
                aiSkillTrashTalks.push({ skillName: '神機妙算', officerName: strategistName, owner: originalLoser, opponent: originalWinner });
            }
        }
    }

    // Phase 26: 紀錄戰績
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { o.battleCount++; if (isAttackerWin) o.winCount++; }
    });
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { o.battleCount++; if (!isAttackerWin) o.winCount++; }
    });

    let winningTeamIds = isAttackerWin ? attackingIds : defendingIds;
    let losingTeamIds = isAttackerWin ? defendingIds : attackingIds;
    let growthHtml = "";
    let injuryHtml = "";

    let pointDiff = Math.abs(attackerScore - defenderScore);
    let winInjuryRate = 0.1;
    let loseInjuryRate = 0.5;

    if (statRoll === 1) {
        winInjuryRate *= 2;
        loseInjuryRate *= 2;
    }
    if (pointDiff > 50) {
        loseInjuryRate = 1.0;
    } else if (pointDiff < 10) {
        winInjuryRate *= 0.5;
        loseInjuryRate *= 0.5;
    }

    let winnerSuperCommander = winningTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 101 && o.injuryRate === 0;
    });
    let loserSuperCommander = losingTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 101 && o.injuryRate === 0;
    });
    let winnerTopCommander = winningTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 95;
    });
    let loserTopCommander = losingTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 95;
    });

    let winnerCmdName = winnerSuperCommander ? getOfficer(winnerSuperCommander).name : (winnerTopCommander ? getOfficer(winnerTopCommander).name : "");
    let loserCmdName = loserSuperCommander ? getOfficer(loserSuperCommander).name : (loserTopCommander ? getOfficer(loserTopCommander).name : "");

    const preBattleAttackerLuckHealerId = attackingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 6) >= 95;
    });
    const preBattleDefenderLuckHealerId = defendingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 6) >= 95;
    });

    winningTeamIds.forEach(id => {
        const o = getOfficer(id);
        if (o) {
            if (Math.random() < 0.75) {
                const oldVal = o.stats[statRoll];
                o.stats[statRoll] += 1;
                const newVal = o.stats[statRoll];
                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">⬆️ <strong>${o.name}</strong> 的【${statName}】提升了 1 點！</div>`;
                log(`✨ ${o.name} 在戰鬥中得到了成長，【${statName}】提升了 1 點！`);
                if (oldVal < 95 && newVal >= 95 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playAwakeningAnimation(o.name, statName);
                    log(`🎊 【覺醒】${o.name} 突破極限，領悟了新的隱藏特技！`);
                }
                if (oldVal < 101 && newVal >= 101 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playBreakthroughAnimation(o.name, statName);
                    log(`⭐ 【破極】${o.name} 登峰造極，原先特技獲得了大幅強化！`);
                }
            }
            if (reversalProc) {
                let dmg = 0;
                let auraStr = "";
                let isStrategist = (id === actingStrategistIdGlobal);
                if (isStrategist) {
                    dmg = Math.floor(Math.random() * 50) + 50;
                    auraStr = reversalSacrificeId ? ' (神鬼莫測代價)' : ' (神機妙算代價)';
                } else {
                    if (reversalSacrificeId) {
                        dmg = 0;
                    } else {
                        dmg = Math.floor(Math.random() * 50) + 1;
                        auraStr = ' (神機妙算代價)';
                    }
                }
                if (dmg > 0) {
                    if (winnerSuperCommander) {
                        if (id !== winnerSuperCommander) { dmg = 0; auraStr = ` 🛡️(${winnerCmdName} 神級指揮，免疫受傷)`; }
                        else { dmg = Math.floor(dmg / 2); auraStr += ` 🛡️(${winnerCmdName} 神級指揮，代價減半)`; }
                    } else if (winnerTopCommander) {
                        dmg = Math.floor(dmg / 2);
                        auraStr += ` 🛡️(${winnerCmdName} 統整，代價減半)`;
                    }
                }
                if (dmg > 0) {
                    applyInjury(o, dmg);
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">🩸 <strong>${o.name}</strong> 因逆轉奇謀，重創 ${dmg}%！${auraStr}</div>`;
                    log(`🩸 ${o.name} 承受逆轉代價，陷入 ${dmg}% 的重傷！${auraStr}`);
                } else if (auraStr && actingStrategistIdGlobal) {
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">🛡️ <strong>${o.name}</strong> 在 ${winnerCmdName} 保護下，免於逆轉重創！</div>`;
                    log(`🛡️ ${o.name} 在 ${winnerCmdName} 保護下，免於逆轉重創！`);
                }
            } else {
                if (Math.random() < winInjuryRate) {
                    let dmg = Math.floor(Math.random() * 81) + 10;
                    let auraStr = "";
                    if (winnerSuperCommander) {
                        if (id !== winnerSuperCommander) { dmg = 0; auraStr = ` 🛡️(${winnerCmdName} 神級指揮，友軍無傷)`; }
                        else { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${winnerCmdName} 神級指揮降傷)`; }
                    } else {
                        if (winnerTopCommander) { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${winnerCmdName} 統整降低傷亡)`; }
                    }
                    if (dmg > 0 && getEffectiveStat(o, 5) >= 95 && Math.random() < 0.30) {
                        dmg = 0;
                        log(`✨ 【百折不休】發動！${o.name} 魅力驚人，麾下將士死命保護，免疫了本次戰役受傷！`);
                        let owner = winningTeamIds.includes(id) ? (isAttackerWin ? attacker : defender) : (isAttackerWin ? defender : attacker);
                        let opponent = (owner === attacker) ? defender : attacker;
                        if (owner.isBot && !opponent.isBot) {
                            aiSkillTrashTalks.push({ skillName: '百折不休', officerName: o.name, owner: owner, opponent: opponent });
                        }
                    }
                    if (dmg > 0) {
                        applyInjury(o, dmg);
                        injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">⚠️ <strong>${o.name}</strong> 在激戰中掛彩，能力下降 ${dmg}%！${auraStr}</div>`;
                        log(`⚠️ ${o.name} 戰勝後掛彩，能力下降 ${dmg}%！`);
                    }
                }
            }
        }
    });

    losingTeamIds.forEach(id => {
        const o = getOfficer(id);
        if (o) {
            if (Math.random() < 0.25) {
                const oldVal = o.stats[statRoll];
                o.stats[statRoll] += 1;
                const newVal = o.stats[statRoll];
                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">🔥 <strong>${o.name}</strong> 越挫越勇，【${statName}】提升了 1 點！</div>`;
                log(`🔥 ${o.name} 從敗軍中記取教訓，【${statName}】提升了 1 點！`);
                if (oldVal < 95 && newVal >= 95 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playAwakeningAnimation(o.name, statName);
                    log(`🎊 【覺醒】${o.name} 突破極限，領悟了新的隱藏特技！`);
                }
                if (oldVal < 101 && newVal >= 101 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playBreakthroughAnimation(o.name, statName);
                    log(`⭐ 【破極】${o.name} 登峰造極，原先特技獲得了大幅強化！`);
                }
            }
            if (Math.random() < loseInjuryRate) {
                let dmg = Math.floor(Math.random() * 81) + 10;
                let auraStr = "";
                if (loserSuperCommander) {
                    if (id !== loserSuperCommander) { dmg = 0; auraStr = ` 🛡️(${loserCmdName} 神級指揮，友軍無傷)`; }
                    else { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${loserCmdName} 神級指揮降傷)`; }
                } else {
                    if (loserTopCommander) { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${loserCmdName} 統整降低傷亡)`; }
                }
                if (dmg > 0 && getEffectiveStat(o, 5) >= 95 && Math.random() < 0.30) {
                    dmg = 0;
                    log(`✨ 【百折不休】發動！${o.name} 魅力驚人，麾下將士死命保護，免疫了本次戰敗受傷！`);
                    let owner = losingTeamIds.includes(id) ? (!isAttackerWin ? attacker : defender) : (!isAttackerWin ? defender : attacker);
                    let opponent = (owner === attacker) ? defender : attacker;
                    if (owner.isBot && !opponent.isBot) {
                        aiSkillTrashTalks.push({ skillName: '百折不休', officerName: o.name, owner: owner, opponent: opponent });
                    }
                }
                if (dmg > 0) {
                    applyInjury(o, dmg);
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">💥 <strong>${o.name}</strong> 受到重創，全能力下降 ${dmg}%！${auraStr}</div>`;
                    log(`💥 ${o.name} 在戰局中身受重傷，全能力下降 ${dmg}%！`);
                }
            }
        }
    });

    let resultHtml = `系統擲出 ${statRoll} 點，決定比拚【${statName}】！<br>攻方 (${attackerScore} 點) VS 守方加成後 (${defenderScore} 點)！`;
    if (reversalHtml) resultHtml += reversalHtml;
    if (growthHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4CAF50; border-radius: 5px;">
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">【戰鬥成長】</div>
            ${growthHtml}
        </div>`;
    }
    if (injuryHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(244, 67, 54, 0.2); border: 1px solid #F44336; border-radius: 5px;">
            <div style="color: #F44336; font-weight: bold; margin-bottom: 5px;">【將星隕落】</div>
            ${injuryHtml}
        </div>`;
    }

    // 吉星高照治療
    const teams = [
        { ids: attackingIds, name: attacker.name, healerId: preBattleAttackerLuckHealerId },
        { ids: defendingIds, name: defender.name, healerId: preBattleDefenderLuckHealerId }
    ];
    teams.forEach(team => {
        if (team.healerId) {
            const healer = getOfficer(team.healerId);
            const isSuperLucky = healer && getEffectiveStat(healer, 6) >= 101 && healer.injuryRate === 0;
            let injuredAllies = team.ids.filter(id => getOfficer(id).injuryRate > 0);
            let hasCumulativeInjury = team.ids.some(id => (getOfficer(id).cumulativeInjury || 0) > 0);
            
            if (injuredAllies.length > 0 || (isSuperLucky && hasCumulativeInjury)) {
                let healMsg = "";
                if (isSuperLucky) {
                    let healedNames = [];
                    injuredAllies.forEach(targetId => {
                        let target = getOfficer(targetId);
                        target.injuryRate = 0;
                        healedNames.push(target.name);
                    });
                    
                    let availablePoints = 100;
                    let candidatesToReduce = team.ids.map(id => getOfficer(id)).filter(o => (o.cumulativeInjury || 0) > 0);
                    
                    while (availablePoints > 0 && candidatesToReduce.length > 0) {
                        let randIndex = Math.floor(Math.random() * candidatesToReduce.length);
                        let randOfficer = candidatesToReduce[randIndex];
                        randOfficer.cumulativeInjury--;
                        availablePoints--;
                        if (randOfficer.cumulativeInjury <= 0) {
                            candidatesToReduce.splice(randIndex, 1);
                        }
                    }

                    if (healedNames.length > 0) {
                        healMsg = `🍀 【天降甘霖】${healer.name} 運氣爆棚！戰後神蹟降臨，同隊伍的 ${healedNames.join('、')} 傷勢完全康復，並為參戰陣容隨機消退了總計 100 點累積受傷！`;
                    } else {
                        healMsg = `🍀 【天降甘霖】${healer.name} 運氣爆棚！無人重傷，戰後神蹟降臨，直接為參戰陣容隨機消退了總計 100 點累積受傷！`;
                    }
                } else {
                    if (injuredAllies.length > 0) {
                        let targetId = injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
                        let target = getOfficer(targetId);
                        target.injuryRate = 0;
                        target.cumulativeInjury = Math.max(0, (target.cumulativeInjury || 0) - 50);
                        healMsg = `🍀 【吉星高照】${healer.name} 展現奇蹟，使 ${target.name} 的傷勢完全恢復，並降低累積傷勢 50 點！`;
                    }
                }
                
                if (healMsg) {
                    let skillName = isSuperLucky ? '天降甘霖' : '吉星高照';
                    let owner = (team.name === attacker.name) ? attacker : defender;
                    let opponent = (owner === attacker) ? defender : attacker;
                    if (owner.isBot && !opponent.isBot) {
                        aiSkillTrashTalks.push({ skillName: skillName, officerName: healer.name, owner: owner, opponent: opponent });
                    }
                    log(healMsg);
                    resultHtml += `<div style="margin-top: 10px; padding: 8px; background: rgba(255, 235, 59, 0.2); border: 1px solid #FBC02D; border-radius: 5px;">
                        <div style="color: #FBC02D; font-weight: bold; margin-bottom: 3px;">【幸運治療】</div>
                        <div style="font-size: 13px;">${healMsg}</div>
                    </div>`;
                }
            }
        }
    });

    GAME_STATE.isWaitingForAction = true;

    if (typeof isOllamaEnabled === 'function' && isOllamaEnabled()) {
        // 先顯示特技垃圾話
        for (let task of aiSkillTrashTalks) {
            try {
                const talk = await askOllamaSkillTrashTalk(task.owner, task.opponent, task.skillName, task.officerName);
                if (talk && talk.trash_talk) await showTrashTalk(task.owner.name, talk.trash_talk);
            } catch (e) {}
        }
        
        let speaker = null;
        if (attacker.isBot && !defender.isBot) {
            speaker = attacker;
        } else if (defender.isBot && !attacker.isBot) {
            speaker = defender;
        }
        
        if (speaker) {
            let isSpeakerWin = (speaker === attacker) ? isAttackerWin : !isAttackerWin;
            if (reversalProc) isSpeakerWin = false; // 如果神機妙算兩敗俱傷，雙方都不算贏
            let opponent = (speaker === attacker) ? defender : attacker;
            try {
                const talkDecision = await askOllamaPostBattleTrashTalk(speaker, opponent, isSpeakerWin, landInfo.name, statName);
                if (talkDecision && talkDecision.trash_talk) {
                    await showTrashTalk(speaker.name, talkDecision.trash_talk);
                }
            } catch (e) {
                console.error('Ollama Post-Battle Trash Talk Error:', e);
            }
        }
    }

    showModal(
        `攻城戰報 - 比拚【${statName}】`,
        resultHtml,
        () => {
            if (reversalProc) {
                log(`🛑 雙方因【神機妙算】絕境拼鬥，兩敗俱傷！${attacker.name} 撤隊而回，幸免於過路費損失。`);
                attacker.officers.push(...attackingIds);
                updateOfficerCountUI(attacker.id);
                endTurn();
            } else if (isAttackerWin) {
                log(`🔥 攻城勝利！${attacker.name} 奪下 ${landInfo.name}！`);
                defender.officers.push(...defendingIds);
                updateOfficerCountUI(defender.id);
                landInfo.owner = attacker.id;
                landInfo.defenders = attackingIds;
                if (landInfo.development && landInfo.development > 0 && Math.random() < 0.5) {
                    landInfo.development -= 1;
                    updateBoardUI();
                    log(`🏚️ 由於飽受戰火洗禮，${landInfo.name} 的建設等級下降為 Lv ${landInfo.development}。`);
                }
                const cell = document.getElementById(`cell-${landInfo.id}`);
                const ownerMarker = cell.querySelector('.owner-marker');
                ownerMarker.className = 'owner-marker';
                if (attacker.id === 1) ownerMarker.classList.add('owner-p1');
                if (attacker.id === 2) ownerMarker.classList.add('owner-p2');
                if (attacker.id === 3) ownerMarker.classList.add('owner-p3');
                if (attacker.id === 4) ownerMarker.classList.add('owner-p4');
                if (attacker.id === 5) ownerMarker.classList.add('owner-p5');
                // 紀錄攻城歷史 (全記錄)
                attacker.history = attacker.history || { sieges: [], item_hits: {}, land_attacks: {} };
                attacker.history.sieges.push({ landId: landInfo.id, landName: landInfo.name, result: 'win', time: new Date().getTime() });
                
                // 紀錄被攻打歷史
                defender.history = defender.history || { sieges: [], item_hits: {}, land_attacks: {} };
                defender.history.land_attacks[attacker.id] = (defender.history.land_attacks[attacker.id] || 0) + 1;

                endTurn();
            } else {
                const penalty = getCityToll(landInfo) * 2;
                log(`❌ 攻城失敗！${attacker.name} 損失慘重，支付雙倍過路費 $${penalty}！`);
                attacker.officers.push(...attackingIds);
                updateOfficerCountUI(attacker.id);
                // 紀錄攻城歷史 (全記錄)
                attacker.history = attacker.history || { sieges: [], item_hits: {}, land_attacks: {} };
                attacker.history.sieges.push({ landId: landInfo.id, landName: landInfo.name, result: 'loss', time: new Date().getTime() });

                // 紀錄被攻打歷史 (即使失敗也算是一次冒犯)
                defender.history = defender.history || { sieges: [], item_hits: {}, land_attacks: {} };
                defender.history.land_attacks[attacker.id] = (defender.history.land_attacks[attacker.id] || 0) + 1;

                payToll(attacker, defender, penalty);
            }
        },
        null, '確認戰果', null
    );

    if (attacker.isBot && defender.isBot) {
        setTimeout(() => {
            try {
                if (!UI.modal.classList.contains('hidden') && UI.modalTitle.textContent.includes('戰報')) {
                    const btn = document.getElementById('btn-modal-yes');
                    if (btn) btn.click();
                }
            } catch (e) {
                console.error("AI click modal error:", e);
                endTurn();
            }
        }, 3000);
    }
}
