#!/usr/bin/env python3
"""
RICH3 雙人對戰 - Railway.app 專用
使用 starlette + websockets
"""

import asyncio, json, os, random, mimetypes
from starlette.applications import Starlette
from starlette.routing import Route, WebSocketRoute
from starlette.responses import FileResponse, JSONResponse
from starlette.websockets import WebSocket

PORT = int(os.environ.get('PORT', 8000))
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"[START] PORT={PORT}, DIR={STATIC_DIR}")

# ==================== 遊戲狀態 ====================

def make_game_state():
    state = {"currentRound": 1, "currentPlayer": 1,
             "gameOver": False, "activePlayers": [1,2,3,4,5],
             "changanOfficers": [], "logs": ["🎮 遊戲就緒！"],
             "alliance": [], "players": {}}
    names = ["劉備", "曹操", "孫權", "董卓", "信長"]
    for i in range(1, 6):
        state["players"][str(i)] = {
            "id": i, "name": names[i-1], "money": 15000,
            "position": random.randint(0, 19),
            "colorClass": f"p{i}", "nameClass": f"p{i}-text",
            "isBot": i not in [1, 2], "isBankrupt": False,
            "officers": [], "items": [],
            "actTwice": False, "stayInPlace": False,
            "itemCooldowns": {},
            "history": {"sieges": [], "item_hits": {}, "land_attacks": {}}
        }
    return state

class GameRoom:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.state = make_game_state()
        self.map = {n: {"id": n, "owner": None, "defenders": [],
                        "development": 0} for n in range(20)}
        self.connections = {}
    
    async def add_log(self, msg):
        self.state["logs"].insert(0, msg)
        self.state["logs"] = self.state["logs"][:50]
    
    async def snapshot(self):
        s = json.loads(json.dumps(self.state))
        s["map_data"] = [dict(self.map[i]) for i in range(20)]
        return s
    
    async def broadcast(self, msg, exclude=None):
        data = json.dumps(msg)
        for ws in list(self.connections.keys()):
            if ws != exclude:
                try: await ws.send_str(data)
                except: pass

room = GameRoom()

# ==================== 路由 ====================

async def homepage(request):
    path = request.path_params.get('path', '')
    if path in ("", "index.html"): path = "index.html"
    if ".." in path: return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    fp = os.path.join(STATIC_DIR, path.lstrip("/"))
    if not os.path.isfile(fp): return JSONResponse({"error": "Not Found"}, status_code=404)
    
    ext = os.path.splitext(fp)[1]
    mt = mimetypes.types_map.get(ext, 'application/octet-stream')
    if ext == '.js': mt = 'application/javascript'
    elif ext == '.css': mt = 'text/css'
    
    return FileResponse(fp, media_type=mt,
                       headers={"Access-Control-Allow-Origin": "*"})

async def ws_connect(ws: WebSocket):
    await ws.accept()
    room.connections[ws] = {"player_id": 0, "name": ""}
    
    try:
        while True:
            data = await ws.receive_text()
            try: msg = json.loads(data)
            except: continue
            
            t = msg.get("type", "")
            info = room.connections.get(ws, {})
            pid = info.get("player_id", 0)
            
            if t == "REGISTER":
                used = [c.get("player_id") for c in room.connections.values()]
                pid = 1 if 1 not in used else (2 if 2 not in used else 0)
                room.connections[ws] = {"player_id": pid, "name": msg.get("name", f"P{pid}")}
                await ws.send_str(json.dumps({"type": "REGISTERED", "player_id": pid, "state": await room.snapshot()}))
                await room.broadcast({"type": "PLAYER_JOINED", "player_id": pid, "name": msg.get("name", ""), "count": len([c for c in room.connections.values() if c.get("player_id") > 0])}, exclude=ws)
            
            elif t == "CHAT":
                await room.broadcast({"type": "CHAT", "player_id": pid, "name": info.get("name", "?"), "text": str(msg.get("text",""))[:200]})
            
            elif t == "START_GAME":
                if len([c for c in room.connections.values() if c.get("player_id") in [1,2]]) >= 1:
                    room.state = make_game_state()
                    room.map = {n: {"id": n, "owner": None, "defenders": [], "development": 0} for n in range(20)}
                    room.game_phase = "PLAYING"
                    await room.add_log("🎮 遊戲開始！")
                    await room.broadcast({"type": "GAME_STARTED", "state": await room.snapshot()})
            
            elif t == "ACTION" and pid:
                async with room.lock:
                    action = msg.get("action", {})
                    at = action.get("type", "")
                    
                    if at == "ROLL_DICE":
                        p = room.state["players"][str(pid)]
                        rv = 0 if p.get("stayInPlace") else random.randint(1, 6)
                        p["stayInPlace"] = False
                        p["position"] = (p["position"] + rv) % 20
                        await room.add_log(f"🎲 {p['name']} 擲出 {rv if rv > 0 else '💤原地'}")
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
                        if land and not land["owner"] and p["money"] >= (land.get("price", 1000)):
                            p["money"] -= land.get("price", 1000)
                            land["owner"] = pid
                            land["defenders"] = list(action.get("defenders", []))
                            await room.add_log(f"🏠 {p['name']} 佔領了城市！")
                            await room.broadcast({"type": "STATE_UPDATE", "state": await room.snapshot()})
                    
                    elif at == "PAY_TOLL":
                        p = room.state["players"][str(pid)]
                        land = room.map.get(p["position"])
                        if land and land["owner"] and land["owner"] != pid:
                            o = room.state["players"][str(land["owner"])]
                            toll = max(100, int(land.get("price", 1000) * 0.3))
                            if p["money"] >= toll:
                                p["money"] -= toll; o["money"] += toll
                                await room.add_log(f"💰 {p['name']} 付 ${toll} 過路費！")
                            else:
                                p["isBankrupt"] = True
                                await room.add_log(f"💀 {p['name']} 破產！")
                            await room.broadcast({"type": "STATE_UPDATE", "state": await room.snapshot()})
    except:
        pass
    finally:
        room.connections.pop(ws, None)

# ==================== 啟動 ====================

app = Starlette(routes=[
    WebSocketRoute('/ws', ws_connect),
    Route('/{path:path}', homepage),
])

print(f"🎮 啟動中 http://0.0.0.0:{PORT}")
import uvicorn
uvicorn.run(app, host="0.0.0.0", port=PORT)