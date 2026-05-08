# 🎮 三國大富翁 - 雙人對戰版

一個用 Python + HTML5 做的三國大富翁遊戲，支援雙人即時對戰！

## 🕹️ 遊玩方式

1. 前往 https://rich3-duel.onrender.com
2. 玩家1選擇「劉備」，玩家2選擇「曹操」
3. 按「開始遊戲」即可對戰！

## 🏗️ 部署

### Render.com（推薦，免費）

1. Fork 此專案到 GitHub
2. 前往 [Render.com](https://render.com) 用 GitHub 登入
3. New → Web Service → 選擇此 repo
4. Region 選 Singapore，Plan 選 Free
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `python rich3_deploy.py`
7. 點 Create，等待部署完成

### 本地執行

```bash
pip install websockets
python rich3_deploy.py
# 瀏覽器打 http://localhost:8000
```

## 🎯 遊戲規則

- 玩家1控制劉備（蜀），玩家2控制曹操（魏）
- 其他3個勢力（孫權、董卓、信長）由AI控制
- 擲骰子移動，佔領城市、收集武將、攻城掠地
- 破產即失敗，最後存活的玩家獲勝！

## 📦 使用素材

- 武將資料：來自《三國志》系列
- 圖示：Unicode emoji

MIT License
