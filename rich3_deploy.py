#!/usr/bin/env python3
"""
RICH3 雙人對戰 - Render.com 部署版
同時處理 HTTP (靜態檔案) + WebSocket (遊戲)

使用方式:
  local: python rich3_deploy.py
  Render: 自動讀取 PORT 環境變數
"""

import asyncio
import json
import os
import random
import socket
import struct
import threading
import hashlib
import base64
import mimetypes

PORT = int(os.environ.get('PORT', 8000))
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"[START] RICH3 雙人對戰伺服器 | PORT={PORT} | STATIC_DIR={STATIC_DIR}")

# ==================== 遊戲狀態工廠 ====================

def make_game_state():
    state = {
        "currentRound": 1,
        "currentPlayer": 1,
        "isWaitingForAction": False,
        "gameOver": False,
        "activePlayers": [1, 2, 3, 4, 5],
        "changanOfficers": [],
        "logs": ["🎮 遊戲就緒！"],
        "alliance": [],
        "alienationTurns": 0,
        "players": {}
    }
    names = ["劉備", "曹操", "孫權", "董卓", "信長"]
    for i in range(1, 6):
        state["players"][str(i)] = {
            "id": i, "name": names[i-1],
            "money": 15000,
            "position": random.randint(0, 19),
            "colorClass": f"p{i}", "nameClass": f"p{i}-text",
            "isBot": i not in [1, 2],
            "isBankrupt": False, "officers": [], "items": [],
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


# ==================== 遊戲狀態管理 ====================

class GameRoom:
    """一個房間容納 2 個真人玩家 + 3 個 AI"""
    
    def __init__(self):
        self.lock = threading.Lock()
        self.state = make_game_state()
        self.map = {m["id"]: m.copy() for m in MAP}
        self.connections = {}  # conn -> {"player_id": int, "name": str}
        self.game_phase = "LOBBY"
    
    def add_log(self, msg):
        self.state["logs"].insert(0, f"[{datetime.now().strftime('%H:%M')}] {msg}")
        if len(self.state["logs"]) > 50:
            self.state["logs"] = self.state["logs"][:50]
    
    def snapshot(self):
        with self.lock:
            s = json.loads(json.dumps(self.state))
            s["map_data"] = [dict(self.map[i]) for i in range(20)]
            s["game_phase"] = self.game_phase
            return s
    
    def broadcast(self, msg, exclude=None):
        data = (json.dumps(msg) + "\n").encode()
        dead = []
        for conn, info in self.connections.items():
            try:
                conn.sendall(data)
            except:
                dead.append(conn)
        for conn in dead:
            self._remove_conn(conn)
    
    def _remove_conn(self, conn):
        if conn in self.connections:
            info = self.connections.pop(conn)
            self.broadcast({"type": "PLAYER_LEFT", "name": info.get("name", "???")})
    
    def reset(self):
        with self.lock:
            self.state = make_game_state()
            self.map = {m["id"]: m.copy() for m in MAP}
            self.game_phase = "PLAYING"
            self.add_log("🎮 遊戲開始！")


# ==================== WebSocket 工具 ====================

def ws_handshake(sock, data):
    """執行 WebSocket 握手"""
    try:
        key = None
        for line in data.decode().split('\r\n'):
            if line.startswith('Sec-WebSocket-Key:'):
                key = line.split(':', 1)[1].strip()
                break
        if not key:
            sock.close()
            return None
        
        accept = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()
        ).decode()
        
        response = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n"
            "\r\n"
        )
        sock.sendall(response.encode())
        return True
    except:
        sock.close()
        return None


def ws_read_frame(sock, data, buf):
    """解析 WebSocket 框架"""
    if len(data) < 2:
        return None, buf
    
    fin = (data[0] & 0x80) != 0
    opcode = data[0] & 0x0F
    masked = (data[1] & 0x80) != 0
    length = data[1] & 0x7F
    
    if length == 126:
        if len(data) < 4:
            return None, buf
        length = struct.unpack('>H', data[2:4])[0]
        payload_start = 4
    elif length == 127:
        if len(data) < 10:
            return None, buf
        length = struct.unpack('>Q', data[2:10])[0]
        payload_start = 10
    else:
        payload_start = 2
    
    if masked:
        mask = data[payload_start:payload_start+4]
        payload_start += 4
    
    if len(data) < payload_start + length:
        return None, buf
    
    payload = data[payload_start:payload_start+length]
    if masked:
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    
    remaining = data[payload_start+length:]
    buf = remaining + buf  # 預扣下次緩衝
    
    if opcode == 1:  # Text
        try:
            return payload.decode('utf-8'), buf
        except:
            return None, buf
    elif opcode == 8:  # Close
        return None, buf
    return None, buf


def ws_send_text(sock, text):
    """發送 WebSocket 文字幀"""
    payload = text.encode('utf-8')
    frame = bytearray()
    frame.append(0x81)  # FIN + Text opcode
    if len(payload) < 126:
        frame.append(0x80 | len(payload))
    elif len(payload) < 65536:
        frame.append(0x80 | 126)
        frame.extend(struct.pack('>H', len(payload)))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack('>Q', len(payload)))
    frame.extend(payload)
    try:
        sock.sendall(bytes(frame))
    except:
        pass


# ==================== 遊戲邏輯 ====================

def handle_ws_message(room, conn, msg_str):
    """處理 WebSocket 訊息"""
    try:
        msg = json.loads(msg_str)
    except:
        return
    
    t = msg.get("type", "")
    
    if t == "REGISTER":
        # 分配玩家 ID
        used = [info.get("player_id") for info in room.connections.values()]
        pid = 1 if 1 not in used else (2 if 2 not in used else 0)
        name = msg.get("name", f"P{pid}")
        room.connections[conn] = {"player_id": pid, "name": name}
        
        ws_send_text(conn, json.dumps({
            "type": "REGISTERED",
            "player_id": pid,
            "state": room.snapshot()
        }))
        room.broadcast({
            "type": "PLAYER_JOINED",
            "player_id": pid,
            "name": name,
            "count": len([c for c in room.connections.values() if c.get("player_id") > 0])
        }, exclude=conn)
        return
    
    if t == "CHAT":
        info = room.connections.get(conn, {})
        room.broadcast({
            "type": "CHAT",
            "player_id": info.get("player_id", 0),
            "name": info.get("name", "???"),
            "text": str(msg.get("text", ""))[:200]
        })
        return
    
    if t == "START_GAME":
        ready = len([c for c in room.connections.values() if c.get("player_id") in [1, 2]])
        if ready >= 1:
            room.reset()
            room.broadcast({"type": "GAME_STARTED", "state": room.snapshot()})
        return
    
    # 遊戲動作
    if t == "ACTION":
        info = room.connections.get(conn, {})
        pid = info.get("player_id", 0)
        if not pid:
            return
        
        action = msg.get("action", {})
        at = action.get("type", "")
        
        if at == "ROLL_DICE":
            p = room.state["players"][str(pid)]
            if p.get("stayInPlace"):
                p["stayInPlace"] = False
                rv = 0
            else:
                rv = random.randint(1, 6)
            old = p["position"]
            new = (old + rv) % 20
            p["position"] = new
            room.add_log(f"🎲 {p['name']} 擲出 {rv if rv > 0 else '💤原地'} → 移動到 {room.map[new]['name']}")
            room.broadcast({"type": "STATE_UPDATE", "state": room.snapshot()})
        
        elif at == "END_TURN":
            p = room.state["players"][str(pid)]
            if p.get("actTwice"):
                p["actTwice"] = False
                room.add_log(f"🔄 {p['name']} 再動一次！")
            else:
                active = room.state["activePlayers"]
                idx = active.index(pid)
                next_i = (idx + 1) % len(active)
                while room.state["players"][str(active[next_i])]["isBankrupt"]:
                    next_i = (next_i + 1) % len(active)
                    if next_i == idx:
                        break
                next_pid = active[next_i]
                room.state["currentPlayer"] = next_pid
                room.state["currentRound"] += 1
                room.add_log(f"➡️ 切換至 {room.state['players'][str(next_pid)]['name']} (第{room.state['currentRound']}回合)")
            room.broadcast({"type": "STATE_UPDATE", "state": room.snapshot()})
        
        elif at == "BUY_LAND":
            lid = action.get("land_id")
            defs = action.get("defenders", [])
            land = room.map.get(lid)
            p = room.state["players"][str(pid)]
            if land and not land["owner"] and p["money"] >= land["price"]:
                p["money"] -= land["price"]
                land["owner"] = pid
                land["defenders"] = list(defs)
                for d in defs:
                    if d in p["officers"]:
                        p["officers"].remove(d)
                room.add_log(f"🏠 {p['name']} 佔領了 {land['name']}！")
                room.broadcast({"type": "STATE_UPDATE", "state": room.snapshot()})
        
        elif at == "PAY_TOLL":
            p = room.state["players"][str(pid)]
            land = room.map.get(p["position"])
            if land and land["owner"] and land["owner"] != pid:
                owner = room.state["players"][str(land["owner"])]
                toll = max(100, int(land["price"] * 0.3))
                if p["money"] >= toll:
                    p["money"] -= toll
                    owner["money"] += toll
                    room.add_log(f"💰 {p['name']} 付過路費 ${toll} 給 {owner['name']}！")
                else:
                    p["isBankrupt"] = True
                    room.add_log(f"💀 {p['name']} 破產！")
                room.broadcast({"type": "STATE_UPDATE", "state": room.snapshot()})
        
        elif at == "USE_ITEM":
            idx = action.get("item_index", -1)
            p = room.state["players"][str(pid)]
            if 0 <= idx < len(p["items"]):
                item = p["items"].pop(idx)
                if item["id"] == 1:
                    p["actTwice"] = True
                    room.add_log(f"🌟 {p['name']} 使用「瞞天過海」再動一次！")
                elif item["id"] == 2:
                    p["stayInPlace"] = True
                    room.add_log(f"💤 {p['name']} 使用「以逸待勞」下回合原地！")
                room.broadcast({"type": "STATE_UPDATE", "state": room.snapshot()})


# ==================== 靜態檔案服務 ====================

def serve_static(path):
    """返回 (status, content_type, body)"""
    if path in ("/", "/index.html"):
        path = "/index.html"
    
    # 安全性：禁止目錄遍歷
    if ".." in path:
        return 403, "text/plain", b"Forbidden"
    
    fp = os.path.join(STATIC_DIR, path.lstrip("/"))
    
    if os.path.isfile(fp):
        ext = os.path.splitext(fp)[1]
        mime = mimetypes.types_map.get(ext, 'application/octet-stream')
        if ext == '.js': mime = 'application/javascript'
        elif ext == '.css': mime = 'text/css'
        
        with open(fp, 'rb') as f:
            body = f.read()
        return 200, mime, body
    
    return 404, "text/plain", b"Not Found"


# ==================== 主伺服器迴圈 ====================

def run():
    room = GameRoom()
    
    server_sock = socket.socket()
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_sock.bind(('0.0.0.0', PORT))
    server_sock.listen(100)
    server_sock.settimeout(0.5)
    
    print(f"✅ 伺服器啟動 http://localhost:{PORT}")
    print(f"   WebSocket ws://localhost:{PORT}/ws")
    print(f"   等待玩家連線...")
    
    while True:
        try:
            client, addr = server_sock.accept()
            client.settimeout(2.0)
            
            try:
                # 偷看 request 來判斷是 HTTP 還是 WebSocket
                peek = client.recv(4096, socket.MSG_PEEK)
                
                if b"Sec-WebSocket-Key" in peek:
                    # WebSocket
                    if ws_handshake(client, peek):
                        buf = b""
                        while True:
                            try:
                                data = client.recv(8192)
                                if not data:
                                    break
                                buf += data
                                
                                while True:
                                    msg, buf = ws_read_frame(client, data, buf)
                                    if msg is None:
                                        break
                                    data = buf
                                    buf = b""
                                    handle_ws_message(room, client, msg)
                                    
                                    # 發送回應
                                    room.broadcast({"type": "PING"})
                                    # 重新讀取緩衝
                                    data = buf
                                    
                            except socket.timeout:
                                pass
                            except Exception as e:
                                print(f"[WS] 錯誤: {e}")
                                break
                        room._remove_conn(client)
                        client.close()
                    else:
                        client.close()
                else:
                    # HTTP
                    # 完整讀取 HTTP 請求
                    full = b""
                    while b'\r\n\r\n' not in full:
                        chunk = client.recv(4096)
                        if not chunk:
                            break
                        full += chunk
                    
                    header = full.decode('utf-8', errors='replace')
                    if '\r\n\r\n' in header:
                        body_start = full.find(b'\r\n\r\n') + 4
                        body = full[body_start:]
                    else:
                        body = b''
                    
                    lines = header.split('\r\n')
                    if not lines:
                        client.close()
                        continue
                    
                    method, path, _ = lines[0].split(' ')
                    path = path.split('?')[0]  # 去掉 query string
                    
                    # 路由
                    if path == "/ws":
                        # WebSocket 升級
                        if ws_handshake(client, full):
                            buf = b""
                            while True:
                                try:
                                    data = client.recv(8192)
                                    if not data:
                                        break
                                    buf += data
                                    while True:
                                        msg, buf = ws_read_frame(client, data, buf)
                                        if msg is None:
                                            break
                                        data = buf
                                        buf = b""
                                        handle_ws_message(room, client, msg)
                                except socket.timeout:
                                    pass
                                except:
                                    break
                            room._remove_conn(client)
                        client.close()
                    else:
                        status, ctype, body_out = serve_static(path)
                        
                        resp = (
                            f"HTTP/1.1 {status} OK\r\n"
                            f"Content-Type: {ctype}\r\n"
                            f"Content-Length: {len(body_out)}\r\n"
                            f"Access-Control-Allow-Origin: *\r\n"
                            f"Cache-Control: no-cache\r\n"
                            "Connection: close\r\n"
                            "\r\n"
                        )
                        client.sendall(resp.encode() + body_out)
                        client.close()
            
            except Exception as e:
                print(f"[ERROR] {e}")
                try:
                    client.close()
                except:
                    pass
        
        except socket.timeout:
            continue
        except Exception as e:
            print(f"[MAIN] {e}")
            continue


if __name__ == "__main__":
    run()