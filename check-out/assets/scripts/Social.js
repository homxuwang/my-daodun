import { Analytics } from './Analytics.ts';
import { Save } from './Save.ts';
import { SOCIAL_CONFIG } from './SocialConfig.ts';
// 微信专属能力：版本更新、带参分享、游戏圈、好友排行（开放数据域）、云存档
// 非微信环境（浏览器预览、抖音、测试）下全部静默跳过
function wxApi() {
    return globalThis.wx || null;
}
// 云存档中不覆盖的本机设置
const LOCAL_ONLY = ['music', 'sfx', 'vibrate', 'lite', 'liteChecked', 'privacyOk', 'privacyVer'];
export class Social {
    static get isWx() { return !!wxApi(); }
    // 本地日期 YYYYMMDD（每日挑战按本地日期生成，分享与排行榜用它对齐）
    static dateKey(d = new Date()) {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }
    // 新版本在后台下载完成后，等玩家回到主菜单再提示重启（不打断战斗）
    static initUpdate() {
        const w = wxApi();
        if (!w || !w.getUpdateManager)
            return;
        try {
            const um = w.getUpdateManager();
            um.onUpdateReady(() => { this.updater = um; Analytics.track('update', { action: 'ready' }); });
            if (um.onUpdateFailed)
                um.onUpdateFailed(() => Analytics.track('update', { action: 'failed' }));
        }
        catch (e) { /* 忽略 */ }
    }
    // 回到主菜单时调用；返回是否弹出了提示
    static promptUpdate(beforeRestart) {
        const w = wxApi();
        if (!this.updater || this.updatePrompted || !w || !w.showModal)
            return false;
        this.updatePrompted = true;
        const um = this.updater;
        w.showModal({
            title: '发现新版本',
            content: '新版本已经准备好，重启即可体验（游戏进度已保存）',
            confirmText: '立即重启',
            cancelText: '稍后',
            success: (r) => {
                Analytics.track('update', { action: r && r.confirm ? 'apply' : 'later' });
                if (r && r.confirm) {
                    beforeRestart();
                    um.applyUpdate();
                }
            },
        });
        return true;
    }
    static shareQuery(c) {
        return `ch=1&t=${Math.floor(c.time)}&k=${Math.floor(c.kills)}&w=${c.won ? 1 : 0}&d=${c.daily}`;
    }
    static parseQuery(q) {
        if (!q || String(q.ch) !== '1')
            return null;
        const num = (v, max) => { const n = parseInt(v, 10); return isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
        const daily = /^\d{8}$/.test(String(q.d || '')) ? String(q.d) : '';
        return { time: num(q.t, 99 * 60), kills: num(q.k, 999999), won: num(q.w, 1), daily };
    }
    // 冷启动读启动参数，热启动（点开好友卡片回到游戏）读 onShow 参数
    static initLaunch() {
        const w = wxApi();
        if (!w)
            return;
        try {
            const o = w.getLaunchOptionsSync ? w.getLaunchOptionsSync() : null;
            this.pending = this.parseQuery(o && o.query);
            if (this.pending)
                Analytics.track('challenge_open', { daily: this.pending.daily ? 1 : 0, warm: 0 });
            if (w.onShow)
                w.onShow((res) => {
                    const c = this.parseQuery(res && res.query);
                    if (!c)
                        return;
                    this.pending = c;
                    Analytics.track('challenge_open', { daily: c.daily ? 1 : 0, warm: 1 });
                    this.onChallenge();
                });
        }
        catch (e) { /* 忽略 */ }
    }
    // 卡片里的每日挑战是否就是今天的（每日挑战按日期生成，隔天的挑战已不存在）
    static challengeIsToday(c) {
        return !!c.daily && c.daily === this.dateKey();
    }
    // rect：屏幕像素坐标（左上角原点）
    static showClub(left, top, size) {
        const w = wxApi();
        if (!SOCIAL_CONFIG.gameClub || !w || !w.createGameClubButton)
            return;
        try {
            if (!this.club) {
                this.club = w.createGameClubButton({ type: 'image', icon: 'white', style: { left, top, width: size, height: size } });
                if (this.club.onTap)
                    this.club.onTap(() => Analytics.track('club_tap', { runs: Save.data.runs }));
            }
            else {
                this.club.style.left = left;
                this.club.style.top = top;
            }
            this.club.show();
        }
        catch (e) {
            this.club = null;
        }
    }
    static hideClub() {
        try {
            if (this.club)
                this.club.hide();
        }
        catch (e) { /* 忽略 */ }
    }
    static get clubSupported() {
        const w = wxApi();
        return SOCIAL_CONFIG.gameClub && !!w && !!w.createGameClubButton;
    }
    // ------------------------------------------------------------------ 好友排行（开放数据域）
    static get rankSupported() {
        const w = wxApi();
        return SOCIAL_CONFIG.friendRank && !!w && !!w.setUserCloudStorage && !!w.getOpenDataContext;
    }
    // 上报到好友可见的云端：最长存活（best）与今日每日挑战（daily，带日期，开放数据域只显示当天）
    static reportScores() {
        const w = wxApi();
        if (!SOCIAL_CONFIG.friendRank || !w || !w.setUserCloudStorage)
            return;
        const d = Save.data;
        const now = Math.floor(Date.now() / 1000);
        const kv = [{ key: 'best', value: JSON.stringify({ wxgame: { score: d.bestTime, update_time: now }, kills: d.bestKills, wins: d.wins }) }];
        if (d.dailyBestDate === new Date().toDateString()) {
            kv.push({ key: 'daily', value: JSON.stringify({ wxgame: { score: d.dailyBest, update_time: now }, date: this.dateKey() }) });
        }
        try {
            w.setUserCloudStorage({ KVDataList: kv, fail: () => { } });
        }
        catch (e) { /* 忽略 */ }
    }
    // 通知开放数据域绘制排行榜。kind：best 最长存活 / daily 今日挑战；scale：屏幕像素 → 画布像素
    static showRank(kind, scale) {
        const w = wxApi();
        if (!this.rankSupported)
            return;
        try {
            w.getOpenDataContext().postMessage({ type: 'rank', kind, date: this.dateKey(), scale });
        }
        catch (e) { /* 忽略 */ }
    }
    static get cloudEnabled() { return !!SOCIAL_CONFIG.cloudEnv && !!wxApi() && !!wxApi().cloud; }
    // 两份存档取哪份：局数多的优先（局数只增不减），局数相同取更新时间晚的
    static preferRemote(remote, local) {
        const rr = remote.runs || 0, lr = local.runs || 0;
        if (rr !== lr)
            return rr > lr;
        return (remote.updatedAt || 0) > (local.updatedAt || 0);
    }
    // 同意隐私政策后调用。拉取云端存档，云端更新则覆盖本地并回调；拉取成功前不上传，避免新设备的空存档覆盖云端
    static initCloud(onPulled) {
        if (!this.cloudEnabled || this.col)
            return;
        const w = wxApi();
        try {
            w.cloud.init({ env: SOCIAL_CONFIG.cloudEnv, traceUser: false });
            this.col = w.cloud.database().collection(SOCIAL_CONFIG.cloudCollection);
        }
        catch (e) {
            this.col = null;
            return;
        }
        Save.onSaved = () => this.schedulePush();
        this.col.limit(1).get().then((res) => {
            const doc = res && res.data && res.data[0];
            let pulled = false;
            if (doc) {
                this.docId = doc._id;
                let remote = null;
                try {
                    remote = JSON.parse(doc.save);
                }
                catch (e) {
                    remote = null;
                }
                if (remote && this.preferRemote(remote, Save.data)) {
                    const keep = {};
                    for (const k of LOCAL_ONLY)
                        keep[k] = Save.data[k];
                    Save.replace(Object.assign(remote, keep));
                    pulled = true;
                }
            }
            this.cloudReady = true;
            Analytics.track('cloud_sync', { action: pulled ? 'pull' : doc ? 'keep' : 'new', runs: Save.data.runs });
            if (pulled)
                onPulled();
            else
                this.push();
        }).catch(() => {
            // 网络失败：本次不同步（下次启动再试），绝不在未确认云端内容时上传
            this.col = null;
            Save.onSaved = () => { };
            Analytics.track('cloud_sync', { action: 'error', runs: Save.data.runs });
        });
    }
    // 存档变更后 3 秒内合并上传一次
    static schedulePush() {
        if (!this.cloudReady)
            return;
        if (this.timer)
            return;
        this.timer = setTimeout(() => { this.timer = null; this.push(); }, 3000);
    }
    // 立即上传（切后台、重启更新前调用）
    static flushCloud() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.cloudReady)
            this.push();
    }
    static push() {
        if (!this.col || !this.cloudReady)
            return;
        if (this.pushing) {
            this.dirty = true;
            return;
        }
        this.pushing = true;
        const data = { save: JSON.stringify(Save.data), runs: Save.data.runs, updatedAt: Save.data.updatedAt || 0 };
        const done = () => {
            this.pushing = false;
            if (this.dirty) {
                this.dirty = false;
                this.push();
            }
        };
        const p = this.docId ? this.col.doc(this.docId).update({ data }) : this.col.add({ data }).then((r) => { this.docId = r._id; });
        p.then(done, done);
    }
}
// ------------------------------------------------------------------ 版本更新
Social.updater = null;
Social.updatePrompted = false;
// ------------------------------------------------------------------ 带参分享
Social.pending = null;
Social.onChallenge = () => { };
// ------------------------------------------------------------------ 游戏圈
Social.club = null;
// ------------------------------------------------------------------ 云存档（微信云开发）
Social.col = null;
Social.docId = '';
Social.cloudReady = false;
Social.pushing = false;
Social.dirty = false;
Social.timer = null;
