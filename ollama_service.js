/**
 * ollama_service.js - 處理與本地端 Ollama 模型的通訊與 AI 決策邏輯
 */

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

function isOllamaEnabled() {
    const toggle = document.getElementById('ai-ollama-toggle');
    return toggle ? toggle.checked : false;
}

function getOllamaModel() {
    const input = document.getElementById('ai-ollama-model');
    return input ? input.value.trim() || 'qwen2.5' : 'qwen2.5';
}

function showAIThinking(statusText = '正在推演天機...') {
    const overlay = document.getElementById('ai-thinking-overlay');
    const status = document.getElementById('ai-thinking-status');
    if (status) status.textContent = statusText;
    if (overlay) overlay.classList.remove('hidden');
}

function hideAIThinking() {
    const overlay = document.getElementById('ai-thinking-overlay');
    if (overlay) overlay.classList.add('hidden');
}

/**
 * 顯示全螢幕垃圾話，直到玩家點擊為止
 */
function showTrashTalk(playerName, text) {
    return new Promise(resolve => {
        log(`💬 [${playerName}] 說：「${text}」`);
        const overlay = document.getElementById('trash-talk-overlay');
        const speakerEl = document.getElementById('trash-talk-speaker');
        const textEl = document.getElementById('trash-talk-text');
        
        if (overlay && speakerEl && textEl) {
            speakerEl.textContent = `【${playerName}】`;
            textEl.textContent = `「${text}」`;
            overlay.classList.remove('hidden');
            
            const handler = () => {
                overlay.classList.add('hidden');
                overlay.removeEventListener('click', handler);
                resolve();
            };
            overlay.addEventListener('click', handler);
        } else {
            resolve();
        }
    });
}

/**
 * 呼叫 Ollama 生成 JSON 決策
 * @param {string} prompt 提供給 AI 的完整文字
 * @returns {Promise<Object|null>} 回傳解析後的 JSON 物件，如果失敗則回傳 null
 */
async function askOllama(prompt) {
    const model = getOllamaModel();
    console.log(`[Ollama] 呼叫模型: ${model}, Prompt:\n`, prompt);
    
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                format: "json", // 強制輸出 JSON
                options: {
                    temperature: 0.3 // 較低溫度讓決策穩定
                }
            })
        });

        if (!response.ok) {
            console.error('[Ollama] API 回應錯誤:', response.statusText);
            return null;
        }

        const data = await response.json();
        console.log(`[Ollama] 原始回應:`, data.response);
        
        try {
            return JSON.parse(data.response);
        } catch (e) {
            console.error('[Ollama] JSON 解析失敗:', e, 'Response:', data.response);
            return null;
        }
    } catch (e) {
        console.error('[Ollama] 連線失敗:', e.message);
        return null;
    }
}

// ----------------------------------------------------
// 決策提示詞生成器
// ----------------------------------------------------

/**
 * 生成 AI 記憶與恩怨背景文字
 */
function generateMemoryContext(player) {
    if (!player.history) return "";
    let context = "\n【你的全局記憶帳本】\n";
    
    // 攻城經驗
    if (player.history.sieges && player.history.sieges.length > 0) {
        context += "- 攻城紀錄：\n";
        const siegeSummary = {};
        player.history.sieges.forEach(s => {
            siegeSummary[s.landName] = siegeSummary[s.landName] || { win: 0, loss: 0 };
            siegeSummary[s.landName][s.result]++;
        });
        Object.entries(siegeSummary).forEach(([name, res]) => {
            context += `  * 在「${name}」攻打過 ${res.win + res.loss} 次，勝 ${res.win} 敗 ${res.loss}。\n`;
        });
    }

    // 恩怨情仇 (計謀攻擊)
    if (player.history.item_hits && Object.keys(player.history.item_hits).length > 0) {
        context += "- 恩怨債務：\n";
        Object.entries(player.history.item_hits).forEach(([pid, count]) => {
            context += `  * 「${GAME_STATE.players[pid]?.name}」曾對你使用過 ${count} 次負面計謀，讓你懷恨在心。\n`;
        });
    }

    // 恩怨情仇 (領地攻擊)
    if (player.history.land_attacks && Object.keys(player.history.land_attacks).length > 0) {
        context += "- 領地衝突：\n";
        Object.entries(player.history.land_attacks).forEach(([pid, count]) => {
            context += `  * 「${GAME_STATE.players[pid]?.name}」曾攻打過你的領地 ${count} 次，這是對你權威的挑戰。\n`;
        });
    }
    
    return context;
}

/**
 * 將武將陣列轉為文字敘述
 */
function formatOfficersList(officerIds) {
    if (!officerIds || officerIds.length === 0) return "無";
    return officerIds.map(id => {
        let o = getOfficer(id);
        if (!o) return "";
        return `[ID:${o.id}] ${o.name} (武:${getEffectiveStat(o, 1)} 智:${getEffectiveStat(o, 2)} 統:${getEffectiveStat(o, 3)} 政:${getEffectiveStat(o, 4)} 魅:${getEffectiveStat(o, 5)} 運:${getEffectiveStat(o, 6)}, 傷勢:${o.injuryRate}%)`;
    }).join('\n');
}

/**
 * 敵城攻防決策 (敵方領地)
 */
async function askOllamaSiegeDecision(player, landInfo) {
    showAIThinking('思考攻城策略中...');
    const toll = getCityToll(landInfo);
    const hasBuffItem = player.items.some(it => it.id === 5);
    
    let prompt = `你是三國大富翁遊戲中的主公「${player.name}」。你現在踩到了敵方「${GAME_STATE.players[landInfo.owner].name}」的領地「${landInfo.name}」。
你的資金: $${player.money}。
該城池過路費: $${toll}。若攻城失敗需支付雙倍過路費 ($${toll * 2})。
${generateMemoryContext(player)}
你的閒置武將陣容：
${formatOfficersList(player.officers)}

敵方守城武將陣容：
${formatOfficersList(landInfo.defenders)}

你擁有臨陣磨槍道具(可增加攻城全能力10%): ${hasBuffItem ? '是' : '否'}。

請決策你要付過路費，還是發起攻城。若要攻城，請挑選 1 到 3 名武將 ID。
請參考記憶帳本：若某地失敗多次，請謹慎決定；若對方是你的仇敵，請更傾向進攻。
另外，請根據局勢與你的決定，用三國時代主公的語氣說一句「垃圾話」(可以嘲笑對手、展現霸氣或自嘲，限 15~30 字)。
請務必回傳以下 JSON 格式：
{
  "action": "pay_toll" 或 "attack",
  "officers": [武將ID1, 武將ID2, ...], // 僅 action=attack 時提供
  "use_buff": true 或 false, // 是否使用臨陣磨槍
  "trash_talk": "你的垃圾話內容"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

/**
 * 購買空地決策
 */
async function askOllamaBuyLandDecision(player, landInfo) {
    showAIThinking('盤算是否購地中...');
    let prompt = `你是三國大富翁遊戲中的主公「${player.name}」。你現在踩到了無主之地「${landInfo.name}」。
你的資金: $${player.money}。
該城池價格: $${landInfo.price}。

你的閒置武將陣容：
${formatOfficersList(player.officers)}

請決策你是否要花費資金佔領該地，並派駐至少 1 名、最多 3 名武將防守。若資金不足或不想買，可選擇跳過。
另外，請根據局勢與你的決定，用三國時代主公的語氣說一句「垃圾話」(可以展現雄心壯志或自嘲，限 15~30 字)。
請務必回傳以下 JSON 格式：
{
  "action": "buy" 或 "skip",
  "defenders": [武將ID1, 武將ID2, ...], // 若 action=buy，則必須提供派駐的武將 ID 陣列
  "trash_talk": "你的垃圾話內容"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

/**
 * 自身領地升級/換將決策
 */
async function askOllamaUpgradeDecision(player, landInfo) {
    showAIThinking('視察領地發展中...');
    const buildCost = ((landInfo.development || 0) + 1) * 100;
    
    let prompt = `你是三國大富翁遊戲中的主公「${player.name}」。你現在回到了自己的領地「${landInfo.name}」。
你的資金: $${player.money}。
目前城池等級: Lv ${landInfo.development || 0}。升級費用: $${buildCost}。

你目前的閒置武將：
${formatOfficersList(player.officers)}

目前駐守此城的武將：
${formatOfficersList(landInfo.defenders)}

你可以選擇是否花錢升級城池，以及是否要更換駐守武將 (你可以重新分配守城武將，總人數 0~3人)。
另外，請根據局勢與你的決定，用三國時代主公的語氣說一句「垃圾話」(限 15~30 字)。
請務必回傳以下 JSON 格式：
{
  "upgrade": true 或 false,
  "defenders": [武將ID1, 武將ID2, ...], // 新的守城武將陣列
  "trash_talk": "你的垃圾話內容"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

/**
 * 長安/市集 招募與購買決策
 */
async function askOllamaCityMenu(player, offeredOfficers, availableItems) {
    showAIThinking('在市集尋訪人才中...');
    
    let prompt = `你是三國大富翁遊戲中的主公「${player.name}」。你現在在長安/市集。
你的資金: $${player.money}。

目前在野可招募武將：
${offeredOfficers.map(cand => `[ID:${cand.id}] ${cand.name} (招募費:$${cand.cost})`).join('\n') || "無"}

目前可購買的奇珍異寶：
${availableItems.map(it => `[ID:${it.id}] ${it.name} (價格:$${it.price}) - ${it.desc}`).join('\n') || "無"}

你可以選擇招募 1 名武將，並購買任意數量的道具，但總花費不能超過你的資金。
另外，請根據你是否招募到人才或買到寶物，用三國時代主公的語氣說一句「垃圾話」(限 15~30 字)。
請務必回傳以下 JSON 格式：
{
  "recruit_officer_id": 選擇招募的武將ID (若不招募則為 null),
  "buy_items": [道具ID1, 道具ID2, ...], // (若不購買則為空陣列)
  "trash_talk": "你的垃圾話內容"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

/**
 * 回合初使用道具決策
 */
async function askOllamaItemUsage(player) {
    showAIThinking('策劃錦囊妙計中...');

    // === 預先計算戰場情報 ===
    const currentLand = MAP_DATA[player.position];
    const positionDesc = currentLand
        ? (currentLand.type === 'LAND'
            ? (currentLand.owner === player.id
                ? `自己的領地「${currentLand.name}」(Lv${currentLand.development || 0})`
                : currentLand.owner
                    ? (GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(currentLand.owner)
                        ? `盟友「${GAME_STATE.players[currentLand.owner]?.name}」的領地「${currentLand.name}」，同盟免過路費`
                        : `敵方「${GAME_STATE.players[currentLand.owner]?.name}」的領地「${currentLand.name}」，過路費 $${getCityToll(currentLand)}`)
                    : `無主之地「${currentLand.name}」`)
            : `特殊地點「${currentLand.name}」`)
        : '未知位置';

    // 計算周遭威脅：下一步可能踩到的高額過路費
    const nextLandId = (player.position + 1) % 20;
    const nextLand = MAP_DATA[nextLandId];
    const nextThreat = (nextLand && nextLand.type === 'LAND' && nextLand.owner && nextLand.owner !== player.id && !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(nextLand.owner)))
        ? `前方「${nextLand.name}」有敵方城池，過路費 $${getCityToll(nextLand)}`
        : null;

    // 計算最強攻擊目標（勝率最高的敵城）
    let bestTarget = null;
    let bestRate = 0;
    MAP_DATA.forEach(land => {
        if (land.type === 'LAND' && land.owner && land.owner !== player.id && !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(land.owner))) {
            const res = typeof getBestSiegeTeam === 'function'
                ? getBestSiegeTeam(player.officers, land.defenders, land.id)
                : { rate: 0 };
            if (res.rate > bestRate) {
                bestRate = res.rate;
                bestTarget = land;
            }
        }
    });

    // 傷亡情況
    const deadOfficers = player.officers.filter(id => { const o = getOfficer(id); return o && o.isDead; });
    const injuredOfficers = player.officers.filter(id => { const o = getOfficer(id); return o && o.injuryRate > 50 && !o.isDead; });

    // 敵手排名（資金最多的敵人）
    const enemies = GAME_STATE.activePlayers
        .filter(pid => pid !== player.id && !GAME_STATE.players[pid].isBankrupt && !(GAME_STATE.alliance.includes(player.id) && GAME_STATE.alliance.includes(pid)))
        .sort((a, b) => GAME_STATE.players[b].money - GAME_STATE.players[a].money);
    const richestEnemy = enemies.length > 0 ? GAME_STATE.players[enemies[0]] : null;

    // 角色性格導引
    const personalities = {
        '曹操': '你個性霸道、積極進攻，偏好使用暗箭傷人、殺人放火等攻擊性計謀，給敵人致命一擊。',
        '劉備': '你仁義為本，優先保護麾下將士（迴光返照、起死回生），但若勝算極高也不排除突襲。',
        '孫權': '你擅長戰略佈局，偏好使用暗度陳倉搶佔要地，喜歡在敵人虛弱時痛擊。',
        '董卓': '你兇殘霸道、不擇手段，幾乎任何計謀都願意使用，特別喜歡殺人放火製造混亂。',
        '袁紹': '你財大氣粗，傾向於用資金碾壓對手，但在有絕對把握時才出手。',
    };
    const personality = personalities[player.name] || '你是一位積極進取的三國主公，善於把握機會。';

    let itemsInfo = player.items.map((it, idx) => `[背包索引:${idx}] ID:${it.id} 「${it.name}」 - ${it.desc}`).join('\n');

    // 構建急迫性提示
    let urgencyHints = [];
    if (deadOfficers.length > 0 && player.items.some(it => it.id === 10))
        urgencyHints.push(`⚠️ 你有 ${deadOfficers.length} 名武將陣亡！起死回生可立即復活他們！`);
    if (injuredOfficers.length > 0 && player.items.some(it => it.id === 7))
        urgencyHints.push(`⚠️ 你有 ${injuredOfficers.length} 名武將重傷！迴光返照可恢復他們的戰力！`);
    if (bestTarget && bestRate >= 0.75 && player.items.some(it => it.id === 3))
        urgencyHints.push(`🎯 敵城「${bestTarget.name}」勝率高達 ${Math.round(bestRate * 100)}%！暗度陳倉可以瞬間奇襲！`);
    if (richestEnemy && richestEnemy.money > player.money * 1.5 && player.items.some(it => it.id === 4))
        urgencyHints.push(`💰 「${richestEnemy.name}」資金是你的 ${(richestEnemy.money / player.money).toFixed(1)} 倍！暗箭傷人可讓他損失慘重！`);
    if (nextThreat)
        urgencyHints.push(`🚨 ${nextThreat}，下回合可能被迫繳費！`);

    let prompt = `你是三國大富翁遊戲中的主公「${player.name}」。${personality}
現在是你回合的開始，你可以選擇使用一個計謀。

【當前位置】${positionDesc}
【我方資金】$${player.money}
【陣亡武將】${deadOfficers.length > 0 ? deadOfficers.map(id => getOfficer(id)?.name).join('、') : '無'}
【重傷武將】${injuredOfficers.length > 0 ? injuredOfficers.map(id => getOfficer(id)?.name).join('、') : '無'}
【閒置武將】
${formatOfficersList(player.officers.filter(id => { const o = getOfficer(id); return o && !o.isDead; }))}

【敵方威脅】
${enemies.map(pid => {
    const ep = GAME_STATE.players[pid];
    return `  ${ep.name}: 資金 $${ep.money}`;
}).join('\n') || '  無敵手'}

【背包計謀】
${itemsInfo || '無'}

${generateMemoryContext(player)}

${urgencyHints.length > 0 ? '【關鍵提示 - 強烈建議考慮以下計謀！】\n' + urgencyHints.join('\n') : ''}

請根據以上情況判斷是否使用計謀，以及使用哪一個。
注意事項：
- 請參考【全局記憶帳本】：若某位主公頻繁攻擊你或對你放冷箭，現在是你反擊的最佳時機。
- 若有【關鍵提示】中的緊急情況，**強烈建議 use_item: true**。
- 若背包有計謀但局勢平穩，仍有機會使用（30%~50% 機率）以保持壓力。
- 若使用，請提供背包索引(item_index)，以及視計謀類型填入目標：
  - 暗箭傷人(ID:4)：target_player_id 填入你最痛恨的或最富有的敵方玩家ID
  - 暗度陳倉(ID:3)：target_land_id 填入目標城池ID (0~19)
  - 殺人放火(ID:8)：target_land_id 填入你最痛恨的人的城池ID (0~19)
  - 迴光返照(ID:7)：target_officer_id 填入受傷武將ID
  - 起死回生(ID:10)：target_officer_id 填入陣亡武將ID
  - 離間之計(ID:11)：這是強力策略，使用後解除現有同盟且15回合內無法結盟。適合在你資金優勢時使用。
  - 其他計謀：target 相關欄位填 null

請務必回傳以下 JSON 格式：
{
  "use_item": true 或 false,
  "item_index": 背包索引數值 (若 use_item為false則設為 null),
  "target_player_id": 目標玩家ID (視道具需求，否則為 null),
  "target_land_id": 目標城池ID (視道具需求，否則為 null),
  "target_officer_id": 目標武將ID (視道具需求，否則為 null),
  "trash_talk": "你的垃圾話內容，限 15~30 字"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

/**
 * 戰後垃圾話 (勝負揭曉後)
 */
async function askOllamaPostBattleTrashTalk(speaker, opponent, isWin, landName, statName) {
    showAIThinking('整理戰後感言中...');
    let winText = isWin ? '勝利' : '戰敗';

    const statFlavors = {
        '武力': isWin
            ? '你靠著無敵武力把對手的軍隊打得落花流水。'
            : '武力一較高下吃了虧，氣憤不已。',
        '智力': isWin
            ? '你的軍師運籌帷幄，以奇謀看破敵陣而獲勝。'
            : '智謀輸了一籌，深感挫敗。',
        '統率': isWin
            ? '你的指揮如臂使指，軍陣嚴整一舉擊潰對手。'
            : '統率不如人，陣形散亂而敗。',
        '政治': isWin
            ? '政治謀略得當，士氣、錢糧都壓過了對手。'
            : '政務略遜一籌，糧草失調而落敗。',
        '魅力': isWin
            ? '你的將士死命效忠，以一腔熱血壓過了對手。'
            : '人心不夠，號令難行，吃了這場敗仗。',
        '運氣': isWin
            ? '天命庇佑，天賜良機讓你反敗為勝！'
            : '運氣不佳，老天竟在此刻捉弄你！'
    };

    const statContext = statFlavors[statName] || (
        isWin ? '此戰大獲全勝！' : '此戰不幸落敗！'
    );

    let prompt = `你是三國大富翁遊戲中的主公「${speaker.name}」。你剛才與「${opponent.name}」在「${landName}」發生了一場激烈的攻城戰。
戰鬥比拚的項目是【${statName}】，結果：你【${winText}】了！
情境背景：${statContext}

請根據這個情境，用三國時代主公的語氣說一句與【${statName}】相關的戰後「垃圾話」：
- 如果你贏了：嘲笑對方在【${statName}】方面的不足
- 如果你輸了：不服氣地放話說你會在【${statName}】方面奮發圖強，下次一定報仇
(限 15~30 字)
請務必回傳以下 JSON 格式：
{
  "trash_talk": "你的垃圾話內容"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

/**
 * 發動特技時的垃圾話
 */
async function askOllamaSkillTrashTalk(speaker, opponent, skillName, officerName) {
    showAIThinking('構思特技台詞中...');
    let prompt = `你是三國大富翁遊戲中的主公「${speaker.name}」。你正與「${opponent.name}」交戰。
你的麾下武將「${officerName}」剛剛發動了強大的特技【${skillName}】！

請用三國時代主公的語氣說一句「垃圾話」來嘲笑對手或炫耀這個特技帶來的優勢 (限 15~30 字)。
請務必回傳以下 JSON 格式：
{
  "trash_talk": "你的垃圾話內容"
}`;

    const res = await askOllama(prompt);
    hideAIThinking();
    return res;
}

// 初始化載入可用模型清單
async function loadOllamaModels() {
    const select = document.getElementById('ai-ollama-model');
    if (!select) return;
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                select.innerHTML = '';
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    select.appendChild(option);
                });
                // 根據 checkbox 狀態設定是否啟用
                const toggle = document.getElementById('ai-ollama-toggle');
                if (toggle) {
                    select.disabled = !toggle.checked;
                } else {
                    select.disabled = false;
                }
                return;
            }
        }
    } catch (e) {
        console.error('Ollama 模型載入失敗:', e);
    }
    // 若無法載入，提供預設選項
    select.innerHTML = '<option value="qwen2.5">qwen2.5 (預設)</option>';
}

// 執行載入
loadOllamaModels();
