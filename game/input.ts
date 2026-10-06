export const ACTIONS = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'next', 'previous', 'view', 'zoomIn', 'zoomOut', 'cameraUp', 'cameraDown', 'cameraLeft', 'cameraRight', 'cameraReset'] as const;
export type Action = typeof ACTIONS[number];
export const LABELS: Record<Action, string> = { up: '위', down: '아래', left: '왼쪽', right: '오른쪽', confirm: '확인', cancel: '취소 / 뒤로', menu: '일시정지', next: '다음 유닛', previous: '이전 유닛', view: '전술 시점', zoomIn: '확대', zoomOut: '축소', cameraUp: '카메라 위', cameraDown: '카메라 아래', cameraLeft: '카메라 왼쪽', cameraRight: '카메라 오른쪽', cameraReset: '카메라 초기화' };
export type Bindings = {
    keys: Record<Action, string>;
    buttons: Record<Action, number>;
};
export const defaults = (): Bindings => ({ keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', confirm: 'Enter', cancel: 'Escape', menu: 'KeyP', next: 'KeyE', previous: 'KeyQ', view: 'KeyV', zoomIn: 'Equal', zoomOut: 'Minus', cameraUp: 'KeyI', cameraDown: 'KeyK', cameraLeft: 'KeyJ', cameraRight: 'KeyL', cameraReset: 'KeyR' }, buttons: { up: 12, down: 13, left: 14, right: 15, confirm: 0, cancel: 1, menu: 9, next: 5, previous: 4, view: 3, zoomIn: 7, zoomOut: 6, cameraUp: -1, cameraDown: -1, cameraLeft: -1, cameraRight: -1, cameraReset: 11 } });
export function loadBindings(raw: string | null): Bindings {
    try {
        const v = JSON.parse(raw ?? '');
        for (const a of ACTIONS) {
            if (typeof v.keys[a] !== 'string' || v.keys[a].length > 30 || v.keys[a] === 'Tab' || !Number.isInteger(v.buttons[a]) || v.buttons[a] < -1 || v.buttons[a] > 31)
                throw Error();
        }
        if (new Set(Object.values(v.keys)).size !== ACTIONS.length)
            throw Error();
        return v;
    }
    catch {
        return defaults();
    }
}
export function bind(b: Bindings, kind: 'keys' | 'buttons', a: Action, value: string | number) {
    const old = b[kind][a];
    for (const other of ACTIONS)
        if (b[kind][other] === value)
            (b[kind] as Record<string, string | number>)[other] = old;
    (b[kind] as Record<string, string | number>)[a] = value;
}
export const repeating = (a: Action) => ['up', 'down', 'left', 'right', 'cameraUp', 'cameraDown', 'cameraLeft', 'cameraRight', 'zoomIn', 'zoomOut'].includes(a);
export class Edges {
    private held = new Map<Action, number>();
    sample(actions: Set<Action>, now: number): Action[] {
        const out: Action[] = [];
        for (const a of ACTIONS) {
            if (!actions.has(a)) {
                this.held.delete(a);
                continue;
            }
            const due = this.held.get(a);
            if (due === undefined) {
                out.push(a);
                this.held.set(a, now + 340);
            }
            else if (repeating(a) && now >= due) {
                out.push(a);
                this.held.set(a, now + 100);
            }
        }
        return out;
    }
    clear() { this.held.clear(); }
}
export type Pad = {
    connected: boolean;
    index: number;
    mapping: string;
    buttons: ReadonlyArray<{
        pressed: boolean;
        value: number;
    }>;
    axes: ReadonlyArray<number>;
};
export function padActions(pad: Pad, b: Bindings): Set<Action> {
    const out = new Set<Action>();
    for (const a of ACTIONS) {
        const n = b.buttons[a];
        if (n >= 0 && (pad.buttons[n]?.pressed || pad.buttons[n]?.value > .55))
            out.add(a);
    }
    const axis = (i: number, negative: Action, positive: Action) => {
        if (pad.axes[i] < -.3)
            out.add(negative);
        if (pad.axes[i] > .3)
            out.add(positive);
    };
    axis(0, 'left', 'right');
    axis(1, 'up', 'down');
    axis(2, 'cameraLeft', 'cameraRight');
    axis(3, 'cameraUp', 'cameraDown');
    return out;
}
export class Input {
    bindings: Bindings;
    capture: {
        action: Action;
        kind: 'keys' | 'buttons';
    } | null = null;
    private keys = new Set<string>();
    private edges = new Edges();
    private blockedKeys = new Set<string>();
    private previousPadButtons = new Set<number>();
    private connected = false;
    private awaitNeutral = false;
    private suspended = false;
    constructor(private emit: (a: Action) => void, private status: (s: string, lost: boolean) => void, private changed: () => void) {
        let raw = null;
        try {
            raw = localStorage.getItem('tacticssd.controls');
        }
        catch { }
        this.bindings = loadBindings(raw);
        window.addEventListener('keydown', e => {
            if (this.blockedKeys.has(e.code)) {
                e.preventDefault();
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey)
                return;
            if (this.capture?.kind === 'keys') {
                e.preventDefault();
                if (!e.repeat) {
                    if (e.code === 'Tab' || ['ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code)) {
                        this.status('Tab과 조합 보조키는 탐색용으로 예약되어 있습니다. 다른 키를 선택하세요.', false);
                        return;
                    }
                    if (e.code === 'Escape')
                        this.capture = null;
                    else {
                        bind(this.bindings, 'keys', this.capture.action, e.code);
                        this.blockedKeys.add(e.code);
                        this.capture = null;
                        this.save();
                    }
                    this.keys.clear();
                    this.edges.clear();
                    this.changed();
                }
                return;
            }
            if (e.code === 'Escape' && this.capture) {
                this.capture = null;
                this.changed();
                return;
            }
            if (e.code === 'Tab')
                return;
            if (Object.values(this.bindings.keys).includes(e.code) || e.code === 'Space') {
                e.preventDefault();
                this.keys.add(e.code);
                this.tick(performance.now());
            }
        });
        window.addEventListener('keyup', e => { this.blockedKeys.delete(e.code); this.keys.delete(e.code); this.tick(performance.now()); });
        window.addEventListener('blur', () => { this.keys.clear(); this.blockedKeys.clear(); this.edges.clear(); this.suspended = true; this.status('창이 비활성화되었습니다.', true); });
        window.addEventListener('focus', () => { this.suspended = false; this.keys.clear(); this.awaitNeutral = true; });
    }
    save() {
        try {
            localStorage.setItem('tacticssd.controls', JSON.stringify(this.bindings));
        }
        catch {
            this.status('설정 저장 공간을 사용할 수 없습니다.', false);
        }
    }
    reset() { this.bindings = defaults(); this.save(); }
    tick(now: number, pads: ReadonlyArray<Pad | null> = Array.from(navigator.getGamepads?.() ?? [])) {
        if (this.suspended)
            return;
        const pad = pads.find(p => p?.connected) ?? null;
        if (Boolean(pad) !== this.connected) {
            this.connected = Boolean(pad);
            this.awaitNeutral = true;
            for (const key of this.keys) this.blockedKeys.add(key);
            this.keys.clear();
            this.edges.clear();
            this.previousPadButtons.clear();
            this.status(pad ? `컨트롤러 연결 · ${pad.mapping === 'standard' ? '표준 매핑' : '비표준 · 버튼 설정 확인'}` : '컨트롤러 연결 해제 · 키보드로 계속할 수 있습니다.', !pad);
        }
        const physical = new Set<number>();
        pad?.buttons.forEach((b, i) => {
            if (b.pressed || b.value > .55)
                physical.add(i);
        });
        if (this.awaitNeutral) {
            if (physical.size === 0 && (!pad || pad.axes.every(a => Math.abs(a) < .3)))
                this.awaitNeutral = false;
            else {
                this.previousPadButtons = physical;
            }
        }
        if (this.capture) {
            // Back is an invariant capture cancel, including when all normal actions are remapped.
            const cancel = physical.has(8) || this.capture.kind === 'keys' && physical.has(this.bindings.buttons.cancel);
            if (cancel && !this.awaitNeutral) {
                this.capture = null; this.awaitNeutral = true; this.keys.clear(); this.edges.clear(); this.changed();
                return;
            }
            if (this.capture.kind === 'buttons' && !this.awaitNeutral) {
                const n = [...physical].find(i => !this.previousPadButtons.has(i));
                if (n !== undefined) {
                    bind(this.bindings, 'buttons', this.capture.action, n);
                    this.awaitNeutral = true;
                    this.capture = null;
                    this.save();
                    this.changed();
                }
            }
            this.previousPadButtons = physical;
            this.edges.sample(new Set(), now);
            return;
        }
        this.previousPadButtons = physical;
        const actions = pad && !this.awaitNeutral ? padActions(pad, this.bindings) : new Set<Action>();
        for (const a of ACTIONS)
            if (this.keys.has(this.bindings.keys[a]))
                actions.add(a);
        if (this.keys.has('Space') && !Object.values(this.bindings.keys).includes('Space'))
            actions.add('confirm');
        const emitted=this.edges.sample(actions,now);
        if(emitted.includes('cancel')){this.emit('cancel');return;}
        for (const a of emitted) this.emit(a);
    }
}
