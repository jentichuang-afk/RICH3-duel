#!/usr/bin/env python3
"""
RICH3 雙人對戰 - Render.com 專用
使用 aiohttp 單一 port 同時處理 HTTP + WebSocket
"""

import asyncio
import json
import os
import random
import mimetypes
from aiohttp import web

PORT = int(os.environ.get('PORT', 8000))
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"[START] PORT={PORT}, DIR={STATIC_DIR}")

# ==================== 遊戲狀態 ====================

def make_game_state():
    state = {
        "currentRound": 1, "currentPlayer": 1,
        "isWaitingForAction": False, "gameOver": False,
        "activePlayers": [1, 2, 3, 4, 5],
        "changanOfficers": [], "logs": ["🎮 遊戲就緒！"],
        "alliance": [], "alienationTurns": 0,
        "players": {}
    }
    names = ["劉備", "曹操", "孫權", "董卓", "信長"]
    for i in range(1, 6):
        state["players"][str(i)] = {
            "id": i, "name": names[i-1],
            "money": 15000, "position": random.randint(0, 19),
            "colorClass": f"p{i}", "nameClass": f"p{i}-text",
            "isBot": i not in [1, 2], "isBankrupt": False,
            "officers": [], "items": [],
            "actTwice": False, "stayInPlace": False,
            "ownTurnCount": 0, "itemCooldowns": {},
            "history": {"sieges": [], "item_hits": {}, "land_attacks": {}}
        }
    return state

MAP = [
    {"id": n, "name": ["水鏡莊","長安","洛陽","許昌","鄴城","下邳","宛城","襄陽","江陵","長沙",
                       "奇珍閣","廬江","建業","永安","成都","漢中","京都","大阪","名古屋","江戶"][n],
     "type": ["START","LAND","LAND","LAND","LAND","LAND","LAND","LAND","LAND","LAND",
              "ITEM_SHOP","LAND","LAND","LAND","LAND","LAND","LAND","LAND","LAND","LAND"][n],
     "price": [0,2500,2000,2200,2000,1200,1000,1800,1800,1500,
              0,1200,2200,1000,2200,1600,2500,2000,1500,2200][n],
     "owner": None, "defenders": [], "development": 0}
    for n in range(20)
]

class GameRoom:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.state = make_game_state()
        self.map = {m["id"]: m.copy() for m in MAP}
        self.connections = {}  # ws -> info
    
    async def add_log(self, msg):
        self.state["logs"].insert(0, msg)
        if len(self.state["logs"]) > 50:
            self.state["logs"] = self.state["logs"][:50]
    
    async def snapshot(self):
        s = json.loads(json.dumps(self.state))
        s["map_data"] = [dict(self.map[i]) for i in range(20)]
        s["game_phase"] = self.game_phase
        return s
    
    async def broadcast(self, msg, exclude=None):
        data = json.dumps(msg)
        for ws in list(self.connections.keys()):
            if ws != exclude:
                try:
                    await ws.send_str(data)
                except:
                    pass

room = GameRoom()

# ==================== 處理遊戲訊息 ====================

async def handle_msg(ws, msg_str):
    try:
        msg = json.loads(msg_str)
    except:
        return
    
    t = msg.get("type", "")
    info = room.connections.get(ws, {})
    pid = info.get("player_id", 0)
    
    if t == "REGISTER":
        used = [c.get("player_id") for c in room.connections.values()]
        pid = 1 if 1 not in used else (2 if 2 not in used else 0)
        room.connections[ws] = {"player_id": pid, "name": msg.get("name", f"P{pid}")}
        await ws.send_str(json.dumps({"type": "REGISTERED", "player_id": pid, "state": await room.snapshot()}))
        await room.broadcast({
            "type": "PLAYER_JOINED",
            "player_id": pid, "name": msg.get("name", f"P{pid}"),
            "count": len([c for c in room.connections.values() if c.get("player_id") > 0])
        }, exclude=ws)
        return
    
    if t == "CHAT":
        await room.broadcast({
            "type": "CHAT",
            "player_id": pid, "name": info.get("name", "???"),
            "text": str(msg.get("text", ""))[:200]
        })
        return
    
    if t == "START_GAME":
        if len([c for c in room.connections.values() if c.get("player_id") in [1, 2]]) >= 1:
            room.state = make_game_state()
            room.map = {m["id"]: m.copy() for m in MAP}
            room.game_phase = "PLAYING"
            await room.add_log("🎮 遊戲開始！")
            await room.broadcast({"type": "GAME_STARTED", "state": await room.snapshot()})
        return
    
    if t == "ACTION" and pid:
        async with room.lock:
            action = msg.get("action", {})
            at = action.get("type", "")
            
            if at == "ROLL_DICE":
                p = room.state["players"][str(pid)]
                rv = 0 if p.get("stayInPlace") else random.randint(1, 6)
                p["stayInPlace"] = False
                new = (p["position"] + rv) % 20
                p["position"] = new
                await room.add_log(f"🎲 {p['name']} 擲出 {rv if rv > 0 else '💤原地'} → {room.map[new]['name']}")
                await room.broadcast({"type": "STATE_UPDATE", "state": await room.snapshot()})
            
            elif at == "END_TURN":
                p = room.state["players"][str(pid)]
                if p.get("actTwice"):
                    p["actTwice"] = False
                    await room.add_log(f"🔄 {p['name']} 再動一次！")
                else:
                    active = room.state["activePlayers"]
                    idx = active.index(pid)
                    ni = (idx + 1) % len(active)
                    while room.state["players"][str(active[ni])]["isBankrupt"]:
                        ni = (ni + 1) % len(active)
                        if ni == idx: break
                    npid = active[ni]
                    room.state["currentPlayer"] = npid
                    room.state["currentRound"] += 1
                    await room.add_log(f"➡️ {room.state['players'][str(npid)]['name']} (第{room.state['currentRound']}回合)")
                await room.broadcast({"type": "STATE_UPDATE", "state": await room.snapshot()})
            
            elif at == "BUY_LAND":
                p = room.state["players"][str(pid)]
                land = room.map.get(action.get("land_id", -1))
                if land and not land["owner"] and p["money"] >= land["price"]:
                    p["money"] -= land["price"]
                    land["owner"] = pid
                    land["defenders"] = list(action.get("defenders", []))
                    await room.add_log(f"🏠 {p['name']} 佔領了 {land['name']}！")
                    await room.broadcast({"type": "STATE_UPDATE", "state": await room.snapshot()})
            
            elif at == "PAY_TOLL":
                p = room.state["players"][str(pid)]
                land = room.map.get(p["position"])
                if land and land["owner"] and land["owner"] != pid:
                    o = room.state["players"][str(land["owner"])]
                    toll = max(100, int(land["price"] * 0.3))
                    if p["money"] >= toll:
                        p["money"] -= toll; o["money"] += toll
                        await room.add_log(f"💰 {p['name']} 付 ${toll} 過路費給 {o['name']}！")
                    else:
                        p["isBankrupt"] = True
                        await room.add_log(f"💀 {p['name']} 破產！")
                    await room.broadcast({"type": "STATE_UPDATE", "state": await room.snapshot()})

# ==================== aiohttp 路由 ====================

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    room.connections[ws] = {"player_id": 0, "name": ""}
    
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                await handle_msg(ws, msg.data)
            elif msg.type == web.WSMsgType.ERROR:
                print(f"WS 錯誤: {ws.exception()}")
    finally:
        room.connections.pop(ws, None)
    
    return ws

async def http_handler(request):
    path = request.path.split('?')[0]
    
    # WebSocket upgrade
    if path == "/ws":
        return await websocket_handler(request)
    
    # 靜態檔案
    if path in ("/", "/index.html"):
        path = "/index.html"
    
    safe_path = path.lstrip("/")
    if ".." in safe_path:
        return web.Response(status=403, text="Forbidden")
    
    fp = os.path.join(STATIC_DIR, safe_path)
    if not os.path.isfile(fp):
        return web.Response(status=404, text="Not Found")
    
    ext = os.path.splitext(fp)[1]
    mime = mimetypes.types_map.get(ext, 'application/octet-stream')
    if ext == '.js': mime = 'application/javascript'
    elif ext == '.css': mime = 'text/css'
    
    with open(fp, 'rb') as f:
        body = f.read()
    
    return web.Response(body=body, content_type=mime,
                        headers={"Access-Control-Allow-Origin": "*"})

# ==================== 啟動 ====================

app = web.Application()
app.router.add_get('/ws', websocket_handler)
app.router.add_get('/{tail:.*}', http_handler)

print(f"""
{'='*50}
🎮 RICH3 雙人對戰伺服器
🌐 http://localhost:{PORT}
🔌 ws://localhost:{PORT}/ws
{'='*50}
""")

web.run_app(app, host="0.0.0.0", port=PORT, 
            print=None, access_log=None)