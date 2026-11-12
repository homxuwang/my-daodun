import { sys } from 'cc';
const KEY = 'night_survivors_save_v1';
function defaults() {
    return {
        gold: 0, power: {}, chars: ['hunter', 'mage'], selected: 'hunter',
        music: true, sfx: true, vibrate: true, lite: false, liteChecked: false,
        bestTime: 0, bestKills: 0, bestLevel: 0, totalKills: 0, runs: 0, wins: 0,
        achievements: [], mode: 'normal', endlessBest: 0, lossStreak: 0, bonusDay: '', privacyOk: false, privacyVer: 0, firstDay: '', runsSinceInter: 0, stage: 'grass', stages: ['grass'], stageBest: {}, dailyDone: '', dailyBestDate: '', dailyBest: 0, tutDone: false, codex: [], codexSeen: 0, questDate: '', questProg: {}, questDone: [], signCount: 0, signDate: '', signShown: '', updatedAt: 0, addTipShown: false, unlockSeen: 0,
    };
}
export class Save {
    static load() {
        try {
            const raw = sys.localStorage.getItem(KEY);
            if (raw)
                this.data = Object.assign(defaults(), JSON.parse(raw));
        }
        catch (e) {
            console.warn('[Save] load failed', e);
            this.data = defaults();
        }
    }
    static save() {
        this.data.updatedAt = Date.now();
        try {
            sys.localStorage.setItem(KEY, JSON.stringify(this.data));
        }
        catch (e) {
            console.warn('[Save] save failed', e);
        }
        this.onSaved();
    }
    // 用另一份存档（云端）整体替换本地，缺失字段补默认值；保留原 updatedAt 不触发回传
    static replace(d) {
        this.data = Object.assign(defaults(), d);
        try {
            sys.localStorage.setItem(KEY, JSON.stringify(this.data));
        }
        catch (e) { /* 忽略 */ }
    }
    static rank(id) {
        return this.data.power[id] || 0;
    }
    static totalBought() {
        let n = 0;
        for (const k in this.data.power)
            n += this.data.power[k];
        return n;
    }
}
Save.data = defaults();
// 每次存档后回调（云存档用来安排上传）
Save.onSaved = () => { };
