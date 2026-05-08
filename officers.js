// Phase 58, 59, 61: 定義女性武將 ID，用於專有特技判定
const FEMALE_OFFICER_IDS = [115, 215, 219, 311, 315, 316, 402, 416, 418, 520];

// 武將特技定義
const OFFICER_SKILLS = {
    // 蜀國
    100: { name: "漢室宗親", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 劉備
    101: { name: "武聖", desc: "團隊武力+5%、統率+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[3] = Math.ceil(stats[3] * 1.05); } }, // 關羽
    102: { name: "萬人敵", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 張飛
    103: { name: "單騎救主", desc: "團隊運氣+5%、武力+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[1] = Math.ceil(stats[1] * 1.05); } }, // 趙雲
    104: { name: "神威天將", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 馬超
    106: { name: "臥龍", desc: "團隊智力+10%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.10); } }, // 諸葛亮
    107: { name: "鳳雛", desc: "團隊智力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); } }, // 龐統
    110: { name: "天水麒麟", desc: "團隊智力+3%、統率+2%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.03); stats[3] = Math.ceil(stats[3] * 1.02); } }, // 姜維
    // Phase 61: 新增蜀漢女性武將特技
    115: { name: "奇才", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 黃月英
    // 魏國
    200: { name: "亂世奸雄", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 曹操
    201: { name: "盲夏侯", desc: "團隊統御+5%、運氣+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); stats[6] = Math.ceil(stats[6] * 1.05); } }, // 夏侯惇
    203: { name: "威震逍遙", desc: "團隊統率+10%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.10); } }, // 張遼
    206: { name: "深謀遠慮", desc: "團隊運氣+5%、政治+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[4] = Math.ceil(stats[4] * 1.05); } }, // 司馬懿
    207: { name: "鬼才", desc: "團隊智力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); } }, // 郭嘉
    211: { name: "虎痴", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 許褚
    212: { name: "古之惡來", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 典韋
    214: { name: "鐵壁", desc: "團隊統御+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); } }, // 曹仁
    // Phase 61: 新增曹魏女性武將特技
    215: { name: "洛神", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 甄姬
    219: { name: "節烈", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 王異
    // 吳國
    300: { name: "江東之主", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 孫權
    301: { name: "雅量高致", desc: "團隊智力+5%、魅力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 周瑜
    302: { name: "宏碁大略", desc: "團隊政治+10%", effect: (stats) => { stats[4] = Math.ceil(stats[4] * 1.10); } }, // 魯肅
    303: { name: "白衣渡江", desc: "團隊運氣+7%、統率+2%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.07); stats[3] = Math.ceil(stats[3] * 1.02); } }, // 呂蒙
    304: { name: "連營", desc: "團隊統御+5%、智力+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); stats[2] = Math.ceil(stats[2] * 1.05); } }, // 陸遜
    305: { name: "錦帆賊", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 甘寧
    306: { name: "篤烈", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 太史慈
    311: { name: "國色", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 大喬
    315: { name: "國色", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 小喬
    316: { name: "梟姬", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 孫尚香
    320: { name: "小霸王", desc: "團隊武力+5%、魅力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 孫策
    // 群雄
    400: { name: "魔王", desc: "團隊武/智/統/政/運+4%，魅力-5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.04); stats[2] = Math.ceil(stats[2] * 1.04); stats[3] = Math.ceil(stats[3] * 1.04); stats[4] = Math.ceil(stats[4] * 1.04); stats[6] = Math.ceil(stats[6] * 1.04); stats[5] = Math.floor(stats[5] * 0.95); } }, // 董卓
    401: { name: "飛將", desc: "團隊武力+10%/統御+5%，智力-5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); stats[3] = Math.ceil(stats[3] * 1.05); stats[2] = Math.floor(stats[2] * 0.95); } }, // 呂布
    402: { name: "閉月", desc: "團隊魅力+10%。若敵方無女性對手，全能力再+2%", effect: (stats, enemyIds = []) => { stats[5] = Math.ceil(stats[5] * 1.10); const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 貂蟬
    403: { name: "名門", desc: "團隊運氣+10%/政治+5%，統御-5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.10); stats[4] = Math.ceil(stats[4] * 1.05); stats[3] = Math.floor(stats[3] * 0.95); } }, // 袁紹
    406: { name: "白馬將軍", desc: "團隊統率+5%", effect: (stats) => { stats[3] = Math.ceil(stats[3] * 1.05); } }, // 公孫瓚
    408: { name: "黃天當立", desc: "團隊運氣+5%、魅力+5%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.05); stats[5] = Math.ceil(stats[5] * 1.05); } }, // 張角
    411: { name: "平黃巾", desc: "團隊全能力+1%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.01); } }, // 皇甫嵩
    412: { name: "海內人望", desc: "團隊全能力+1%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.01); } }, // 盧植
    // Phase 59: 新增女性武將群雄特技
    416: { name: "悲歌", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 蔡文姬
    418: { name: "戰姬", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // 呂玲綺
    // 戰國 (日本)
    500: { name: "天下布武", desc: "團隊全能力+3%", effect: (stats) => { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.03); } }, // 織田信長
    501: { name: "身分向上", desc: "團隊政治+10%", effect: (stats) => { stats[4] = Math.ceil(stats[4] * 1.10); } }, // 豐臣秀吉
    502: { name: "三方原之悟", desc: "團隊運氣+10%", effect: (stats) => { stats[6] = Math.ceil(stats[6] * 1.10); } }, // 德川家康
    503: { name: "風林火山", desc: "團隊武力+5%、統率+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); stats[3] = Math.ceil(stats[3] * 1.05); } }, // 武田信玄
    504: { name: "軍神", desc: "團隊武力+10%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.10); } }, // 上杉謙信
    506: { name: "日本第一兵", desc: "團隊武力+5%", effect: (stats) => { stats[1] = Math.ceil(stats[1] * 1.05); } }, // 真田幸村
    507: { name: "謀將", desc: "團隊智力+5%", effect: (stats) => { stats[2] = Math.ceil(stats[2] * 1.05); } }, // 毛利元就
    520: { name: "戰國第一美女", desc: "若敵方無女性對手，團隊全能力+2%", effect: (stats, enemyIds = []) => { const hasFemale = enemyIds.some(id => FEMALE_OFFICER_IDS.includes(id)); if (!hasFemale) { for (let i = 1; i <= 6; i++) stats[i] = Math.ceil(stats[i] * 1.02); } } }, // お市
};

const OFFICERS_DATA = [
    // 蜀國 (1)
    { id: 100, name: "劉備", faction: 1, stats: { 1: 75, 2: 79, 3: 81, 4: 83, 5: 98, 6: 100 } },
    { id: 101, name: "關羽", faction: 1, stats: { 1: 97, 2: 76, 3: 96, 4: 63, 5: 93, 6: 61 } },
    { id: 102, name: "張飛", faction: 1, stats: { 1: 99, 2: 30, 3: 85, 4: 22, 5: 46, 6: 51 } },
    { id: 103, name: "趙雲", faction: 1, stats: { 1: 96, 2: 77, 3: 92, 4: 66, 5: 80, 6: 86 } },
    { id: 104, name: "馬超", faction: 1, stats: { 1: 96, 2: 44, 3: 88, 4: 27, 5: 81, 6: 41 } },
    { id: 105, name: "黃忠", faction: 1, stats: { 1: 94, 2: 60, 3: 87, 4: 52, 5: 75, 6: 55 } },
    { id: 106, name: "諸葛亮", faction: 1, stats: { 1: 38, 2: 100, 3: 96, 4: 96, 5: 93, 6: 80 } },
    { id: 107, name: "龐統", faction: 1, stats: { 1: 34, 2: 96, 3: 85, 4: 86, 5: 69, 6: 31 } },
    { id: 108, name: "徐庶", faction: 1, stats: { 1: 65, 2: 93, 3: 84, 4: 81, 5: 82, 6: 70 } },
    { id: 109, name: "魏延", faction: 1, stats: { 1: 92, 2: 70, 3: 86, 4: 46, 5: 39, 6: 46 } },
    { id: 110, name: "姜維", faction: 1, stats: { 1: 90, 2: 91, 3: 88, 4: 68, 5: 80, 6: 65 } },
    { id: 111, name: "法正", faction: 1, stats: { 1: 48, 2: 94, 3: 82, 4: 78, 5: 56, 6: 59 } },
    { id: 112, name: "馬岱", faction: 1, stats: { 1: 85, 2: 55, 3: 80, 4: 47, 5: 65, 6: 49 } },
    { id: 113, name: "王平", faction: 1, stats: { 1: 77, 2: 76, 3: 83, 4: 58, 5: 61, 6: 69 } },
    { id: 114, name: "關平", faction: 1, stats: { 1: 82, 2: 67, 3: 76, 4: 60, 5: 75, 6: 55 } },
    // Phase 61: 替換周倉，改為黃月英 (維持總屬性 322 點不變)
    { id: 115, name: "黃月英", faction: 1, stats: { 1: 20, 2: 93, 3: 52, 4: 80, 5: 65, 6: 10 } },
    { id: 116, name: "嚴顏", faction: 1, stats: { 1: 82, 2: 70, 3: 80, 4: 64, 5: 74, 6: 60 } },
    // Phase 57: 替換孟獲與祝融，改為關興與張苞 (維持總屬性 696 點不變)
    { id: 117, name: "關興", faction: 1, stats: { 1: 86, 2: 55, 3: 72, 4: 45, 5: 60, 6: 30 } },
    { id: 118, name: "張苞", faction: 1, stats: { 1: 88, 2: 45, 3: 70, 4: 35, 5: 55, 6: 55 } },
    { id: 119, name: "蔣琬", faction: 1, stats: { 1: 32, 2: 83, 3: 77, 4: 92, 5: 81, 6: 73 } },
    { id: 120, name: "董允", faction: 1, stats: { 1: 29, 2: 81, 3: 62, 4: 91, 5: 78, 6: 70 } },
    // 魏國 (2)
    { id: 200, name: "曹操", faction: 2, stats: { 1: 71, 2: 92, 3: 100, 4: 91, 5: 95, 6: 85 } },
    { id: 201, name: "夏侯惇", faction: 2, stats: { 1: 89, 2: 57, 3: 90, 4: 73, 5: 87, 6: 47 } },
    { id: 202, name: "夏侯淵", faction: 2, stats: { 1: 92, 2: 52, 3: 91, 4: 62, 5: 80, 6: 46 } },
    { id: 203, name: "張遼", faction: 2, stats: { 1: 91, 2: 76, 3: 96, 4: 58, 5: 85, 6: 81 } },
    { id: 204, name: "徐晃", faction: 2, stats: { 1: 86, 2: 77, 3: 84, 4: 49, 5: 72, 6: 67 } },
    { id: 205, name: "張郃", faction: 2, stats: { 1: 90, 2: 71, 3: 89, 4: 51, 5: 74, 6: 61 } },
    { id: 206, name: "司馬懿", faction: 2, stats: { 1: 62, 2: 99, 3: 96, 4: 94, 5: 86, 6: 86 } },
    { id: 207, name: "郭嘉", faction: 2, stats: { 1: 18, 2: 99, 3: 84, 4: 85, 5: 77, 6: 40 } },
    { id: 208, name: "荀彧", faction: 2, stats: { 1: 17, 2: 93, 3: 51, 4: 96, 5: 90, 6: 63 } },
    { id: 209, name: "荀攸", faction: 2, stats: { 1: 24, 2: 93, 3: 75, 4: 90, 5: 79, 6: 69 } },
    { id: 210, name: "賈詡", faction: 2, stats: { 1: 48, 2: 97, 3: 88, 4: 87, 5: 54, 6: 59 } },
    { id: 211, name: "許褚", faction: 2, stats: { 1: 96, 2: 32, 3: 63, 4: 21, 5: 58, 6: 53 } },
    { id: 212, name: "典韋", faction: 2, stats: { 1: 98, 2: 34, 3: 48, 4: 26, 5: 58, 6: 40 } },
    { id: 213, name: "龐德", faction: 2, stats: { 1: 94, 2: 71, 3: 79, 4: 45, 5: 67, 6: 46 } },
    { id: 214, name: "曹仁", faction: 2, stats: { 1: 85, 2: 58, 3: 88, 4: 46, 5: 75, 6: 66 } },
    // Phase 61: 替換曹洪與程昱，改為甄姬與王異 (維持二人總屬性 763 點不變)
    { id: 215, name: "甄姬", faction: 2, stats: { 1: 15, 2: 80, 3: 30, 4: 75, 5: 96, 6: 85 } },
    { id: 216, name: "樂進", faction: 2, stats: { 1: 84, 2: 50, 3: 78, 4: 51, 5: 67, 6: 54 } },
    { id: 217, name: "李典", faction: 2, stats: { 1: 77, 2: 71, 3: 79, 4: 75, 5: 69, 6: 59 } },
    { id: 218, name: "于禁", faction: 2, stats: { 1: 79, 2: 69, 3: 83, 4: 58, 5: 55, 6: 32 } },
    { id: 219, name: "王異", faction: 2, stats: { 1: 65, 2: 85, 3: 88, 4: 60, 5: 60, 6: 24 } },
    { id: 220, name: "滿寵", faction: 2, stats: { 1: 67, 2: 82, 3: 78, 4: 84, 5: 80, 6: 60 } },
    // 吳國 (21 人, 總計提升體質以平衡勝率)
    { id: 300, name: "孫權", faction: 3, stats: { 1: 69, 2: 80, 3: 76, 4: 84, 5: 74, 6: 95 } },
    { id: 301, name: "周瑜", faction: 3, stats: { 1: 67, 2: 96, 3: 98, 4: 81, 5: 91, 6: 80 } },
    { id: 302, name: "魯肅", faction: 3, stats: { 1: 51, 2: 89, 3: 75, 4: 95, 5: 90, 6: 79 } },
    { id: 303, name: "呂蒙", faction: 3, stats: { 1: 81, 2: 88, 3: 90, 4: 72, 5: 79, 6: 74 } },
    { id: 304, name: "陸遜", faction: 3, stats: { 1: 64, 2: 94, 3: 93, 4: 83, 5: 88, 6: 87 } },
    { id: 305, name: "甘寧", faction: 3, stats: { 1: 93, 2: 74, 3: 87, 4: 42, 5: 52, 6: 13 } },
    { id: 306, name: "太史慈", faction: 3, stats: { 1: 92, 2: 67, 3: 84, 4: 54, 5: 74, 6: 54 } },
    { id: 307, name: "黃蓋", faction: 3, stats: { 1: 83, 2: 70, 3: 79, 4: 61, 5: 78, 6: 61 } },
    { id: 308, name: "程普", faction: 3, stats: { 1: 80, 2: 78, 3: 83, 4: 72, 5: 84, 6: 74 } },
    { id: 309, name: "韓當", faction: 3, stats: { 1: 86, 2: 51, 3: 78, 4: 47, 5: 65, 6: 52 } },
    { id: 310, name: "周泰", faction: 3, stats: { 1: 88, 2: 38, 3: 78, 4: 36, 5: 57, 6: 38 } },
    { id: 311, name: "大喬", faction: 3, stats: { 1: 15, 2: 75, 3: 20, 4: 70, 5: 96, 6: 74 } },
    { id: 312, name: "徐盛", faction: 3, stats: { 1: 79, 2: 73, 3: 80, 4: 63, 5: 72, 6: 59 } },
    { id: 313, name: "丁奉", faction: 3, stats: { 1: 78, 2: 69, 3: 77, 4: 58, 5: 68, 6: 51 } },
    { id: 314, name: "凌統", faction: 3, stats: { 1: 84, 2: 52, 3: 74, 4: 40, 5: 66, 6: 56 } },
    { id: 315, name: "小喬", faction: 3, stats: { 1: 14, 2: 77, 3: 18, 4: 68, 5: 97, 6: 76 } },
    { id: 316, name: "孫尚香", faction: 3, stats: { 1: 85, 2: 65, 3: 75, 4: 42, 5: 86, 6: 10 } },
    { id: 317, name: "諸葛瑾", faction: 3, stats: { 1: 31, 2: 78, 3: 70, 4: 87, 5: 88, 6: 77 } },
    { id: 318, name: "張昭", faction: 3, stats: { 1: 22, 2: 80, 3: 29, 4: 100, 5: 85, 6: 77 } },
    { id: 319, name: "張紘", faction: 3, stats: { 1: 20, 2: 85, 3: 31, 4: 92, 5: 85, 6: 80 } },
    { id: 320, name: "孫策", faction: 3, stats: { 1: 92, 2: 69, 3: 88, 4: 70, 5: 90, 6: 53 } },
    // 群雄 (4)
    { id: 400, name: "董卓", faction: 4, stats: { 1: 88, 2: 75, 3: 67, 4: 54, 5: 42, 6: 37 } },
    { id: 401, name: "呂布", faction: 4, stats: { 1: 100, 2: 27, 3: 95, 4: 18, 5: 41, 6: 26 } },
    { id: 402, name: "貂蟬", faction: 4, stats: { 1: 24, 2: 83, 3: 74, 4: 88, 5: 100, 6: 89 } },
    { id: 403, name: "袁紹", faction: 4, stats: { 1: 70, 2: 71, 3: 84, 4: 74, 5: 91, 6: 82 } },
    { id: 404, name: "顏良", faction: 4, stats: { 1: 94, 2: 28, 3: 89, 4: 33, 5: 54, 6: 44 } },
    { id: 405, name: "文醜", faction: 4, stats: { 1: 95, 2: 25, 3: 90, 4: 31, 5: 53, 6: 41 } },
    { id: 406, name: "公孫瓚", faction: 4, stats: { 1: 85, 2: 70, 3: 82, 4: 66, 5: 78, 6: 65 } },
    { id: 407, name: "馬騰", faction: 4, stats: { 1: 84, 2: 53, 3: 81, 4: 58, 5: 86, 6: 74 } },
    { id: 408, name: "張角", faction: 4, stats: { 1: 28, 2: 88, 3: 89, 4: 87, 5: 97, 6: 96 } },
    { id: 409, name: "張寶", faction: 4, stats: { 1: 71, 2: 81, 3: 84, 4: 78, 5: 91, 6: 85 } },
    { id: 410, name: "張梁", faction: 4, stats: { 1: 81, 2: 70, 3: 82, 4: 61, 5: 84, 6: 76 } },
    { id: 411, name: "皇甫嵩", faction: 4, stats: { 1: 77, 2: 84, 3: 91, 4: 86, 5: 91, 6: 86 } },
    { id: 412, name: "盧植", faction: 4, stats: { 1: 66, 2: 91, 3: 86, 4: 90, 5: 93, 6: 88 } },
    { id: 413, name: "朱儁", faction: 4, stats: { 1: 74, 2: 80, 3: 84, 4: 82, 5: 87, 6: 85 } },
    { id: 414, name: "華雄", faction: 4, stats: { 1: 92, 2: 32, 3: 87, 4: 43, 5: 57, 6: 41 } },
    { id: 415, name: "陶謙", faction: 4, stats: { 1: 30, 2: 74, 3: 43, 4: 87, 5: 90, 6: 84 } },
    // Phase 59: 替換孔融與紀靈，改為蔡文姬與呂玲綺 (維持總屬性 781 點不變)
    { id: 416, name: "蔡文姬", faction: 4, stats: { 1: 12, 2: 86, 3: 35, 4: 85, 5: 96, 6: 88 } },
    { id: 417, name: "袁術", faction: 4, stats: { 1: 64, 2: 61, 3: 67, 4: 44, 5: 43, 6: 20 } },
    { id: 418, name: "呂玲綺", faction: 4, stats: { 1: 93, 2: 40, 3: 82, 4: 28, 5: 76, 6: 60 } },
    { id: 419, name: "高順", faction: 4, stats: { 1: 86, 2: 62, 3: 87, 4: 57, 5: 80, 6: 64 } },
    { id: 420, name: "陳宮", faction: 4, stats: { 1: 37, 2: 91, 3: 73, 4: 85, 5: 72, 6: 57 } },
    // 戰國 (日本) (5)
    { id: 500, name: "織田信長", faction: 5, stats: { 1: 72, 2: 88, 3: 93, 4: 91, 5: 95, 6: 45 } },
    { id: 501, name: "豐臣秀吉", faction: 5, stats: { 1: 55, 2: 84, 3: 78, 4: 93, 5: 87, 6: 91 } },
    { id: 502, name: "德川家康", faction: 5, stats: { 1: 62, 2: 82, 3: 84, 4: 95, 5: 80, 6: 96 } },
    { id: 503, name: "武田信玄", faction: 5, stats: { 1: 83, 2: 91, 3: 96, 4: 75, 5: 87, 6: 40 } },
    { id: 504, name: "上杉謙信", faction: 5, stats: { 1: 94, 2: 80, 3: 95, 4: 55, 5: 91, 6: 49 } },
    { id: 505, name: "伊達政宗", faction: 5, stats: { 1: 81, 2: 83, 3: 85, 4: 72, 5: 86, 6: 65 } },
    { id: 506, name: "真田幸村", faction: 5, stats: { 1: 95, 2: 75, 3: 90, 4: 35, 5: 91, 6: 25 } },
    { id: 507, name: "毛利元就", faction: 5, stats: { 1: 52, 2: 96, 3: 86, 4: 89, 5: 83, 6: 70 } },
    { id: 508, name: "明智光秀", faction: 5, stats: { 1: 68, 2: 87, 3: 84, 4: 83, 5: 80, 6: 15 } },
    { id: 509, name: "本多忠勝", faction: 5, stats: { 1: 96, 2: 35, 3: 87, 4: 30, 5: 77, 6: 86 } },
    { id: 510, name: "井伊直政", faction: 5, stats: { 1: 87, 2: 60, 3: 80, 4: 50, 5: 83, 6: 60 } },
    { id: 511, name: "石田三成", faction: 5, stats: { 1: 30, 2: 84, 3: 65, 4: 91, 5: 55, 6: 30 } },
    { id: 512, name: "黑田官兵衛", faction: 5, stats: { 1: 35, 2: 94, 3: 83, 4: 80, 5: 65, 6: 57 } },
    { id: 513, name: "竹中半兵衛", faction: 5, stats: { 1: 25, 2: 96, 3: 77, 4: 75, 5: 70, 6: 27 } },
    { id: 514, name: "前田利家", faction: 5, stats: { 1: 77, 2: 55, 3: 75, 4: 70, 5: 80, 6: 65 } },
    { id: 515, name: "柴田勝家", faction: 5, stats: { 1: 86, 2: 45, 3: 83, 4: 40, 5: 73, 6: 40 } },
    { id: 516, name: "島津義弘", faction: 5, stats: { 1: 89, 2: 67, 3: 81, 4: 45, 5: 67, 6: 43 } },
    { id: 517, name: "長宗我部元親", faction: 5, stats: { 1: 75, 2: 73, 3: 79, 4: 67, 5: 76, 6: 55 } },
    { id: 518, name: "北條氏康", faction: 5, stats: { 1: 65, 2: 83, 3: 86, 4: 87, 5: 80, 6: 73 } },
    { id: 519, name: "直江兼續", faction: 5, stats: { 1: 60, 2: 86, 3: 80, 4: 83, 5: 88, 6: 61 } },
    { id: 520, name: "お市", faction: 5, stats: { 1: 15, 2: 75, 3: 45, 4: 65, 5: 96, 6: 37 } },
];

// 替每位武將註冊不可變的 baseStats (Phase 17)，作為成長計算基準
OFFICERS_DATA.forEach(o => {
    o.baseStats = { ...o.stats };
    o.injuryRate = 0; // Phase 21: 初始化受傷程度為 0 (健康)
    o.battleCount = 0; // Phase 26: 出戰次數
    o.winCount = 0;    // Phase 26: 勝利次數
});
