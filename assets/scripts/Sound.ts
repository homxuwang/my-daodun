import { Node } from 'cc';
import { Save } from './Save';

// 音效合成器（WebAudio）：不加载任何音频文件，包体更小、加载更快。
// BGM 用简单琶音循环，SFX 按名字合成；命名与参考工程一致，调用方无需改动。
type OscType = OscillatorType;

interface Tone {
    f: number; f2?: number; d: number; type?: OscillatorType;
    vol?: number; delay?: number; decay?: number;
}

// 每个音效 = 一组音调（频率 Hz、时长秒、波形、音量）
const SFX: Record<string, Tone[]> = {
    sonic:   [{ f: 360, f2: 760, d: 0.16, type: 'sine', vol: 0.13 }],
    click:   [{ f: 660, d: 0.05, type: 'square', vol: 0.10 }],
    start:   [{ f: 440, d: 0.08 }, { f: 660, d: 0.08, delay: 0.08 }, { f: 880, d: 0.14, delay: 0.16 }],
    levelup: [{ f: 523, d: 0.08 }, { f: 659, d: 0.08, delay: 0.08 }, { f: 784, d: 0.08, delay: 0.16 }, { f: 1047, d: 0.18, delay: 0.24 }],
    hit:     [{ f: 220, f2: 140, d: 0.06, type: 'sawtooth', vol: 0.14 }],
    kill:    [{ f: 180, f2: 60, d: 0.12, type: 'triangle', vol: 0.2 }],
    bigkill: [{ f: 140, f2: 40, d: 0.3, type: 'sawtooth', vol: 0.25 }],
    crit:    [{ f: 900, f2: 1400, d: 0.07, type: 'square', vol: 0.14 }],
    combo:   [{ f: 700, f2: 1200, d: 0.06, type: 'square', vol: 0.1 }],
    hurt:    [{ f: 160, f2: 90, d: 0.16, type: 'sawtooth', vol: 0.22 }],
    faint:   [{ f: 300, f2: 80, d: 0.5, type: 'triangle', vol: 0.22 }],
    coin:    [{ f: 988, d: 0.05 }, { f: 1319, d: 0.1, delay: 0.05 }],
    gem:     [{ f: 1175, f2: 1568, d: 0.09, type: 'triangle', vol: 0.16 }],
    power:   [{ f: 440, d: 0.07 }, { f: 660, d: 0.07, delay: 0.07 }, { f: 880, d: 0.15, delay: 0.14 }],
    heal:    [{ f: 523, d: 0.1, type: 'triangle' }, { f: 784, d: 0.16, type: 'triangle', delay: 0.1 }],
    boom:    [{ f: 90, f2: 40, d: 0.35, type: 'sawtooth', vol: 0.28 }],
    fire:    [{ f: 500, f2: 200, d: 0.18, type: 'sawtooth', vol: 0.16 }],
    shoot:   [{ f: 700, f2: 350, d: 0.07, type: 'square', vol: 0.12 }],
    pew:     [{ f: 900, f2: 450, d: 0.06, type: 'square', vol: 0.1 }],
    knife:   [{ f: 800, f2: 1200, d: 0.05, type: 'sawtooth', vol: 0.1 }],
    whip:    [{ f: 400, f2: 900, d: 0.09, type: 'sawtooth', vol: 0.12 }],
    axe:     [{ f: 300, f2: 600, d: 0.1, type: 'sawtooth', vol: 0.13 }],
    beam:    [{ f: 1200, f2: 600, d: 0.2, type: 'sawtooth', vol: 0.14 }],
    laser:   [{ f: 1400, f2: 700, d: 0.16, type: 'sawtooth', vol: 0.13 }],
    lightning:[{ f: 1600, f2: 200, d: 0.12, type: 'sawtooth', vol: 0.18 }],
    zap:     [{ f: 1200, f2: 300, d: 0.09, type: 'square', vol: 0.14 }],
    freeze:  [{ f: 1400, f2: 900, d: 0.15, type: 'triangle', vol: 0.14 }],
    splash:  [{ f: 500, f2: 250, d: 0.15, type: 'triangle', vol: 0.14 }],
    throw:   [{ f: 600, f2: 300, d: 0.08, type: 'triangle', vol: 0.11 }],
    dash:    [{ f: 300, f2: 900, d: 0.12, type: 'sawtooth', vol: 0.13 }],
    teleport:[{ f: 1000, f2: 400, d: 0.14, type: 'sine', vol: 0.16 }],
    roar:    [{ f: 120, f2: 60, d: 0.5, type: 'sawtooth', vol: 0.24 }],
    slam:    [{ f: 70, f2: 40, d: 0.4, type: 'square', vol: 0.26 }],
    croak:   [{ f: 200, f2: 150, d: 0.1, type: 'square', vol: 0.12 }],
    boss:    [{ f: 110, d: 0.3, type: 'sawtooth', vol: 0.2 }, { f: 82, d: 0.4, type: 'sawtooth', vol: 0.2, delay: 0.3 }],
    card:    [{ f: 600, d: 0.06 }, { f: 800, d: 0.06, delay: 0.06 }],
    chest:   [{ f: 523, d: 0.08 }, { f: 784, d: 0.08, delay: 0.08 }, { f: 1047, d: 0.2, delay: 0.16 }],
    evolve:  [{ f: 440, d: 0.1, type: 'triangle' }, { f: 587, d: 0.1, type: 'triangle', delay: 0.1 }, { f: 740, d: 0.1, type: 'triangle', delay: 0.2 }, { f: 880, d: 0.3, type: 'triangle', delay: 0.3 }],
    revive:  [{ f: 392, d: 0.1, type: 'triangle' }, { f: 523, d: 0.1, type: 'triangle', delay: 0.1 }, { f: 659, d: 0.1, type: 'triangle', delay: 0.2 }, { f: 1047, d: 0.25, type: 'triangle', delay: 0.3 }],
    achieve: [{ f: 660, d: 0.09 }, { f: 880, d: 0.09, delay: 0.09 }, { f: 1109, d: 0.2, delay: 0.18 }],
};

// BGM 琶音（简单循环，营造氛围）
const BGM: Record<string, { notes: number[]; step: number; type: OscillatorType; vol: number }> = {
    bgm_menu:   { notes: [262, 330, 392, 523, 392, 330], step: 0.42, type: 'triangle', vol: 0.05 },
    bgm_battle: { notes: [196, 262, 330, 392, 330, 262], step: 0.26, type: 'square', vol: 0.04 },
    bgm_boss:   { notes: [147, 175, 196, 233, 196, 175], step: 0.24, type: 'sawtooth', vol: 0.045 },
};

export class Sound {
    private static ctx: AudioContext | null = null;
    private static master: GainNode | null = null;
    private static bgmName = '';
    private static bgmTimer: ReturnType<typeof setInterval> | null = null;
    private static bgmStep = 0;
    private static paused = false;
    private static wantedBgm = '';

    static init(_parent?: Node) {
        if (this.ctx) return;
        try {
            const g = globalThis as any;
            const platform = g.wx || g.tt;
            const AC = g.AudioContext || g.webkitAudioContext;
            this.ctx = platform?.createWebAudioContext ? platform.createWebAudioContext() : AC ? new AC() : null;
            if (!this.ctx) return;
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.9;
            this.master.connect(this.ctx.destination);
        } catch (e) { this.ctx = null; }
    }

    // 浏览器/小游戏都需要用户手势后才能出声；在首次触摸时调用
    static unlock() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    }

    static setMuted(m: boolean) {
        if (this.master) this.master.gain.value = m ? 0 : 0.9;
        if (m) this.stopTimer();
        else if (this.bgmName) this.startBgm(this.bgmName);
    }

    static get muted() {
        return Save.data && Save.data.music === false && Save.data.sfx === false;
    }

    private static tone(t: Tone, when = 0) {
        if (!this.ctx || !this.master) return;
        const c = this.ctx, t0 = c.currentTime + when;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = t.type || 'square';
        osc.frequency.setValueAtTime(t.f, t0);
        if (t.f2 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.f2), t0 + t.d);
        const vol = (t.vol ?? 0.15) * 0.9;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + (t.decay ?? t.d));
        osc.connect(g); g.connect(this.master);
        osc.start(t0); osc.stop(t0 + t.d + 0.03);
    }

    static play(name: string) {
        if (!name || Save.data.sfx === false) return;
        this.unlock();
        const tones = SFX[name];
        if (!tones) return;
        for (const t of tones) this.tone(t, t.delay || 0);
    }

    static playBgm(name: string) {
        this.wantedBgm = name;
        if (this.paused) return;
        if (this.bgmName === name && this.bgmTimer) return;
        this.bgmName = name;
        this.startBgm(name);
    }

    private static startBgm(name: string) {
        if (Save.data.music === false) return;
        this.unlock();
        this.stopTimer();
        const def = BGM[name];
        if (!def || !this.ctx) return;
        this.bgmStep = 0;
        this.bgmTimer = setInterval(() => {
            if (this.paused || !this.ctx) return;
            const f = def.notes[this.bgmStep % def.notes.length];
            this.tone({ f, d: def.step * 0.95, type: def.type, vol: def.vol });
            if (this.bgmStep % 4 === 0) this.tone({ f: f / 2, d: def.step * 1.8, type: 'sine', vol: def.vol * 1.2 });
            this.bgmStep++;
        }, def.step * 1000);
    }

    private static stopTimer() {
        if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    }

    static pauseBgm() {
        this.paused = true;
        this.stopTimer();
    }

    static resumeBgm() {
        this.paused = false;
        const n = this.bgmName || this.wantedBgm;
        this.bgmName = '';
        if (n) this.playBgm(n);
    }

    static bgmPlaying() { return !!this.bgmTimer; }

    static refreshMusic() {
        const n = this.bgmName || this.wantedBgm;
        this.bgmName = '';
        if (n) this.playBgm(n);
    }

    static vibrate(heavy = false) {
        if (Save.data.vibrate === false) return;
        try {
            const g = globalThis as any;
            const api = g.wx || g.tt;
            if (api && api.vibrateShort) { api.vibrateShort({ type: heavy ? 'heavy' : 'light' }); return; }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(heavy ? 40 : 15);
        } catch (e) { /* 忽略 */ }
    }
}

// GameRoot 以 { Sound, vibrate } 导入
export function vibrate(heavy = false) { Sound.vibrate(heavy); }
