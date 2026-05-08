// Phase 65: 道具系統設定 (Items Configuration)
// 每個道具售價均為 1000 元

const ITEMS_DATA = {
    1: { id: 1, name: "瞞天過海", price: 1000, desc: "使用後這個回合可以走兩次", type: "active" },
    2: { id: 2, name: "以逸待勞", price: 500, desc: "原地停留一次 (直接觸發事件)", type: "active" },
    3: { id: 3, name: "暗度陳倉", price: 1000, desc: "到達任意位置", type: "active_target_land" },
    4: { id: 4, name: "暗箭傷人", price: 1000, desc: "選定一名主公，隨機使其三名武將（優先針對「未受傷」者）受到 99% 重傷", type: "active_target_player" },
    5: { id: 5, name: "臨陣磨槍", price: 1000, desc: "攻城戰時可選用，我方全能力增加 10%", type: "active_buff" },
    6: { id: 6, name: "無懈可擊", price: 500, desc: "被動防禦，抵銷敵方對自己使用的負面計謀", type: "passive" },
    7: { id: 7, name: "迴光返照", price: 300, desc: "治療己方任意武將 (傷勢歸零)", type: "active_target_officer" },
    8: { id: 8, name: "殺人放火", price: 1000, desc: "選定一座敵方城池，降低其一半建設等級，且守將有 50% 機率受傷 (20%-80%)", type: "active_target_land" },
    9: { id: 9, name: "天下為公", price: 2000, desc: "使用後，場上所有主公的金錢重新平均分配", type: "active" },
    10: { id: 10, name: "起死回生", price: 1000, desc: "復活一名己方陣亡的武將，並清除所有傷勢", type: "active_target_officer" },
    11: { id: 11, name: "離間之計", price: 2000, desc: "使用後立即解除現有同盟，且全場 15 回合內無法組成任何同盟", type: "active" }
};
