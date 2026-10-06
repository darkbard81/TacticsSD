import sourceCatalog from './source-catalog.json' with {type:'json'};
import {PRODUCTS,productById,inventoryFor,equippedCount,tradeReason,trade,equip,canEquip,itemIcon,SLOT_NAMES,type Slot,type Quote} from './shop';
import './style.css';
import { derive } from './calculation';
import {readRigFiles,storedRig,type RigBundle} from './rig-library';
import { weaponFor, abilityById, CLASS_ABILITIES, SUPPORT_SKILLS, CONSUMABLES, EXTRA_GEAR, ARMOR, WEAPONS, type Stats } from './content';
import { Input, ACTIONS, LABELS, type Action } from './input';
import { Renderer, type VisualState } from './render';
import { newCampaign, parseCampaign, encodeCampaign, commandAbility, makeBattle, moveUnit, activeUnit, turnOrder, finishTurn, STAGES, JOBS, HEROES, reachable, targets, damage, accuracy, activateGuard, act, enemyTurn, reward, classLevel, trainingFor, learnAbility, equipSupport, itemStock, unitAt, tileAt, same, type Battle, type Campaign, type Pos, type Command } from './domain';
const root = document.querySelector<HTMLDivElement>('#game')!;
root.innerHTML = '<div id="scene"></div><div id="ui"></div><div id="announcer" class="sr-only" aria-live="polite"></div>';
const ui = document.querySelector<HTMLDivElement>('#ui')!, announcer = document.querySelector<HTMLElement>('#announcer')!;
const renderer = new Renderer(document.querySelector('#scene')!);
type Screen = 'shop' | 'catalog' | 'title' | 'world' | 'stage' | 'party' | 'equipment' | 'items' | 'training' | 'dialogue' | 'battle' | 'result' | 'ending';
let screen: Screen = 'title', campaign = newCampaign(), stage = 0, hero = 0, battle: Battle | null = null, selected: string | null = null, cursor: Pos = { x: 1, y: 2 }, mode = 'select', command: Command = 'attack', targetIndex = 0, moved = false, origin: Pos | null = null, modal: 'pause' | 'settings' | 'help' | 'rig' | 'trade' | null = null, pauseStarted = 0, restoreFocus = '', focusIndex = 0, notice = '방향키로 선택하고 Enter로 확인하세요.', top = false, zoom = 1, pan = { x: 0, y: 0 }, dialoguePage = 0, enemyDue = 0, settingsOffset = 0, pendingEnd = 0, pendingMove = 0;
let shopKind:'buy'|'sell'='buy',shopId='sword-field',shopQty=1,shopPage=0,shopFilter:'all'|Slot|'consumable'='all',pendingTrade:Quote|null=null,catalogGroup='weapons',catalogPage=0;
let storyBattle:Battle|null=null;
let tabNavigation=false;
window.addEventListener('keydown',e=>{if(e.code==='Tab')tabNavigation=true;},true);
let saved: Campaign | null = null;
try {
    saved = parseCampaign(localStorage.getItem('tacticssd.campaign'));
    const prefs = JSON.parse(localStorage.getItem('tacticssd.view') ?? '{}');
    top = prefs.top === true;
}
catch { }
const modalStack: Array<{
    modal: 'pause' | 'settings' | 'help' | 'rig' | 'trade' | null;
    focus: string;
}> = [];
const input = new Input(onAction, (message, lost) => {
    notice = message;
    if(lost&&modal==='trade'){closeModal();return;}
    if (lost && screen === 'battle' && !modal)
        openModal('pause');
    else
        render();
}, () => render());
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const btn = (id: string, label: string, disabled = false, extra = '') => `<button data-id="${id}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
const portrait = (h: number, weapon?:number) => `<div class="portrait p${h}" aria-hidden="true"><canvas data-portrait="${h}" ${weapon===undefined?'':`data-weapon="${weapon}"`} width="200" height="220"></canvas><span>${JOBS[h].icon}</span></div>`;
const formatKey = (a: Action) => input.bindings.keys[a].replace('Arrow', '').replace('Key', '').replace('Equal', '+').replace('Minus', '−');
const unit = () => battle?.units.find(u => u.id === selected);
function save() {
    try {
        localStorage.setItem('tacticssd.campaign', encodeCampaign(campaign));
        saved = structuredClone(campaign);
        notice = '원정 기록 저장 완료 · 전투는 출전 전부터 복원됩니다.';
    }
    catch {
        notice = '브라우저 저장 공간을 사용할 수 없습니다.';
    }
}
function go(next: Screen) {
    if (next !== 'battle') {
        pendingEnd = 0;
        pendingMove = 0;
    }
    screen = next;
    focusIndex = 0;
    mode = 'select';
    notice = '';
    render();
}
function start() { modal = null; modalStack.length = 0; renderer.reset(); pendingMove = 0; pendingEnd = 0; battle = makeBattle(stage, campaign); selected = null; cursor = { x: 1, y: 2 }; moved = false; origin = null; zoom = 1; pan = { x: 0, y: 0 }; go('battle'); notice = 'RT가 0인 유닛의 차례입니다. 이동과 행동을 원하는 순서로 수행하세요.'; render(); }
function buttons() { return [...ui.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(b => !b.closest('[inert]')).sort((a, b) => Number(Boolean(b.closest('.command'))) - Number(Boolean(a.closest('.command')))); }
function focusAt(index: number) {
    const all = buttons();
    if (!all.length)
        return;
    focusIndex = (index + all.length) % all.length;
    all[focusIndex].focus({ preventScroll: true });
    all[focusIndex].scrollIntoView({ block: 'nearest' });
}
function openModal(which: 'pause' | 'settings' | 'help' | 'rig' | 'trade') {
    restoreFocus = (document.activeElement as HTMLElement)?.dataset.id ?? '';
    modalStack.push({ modal, focus: restoreFocus });
    if (!modal)
        pauseStarted = performance.now();
    modal = which;
    focusIndex = 0;
    render();
}
function closeModal() {
    if(modal==='trade')pendingTrade=null;
    if (input.capture) {
        input.capture = null;
        render();
        return;
    }
    const previous = modalStack.pop();
    modal = previous?.modal ?? null;
    if (!modal) {
        const elapsed = performance.now() - pauseStarted;
        if (pendingEnd)
            pendingEnd += elapsed;
        if (pendingMove)
            pendingMove += elapsed;
        if (enemyDue)
            enemyDue += elapsed;
    }
    render();
    buttons().find(b => b.dataset.id === previous?.focus)?.focus();
}
function endUnit() {
    if (!battle)
        return;
    finishTurn(battle);
    selected = null;
    mode = 'select';
    origin = null;
    moved = false;
    outcome();
    if (battle.phase === 'enemy') {
        enemyDue = performance.now() + 650;
        notice = '적이 행동합니다…';
    }
    else {
        const next = activeUnit(battle);
        cursor = { x: next.x, y: next.y };
        notice = next.name + ' · AT 시작';
    }
    render();
}
function selectFacing() { mode = 'facing'; focusIndex=0; notice = '방향키로 종료 방향 선택 · 확인: AT 종료 · 취소: 명령으로'; render(); }
function outcome() {
    if (!battle)
        return;
    if (battle.phase === 'won') {
        campaign.inventory={...inventoryFor(campaign),...battle.inventory,'mend-leaf':battle.potions};
        reward(campaign, stage);
        save();
        go('result');
    }
    else if (battle.phase === 'lost')
        go('result');
}
function execute(id: string) {
    if (id === 'close') {
        closeModal();
        return;
    }
    if (id === 'settings') {
        openModal('settings');
        return;
    }
    if (id === 'help') {
        openModal('help');
        return;
    }
    if (id === 'defaults') {
        input.reset();
        notice = '입력 기본값을 복원했습니다.';
        render();
        return;
    }
    if (id.startsWith('bind-')) {
        const [, kind, index] = id.split('-');
        input.capture = { kind: kind as 'keys' | 'buttons', action: ACTIONS[Number(index)] };
        notice = '새 입력을 누르세요. Esc로 취소 · 중복 버튼은 서로 교환합니다.';
        render();
        return;
    }
    if (id === 'settings-prev' || id === 'settings-next') {
        settingsOffset = id === 'settings-prev' ? 0 : 9;
        focusIndex = 0;
        render();
        return;
    }
    if(id==='shop'){shopPage=0;shopQty=1;go('shop');return;}
    if(id==='catalog'){catalogPage=0;go('catalog');return;}
    if(id.startsWith('catalog-group-')){catalogGroup=id.slice(14);catalogPage=0;render();return;}
    if(id.startsWith('catalog-')){catalogPage=Math.max(0,catalogPage+({'catalog-first':-999,'catalog-prev':-1,'catalog-next':1,'catalog-prev10':-10,'catalog-next10':10}[id]??0));render();return;}
    if(id==='shop-buy'||id==='shop-sell'){shopKind=id==='shop-buy'?'buy':'sell';shopQty=1;render();return;}
    if(id==='shop-prev'||id==='shop-next'){shopPage+=id==='shop-next'?1:-1;render();return;}
    if(id.startsWith('filter-')){shopFilter=id.slice(7) as typeof shopFilter;shopPage=0;shopId=PRODUCTS.find(p=>shopFilter==='all'||p.slot===shopFilter)!.id;shopQty=1;render();return;}
    if(id.startsWith('product-')){shopId=id.slice(8);shopQty=1;render();return;}
    if(id.startsWith('qty-')){shopQty=Math.max(1,Math.min(99,shopQty+(id.includes('down')?-1:1)*(id.endsWith('10')?10:1)));render();return;}
    if(id==='trade-request'){const q={kind:shopKind,id:shopId,quantity:shopQty};if(tradeReason(campaign,q)){notice=tradeReason(campaign,q);render();return;}pendingTrade=q;openModal('trade');return;}
    if(id==='trade-cancel'){closeModal();return;}
    if(id==='trade-confirm'){
      const q=pendingTrade;pendingTrade=null;if(!q)return;
      const next=trade(campaign,q);closeModal();
      if(!next){notice='거래 조건이 바뀌었습니다. 다시 선택하세요.';render();return;}
      try{localStorage.setItem('tacticssd.campaign',encodeCampaign(next));campaign=next;saved=structuredClone(next);notice=`${q.kind==='buy'?'구매':'판매'} 완료 · ${productById(q.id)!.name} ×${q.quantity} · 자동 저장`;}catch{notice='저장 공간 오류: 거래가 취소되었으며 자금과 재고는 바뀌지 않았습니다.';}
      render();return;
    }
    if(id==='shop-hero'){hero=(hero+1)%HEROES.length;render();return;}
    if(id==='shop-equip'){
      const p=productById(shopId)!;if(p.slot==='consumable')return;
      const list=p.slot==='weapon'?WEAPONS.filter(w=>w.family===JOBS[hero].weaponFamily):p.slot==='armor'?ARMOR:EXTRA_GEAR[p.slot];const n=list.findIndex(i=>i.id===p.id);
      if(n>=0&&equip(campaign,hero,p.slot,n)){save();notice=HEROES[hero]+' · '+p.name+' 장착';}else notice='해당 대원이 사용할 수 없거나 여분이 없습니다.';render();return;
    }
    if (id === 'new') {
        campaign = newCampaign();
        stage = 0;
        go('world');
        return;
    }
    if (id === 'continue') {
        if (saved)
            campaign = structuredClone(saved);
        stage = Math.min(2, campaign.unlocked);
        go('world');
        notice = '저장된 원정을 복원했습니다. 전투는 출전 전부터 시작합니다.';
        render();
        return;
    }
    if (id === 'save') {
        save();
        render();
        return;
    }
    if (id === 'title') {
        modal = null;
        modalStack.length = 0;
        go('title');
        return;
    }
    if (id === 'world') {
        modal = null;
        modalStack.length = 0;
        selected = null;
        battle = null;
        go('world');
        return;
    }
    if (id === 'resume') {
        closeModal();
        return;
    }
    if (id === 'restart') {
        modal = null;
        start();
        return;
    }
    if (id === 'view') {
        top = !top;
        try {
            localStorage.setItem('tacticssd.view', JSON.stringify({ top }));
        }
        catch { }
        render();
        return;
    }
    if (id.startsWith('stage-')) {
        stage = Number(id.slice(6));
        go('stage');
        return;
    }
    if (id === 'party') {
        go('party');
        return;
    }
    if (id === 'deploy') {
        save();
        dialoguePage = 0;
        storyBattle=makeBattle(stage,campaign);
        go('dialogue');
        return;
    }
    if (id.startsWith('hero-')) {
        hero = Number(id.slice(5));
        render();
        return;
    }
    if (id.startsWith('toggle-')) {
        const h = Number(id.slice(7));
        hero = h;
        if (campaign.party.includes(h)) {
            if (campaign.party.length > 1)
                campaign.party = campaign.party.filter(x => x !== h);
            else
                notice = '최소 1명은 출전해야 합니다.';
        }
        else if (campaign.party.length < 3)
            campaign.party.push(h);
        else
            notice = '출전은 최대 3명입니다. 한 명을 먼저 해제하세요.';
        render();
        return;
    }
    if (id === 'equipment') {
        go('equipment');
        return;
    }
    if(id==='training'){go('training');return;}
    if(id==='rig-settings'){openModal('rig');return;}
    if(id==='rig-load'){rigPicker.click();return;}
    if(id==='rig-reset'){storedRig(null).then(()=>renderer.restoreDefaultRig()).then(()=>{notice='기본 리그로 복원했습니다. 진행 중인 편성은 유지됩니다.';render();}).catch(()=>{notice='기본 리그를 복원하지 못했습니다.';render();});return;}
    if(id.startsWith('learn-')){notice=learnAbility(campaign,hero,id.slice(6))?'기술을 학습·장착했습니다.':'SP가 부족합니다.';save();render();return;}
    if(id.startsWith('support-')){equipSupport(campaign,hero,id.slice(8));save();render();return;}
    if(id==='formation'){campaign.party.push(campaign.party.shift()!);notice='출전 순서를 변경했습니다. 첫 대원이 선두에서 먼저 행동합니다.';render();return;}
    if (id === 'items') {
        go('items');
        return;
    }
    if (id.startsWith('gear-')) {
        const [, kind, n] = id.split('-');
        if(!equip(campaign,hero,kind as Slot,Number(n))){notice='여분이 없습니다. 상점에서 구매하세요.';render();return;}
        notice = '장비를 변경했습니다. 능력과 무기 동작이 함께 바뀝니다.';
        render();
        return;
    }
    if (id === 'talk-0' || id === 'talk-1') {
        if (dialoguePage === 0) {
            dialoguePage = 1;
            notice = id === 'talk-0' ? '에린: 함께 길을 열겠습니다.' : '에린: 고지대부터 살펴보죠.';
            render();
        }
        else
            start();
        return;
    }
    if (id === 'next-stage') {
        if (campaign.unlocked === 3)
            go('ending');
        else {
            stage = Math.min(2, campaign.unlocked);
            battle = null;
            go('world');
        }
        return;
    }
    if (screen === 'battle' && (mode === 'animating' || mode === 'walking') && ['finish-turn', 'move', 'undo', 'attack', 'skill', 'item', 'target-confirm', 'wait', 'face-confirm', 'guard-skill'].some(action => id === action) || screen === 'battle' && (mode === 'animating' || mode === 'walking') && id.startsWith('unit-'))
        return;
    if (id === 'finish-turn') {
        if (modal)
            closeModal();
        if (battle?.phase === 'ally' && mode !== 'animating' && mode !== 'walking') {
            selected = battle.activeId;
            selectFacing();
        }
        return;
    }
    if (id.startsWith('unit-')) {
        const u = battle?.units.find(u => u.id === id.slice(5));
        if (u && u.hp > 0 && u.id === battle?.activeId && battle.phase === 'ally') {
            selected = u.id;
            cursor = { x: u.x, y: u.y };
            moved = u.moved;
            mode = 'command';
            focusIndex = 0;
            render();
        }
        return;
    }
    const u = unit();
    if (!battle || !u)
        return;
    if(id==='bag'){mode='inventory';render();return;}
    if(id.startsWith('item-pick-')){u.itemId=id.slice(10);mode='command';notice=commandAbility(u,'item').name+' 선택';render();return;}
    if (id === 'move' && !u.moved) {
        mode = 'move';
        cursor = { x: u.x, y: u.y };
        notice = '파란 타일로 이동 · 확인하여 배치 · 취소로 돌아가기';
        render();
        return;
    }
    if (id === 'undo' && origin && !u.acted && !u.skillUsed) {
        u.x = origin.x;
        u.y = origin.y;
        cursor = { ...origin };
        origin = null;
        moved = false;
        u.moved = false;
        u.moveRT = 0;
        render();
        return;
    }
    if (id === 'attack' || id === 'skill' || id === 'item') {
        if (u.acted)
            return;
        command = id;
        const ts = targets(battle, u, command);
        if (!ts.length) {
            notice = id === 'skill' && u[commandAbility(u,'skill').resource] < commandAbility(u,'skill').cost ? '필요한 자원이 부족합니다.' : '사거리 안에 유효한 대상이 없습니다.';
            render();
            return;
        }
        mode = 'target';
        targetIndex = 0;
        cursor = { x: ts[0].x, y: ts[0].y };
        focusIndex = 0;
        render();
        return;
    }
    if (id === 'target-confirm') {
        const t = targets(battle, u, command)[targetIndex];
        if (t && act(battle, u, t, command)) {
            renderer.attack(u.id, command);
            mode = 'animating';
            pendingEnd = performance.now() + 720;
            notice = '행동 중…';
            render();
        }
        return;
    }
    if (id === 'guard-skill') {
        activateGuard(battle, u);
        render();
        return;
    }
    if (id === 'wait') {
        selectFacing();
        return;
    }
    if (id === 'face-confirm') {
        endUnit();
        return;
    }
    if (id === 'back-command') {
        mode = 'command';
        render();
    }
}
function back() {
    if ((mode === 'animating' || mode === 'walking') && !modal) {
        openModal('pause');
        return;
    }
    if (modal) {
        closeModal();
        return;
    }
    if (screen === 'battle') {
        if (mode === 'move' || mode === 'target' || mode === 'facing' || mode === 'inventory') {
            mode = 'command';
            render();
        }
        else if (mode === 'command') {
            openModal('pause');
        }
        else
            openModal('pause');
        return;
    }
    if(screen==='catalog'){go('shop');return;}
    if(screen==='shop'){go('world');return;}
    if (screen === 'equipment' || screen === 'items' || screen === 'training')
        go('party');
    else if (screen === 'party')
        go('stage');
    else if (screen === 'stage')
        go('world');
    else if (screen === 'world')
        go('title');
    else if (screen === 'dialogue')
        go('party');
    else if (screen === 'result' || screen === 'ending')
        go('world');
}
function onAction(a: Action) {
    if (input.capture)
        return;
    if(a==='confirm' && tabNavigation){const id=(document.activeElement as HTMLElement)?.dataset.id;if(id){tabNavigation=false;execute(id);return;}}
    tabNavigation=false;
    if (a === 'cancel') {
        back();
        return;
    }
    if (a === 'menu') {
        if (modal)
            closeModal();
        else
            openModal('pause');
        return;
    }
    if (a === 'view' && !modal) {
        execute('view');
        return;
    }
    if (screen === 'battle' && !modal) {
        if (a.startsWith('camera') || a === 'zoomIn' || a === 'zoomOut') {
            if (a === 'cameraReset') {
                zoom = 1;
                pan = { x: 0, y: 0 };
            }
            if (a === 'zoomIn')
                zoom = Math.min(1.7, zoom + .1);
            if (a === 'zoomOut')
                zoom = Math.max(.65, zoom - .1);
            if (a === 'cameraUp')
                pan.y = Math.max(-200, pan.y - 18);
            if (a === 'cameraDown')
                pan.y = Math.min(200, pan.y + 18);
            if (a === 'cameraLeft')
                pan.x = Math.max(-280, pan.x - 18);
            if (a === 'cameraRight')
                pan.x = Math.min(280, pan.x + 18);
            return;
        }
        if (battle?.phase === 'enemy' || mode === 'animating' || mode === 'walking')
            return;
        if (a === 'next' || a === 'previous') {
            if (mode === 'target') {
                cycleTarget(a === 'next' ? 1 : -1);
                return;
            }
            if (mode === 'select' || mode === 'command' && !moved) {
                const us = battle!.units.filter(u => u.id === battle!.activeId && u.team === 'ally' && u.hp > 0);
                const i = us.findIndex(u => u.id === selected);
                if (us.length)
                    execute('unit-' + us[(i + (a === 'next' ? 1 : us.length - 1) + us.length) % us.length].id);
            }
            return;
        }
        if (mode === 'facing') {
            const facing = { up: 'NE', down: 'SW', left: 'NW', right: 'SE' }[a as 'up'];
            if (facing) {
                unit()!.facing = facing as 'NE';
                render();
            }
            if (a === 'confirm')
                endUnit();
            return;
        }
        if (mode === 'move' || mode === 'select') {
            const delta = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[a as 'up'];
            if (delta) {
                cursor = { x: Math.max(0, Math.min(7, cursor.x + delta.x)), y: Math.max(0, Math.min(7, cursor.y + delta.y)) };
                render();
                return;
            }
            if (a === 'confirm') {
                if (mode === 'select') {
                    const u = unitAt(battle!, cursor);
                    if (u?.team === 'ally' && u.id === battle!.activeId)
                        execute('unit-' + u.id);
                    else {
                        notice = '현재 AT 유닛만 행동합니다. E / Q로 활성 유닛에 초점을 맞춥니다.';
                        render();
                    }
                }
                else {
                    const u = unit()!;
                    if (reachable(battle!, u).some(p => same(p, cursor))) {
                        origin = { x: u.x, y: u.y };
                        const path = moveUnit(battle!, u, cursor);
                        renderer.move(u.id, path);
                        pendingMove = performance.now() + Math.max(0, path.length - 1) * 160;
                        moved = u.moved;
                        mode = moved ? 'walking' : 'command';
                        focusIndex = 0;
                        render();
                    }
                    else {
                        notice = '이동할 수 없는 타일입니다.';
                        render();
                    }
                }
                return;
            }
        }
        if (mode === 'target' && a === 'confirm') {
            const focused = (document.activeElement as HTMLElement)?.dataset.id;
            execute(focused && ['back-command','target-confirm','settings','view'].includes(focused) ? focused : 'target-confirm');
            return;
        }
        if (mode === 'target' && ['up', 'down', 'left', 'right'].includes(a)) {
            cycleTarget(a === 'up' || a === 'left' ? -1 : 1);
            return;
        }
    }
    if (a === 'confirm') {
        const active = document.activeElement as HTMLButtonElement;
        if (active?.dataset.id)
            execute(active.dataset.id);
        else
            buttons()[focusIndex]?.click();
        return;
    }
    if (['up', 'down', 'left', 'right', 'next', 'previous'].includes(a))
        focusAt(focusIndex + (['up', 'left', 'previous'].includes(a) ? -1 : 1));
}
function cycleTarget(d: number) {
    const ts = targets(battle!, unit()!, command);
    if (!ts.length)
        return;
    targetIndex = (targetIndex + d + ts.length) % ts.length;
    cursor = { x: ts[targetIndex].x, y: ts[targetIndex].y };
    render();
}
const weaponIcon = (h:number,n:number) => {const w=weaponFor(h,n);return `<span class="weapon-icon" style="background-position:${w.frame%4*100/3}% ${Math.floor(w.frame/4)*100}%" aria-hidden="true"></span>`;};
function regionMap(index:number) {const b=makeBattle(index,campaign);return `<div class="region-map" aria-label="${STAGES[index].name} 지형 미리보기"><div class="mini-board">${b.tiles.map(t=>`<i class="${t.kind} ${t.block?'wall':''}" style="--e:${t.h}">${t.block?'♜':''}</i>`).join('')}</div><p>지형 정찰 · ${index===0?'강을 건너는 두 다리':index===1?'폐허와 남쪽 고지': '성벽과 북쪽 성채'}</p></div>`;}
const title = (small: string, big: string) => `<div class="section-title"><small>${small}</small><h1>${big}</h1></div>`;
function render() {
    const old = (document.activeElement as HTMLElement)?.dataset.id;
    const u = unit(), b = battle, stats = derive(hero, classLevel(campaign,hero), campaign.gear[hero],trainingFor(campaign,hero).supportId);
    root.dataset.screen = screen;
    root.dataset.mode = mode;
    root.dataset.modal = modal ?? '';
    let content = '';
    if (screen === 'title')
        content = `<section class="title-screen">${title('TACTICS SD · CHAPTER I', '은빛 여명')}<p class="tagline">세 개의 길, 하나의 약속.<br>당신의 선택이 여명을 되찾습니다.</p><nav>${btn('new', '새 원정 시작 <span>→</span>')}${btn('continue', '원정 이어하기', !saved)}${btn('settings', '입력 설정')}${btn('help', '전술 안내')}<a href="/">제작 도구로 돌아가기 ↗</a></nav><p class="edition">THE SILVER DAWN · A TACTICAL CHRONICLE</p></section>`;
    if (screen === 'world')
        content = `<div class="world-heading">${title('ELDERVALE · EXPEDITION MAP', '엘더베일 원정')}</div><div class="map-route"><svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path d="M180 465 Q360 520 480 300 T820 130"/></svg>${STAGES.map((s, i) => `<div class="map-node n${i}">${btn('stage-' + i, `<i>${campaign.cleared.includes(i) ? '⚑' : i <= campaign.unlocked ? '♜' : '♜'}</i><small>0${i + 1}</small><strong>${s.name}</strong>`, i > campaign.unlocked)}</div>`).join('')}</div><aside class="map-info paper"><small>ORDER OF THE SILVER DAWN</small><h2>은빛 여명 원정대</h2><p>해방된 거점 <b>${campaign.cleared.length} / 3</b></p><p>전쟁 자금 <b>${campaign.gold} G</b></p>${btn('shop','▣ 원정 보급소')}${btn('save', '기록 저장')}${btn('settings', '입력 설정')}</aside>`;
    if(screen==='shop')content=shopUI();
    if(screen==='catalog')content=catalogUI();
    if (screen === 'stage')
        content = `${regionMap(stage)}<section class="stage-panel paper">${title(STAGES[stage].sub, STAGES[stage].name)}<div class="stage-icon">♜</div><p>${STAGES[stage].desc}</p><dl><dt>승리 조건</dt><dd>모든 적 격파</dd><dt>적 병력</dt><dd>${stage === 2 ? 4 : 3}명 · 고저차 ${stage === 2 ? 3 : 2}</dd><dt>첫 승리 보상</dt><dd>${STAGES[stage].reward} G · 다음 거점 해금</dd></dl>${btn('party', '부대 편성 →')}${btn('world', '월드맵으로')}</section>`;
    if (screen === 'party' || screen === 'equipment' || screen === 'items' || screen === 'training')
        content = `<section class="roster paper">${title('BATTLE PREPARATION', screen === 'party' ? '출전 부대 편성' : screen === 'equipment' ? '장비와 능력' : screen === 'training' ? '기술과 수련' : '보급품 안내')}<div class="roster-layout"><aside class="hero-detail">${portrait(hero)}<h2>${HEROES[hero]} <small>${JOBS[hero].name}</small></h2><p>성인 엘프 원정대 · 클래스 Lv. ${classLevel(campaign,hero)}</p><dl><dt>HP / MP</dt><dd>${stats.hp} / ${stats.mp}</dd><dt>ATK / DEF</dt><dd>${stats.attack} / ${stats.defense}</dd><dt>이동 / 사거리</dt><dd>${stats.move} / ${JOBS[hero].range}</dd><dt>STR / VIT / DEX</dt><dd>${stats.stats.str.toFixed(0)} / ${stats.stats.vit.toFixed(0)} / ${stats.stats.dex.toFixed(0)}</dd><dt>INT / MND / RES</dt><dd>${stats.stats.int.toFixed(0)} / ${stats.stats.mnd.toFixed(0)} / ${stats.stats.res.toFixed(0)}</dd><dt>AGI / AVD</dt><dd>${stats.stats.agi.toFixed(0)} / ${stats.stats.avd.toFixed(0)}</dd><dt>수련 SP</dt><dd>${trainingFor(campaign,hero).sp}</dd><dt>직업 기술</dt><dd>${abilityById(trainingFor(campaign,hero).abilityId).name}</dd></dl></aside><div class="roster-main">${screen === 'party' ? `<h2>출전 ${campaign.party.length} / 3</h2><div class="formation-board">${campaign.party.map((h,i)=>`<div><small>${i+1}번 · ${i===0?'선두':'후속'}</small>${portrait(h)}<b>${HEROES[h]}</b></div>`).join('')}</div>${btn('formation','↻ 출전 순서 변경')}<div class="unit-cards">${HEROES.map((name, i) => btn('toggle-' + i, `${portrait(i)}<strong>${name}</strong><small>${JOBS[i].name} · ${campaign.party.includes(i) ? '✓ 출전' : '대기'}</small>`, false, `aria-pressed="${campaign.party.includes(i)}"`)).join('')}</div><p>확인으로 출전/대기 전환 · 최대 세 명을 선택하세요.</p><div class="row">${btn('equipment', '⚔ 장비 관리')}${btn('items', '♧ 보급품')}${btn('training','✧ 기술·수련')}</div>${btn('deploy', '출전 준비 완료 →')}` : screen === 'equipment' ? equipmentUI(stats) : screen === 'training' ? trainingUI() : `<h2>원정 보급품</h2><div class="supply-list">${CONSUMABLES.map(item=>`<article><b>${itemIcon(item.abilityId)} ${abilityById(item.abilityId).name}</b><span>×${inventoryFor(campaign)[item.abilityId]??0}</span><p>${abilityById(item.abilityId).description} 사거리2.</p></article>`).join('')}</div><p>원정 공용 재고입니다. 승리 시 사용량을 저장하고, 재도전은 출전 전 재고로 복원합니다.</p><p>전투 중 행동 → 아이템 → 아군 대상 → 확인으로 사용합니다. 최대 HP를 넘지 않습니다.</p>${btn('shop','▣ 보급소에서 구매')}<h3>✦ 정신 회복</h3><p>MP·TP는 0으로 시작하고 전체 RT 20 경과마다 1 회복. 피해를 준 공격 시 TP 6, 실제 피격 시 TP 4 획득. 매 전투에서 HP는 가득 차며 MP·TP는 다시 0부터 시작합니다.</p>${btn('party', '편성으로 돌아가기')}`}</div></div></section>`;
    if (screen === 'dialogue')
        content = `<div class="story-location">${title('CHAPTER I · A PROMISE AT DAWN', STAGES[stage].name)}</div><section class="dialogue paper">${portrait(dialoguePage === 0 ? 0 : hero)}<div><small>${dialoguePage === 0 ? '원정대장 에린' : '은빛 여명 원정대'}</small><h2>${dialoguePage === 0 ? ['강 건너에도 아직 불빛이 남아 있어요.', '다리는 무너져도 우리의 약속은 남아 있어요.', '저 성문 너머에서 새로운 아침이 기다려요.'][stage] : '각자의 빛을 믿고, 함께 나아가요.'}</h2><p>${dialoguePage === 0 ? '어둠의 파수대를 밀어내고 길을 되찾아야 해요. 여러분, 준비됐나요?' : '파란 타일은 이동 범위, 금빛 타일은 현재 선택입니다. 각자의 RT가 0이 되면 이동과 행동을 수행하고 종료 방향을 정합니다.'}</p>${btn('talk-0', dialoguePage === 0 ? '1. 함께 길을 열겠습니다.' : '전투 시작 →')}${dialoguePage === 0 ? btn('talk-1', '2. 지형부터 살피겠습니다.') : ''}</div></section>`;
    if (screen === 'battle' && b) {
        const t = tileAt(b, cursor)!;
        const hovered = unitAt(b, cursor);
        content = `<header class="battle-top"><div><small>CHAPTER 0${stage + 1} · AT ${b.round} · RT ${b.clock}</small><h2>${STAGES[stage].name}</h2></div><strong>${b.phase === 'enemy' ? 'ENEMY TURN' : 'PLAYER TURN'}</strong><div class="row">${btn('view', top ? '◇ 등각 시점' : '▦ Top view')}${btn('settings', '⚙ 설정')}</div></header><aside class="command paper"><small>${mode === 'move' ? 'MOVE' : mode === 'target' ? 'TARGET' : 'COMMAND'}</small><h2>${u?.name ?? '행동 선택'}</h2>${mode === 'animating' || mode === 'walking' ? `<p>${mode === 'walking' ? '이동' : '행동'}을 재생하고 있습니다.<br>시점·카메라·일시정지 사용 가능</p>` : mode === 'command' && u ? `${btn('move', '➤ 이동', moved)}${btn('attack', '⚔ 무기 공격', u.acted)}${btn('skill', `✦ ${commandAbility(u,'skill').name} (${commandAbility(u,'skill').cost}${commandAbility(u,'skill').resource.toUpperCase()})`, u.acted || u[commandAbility(u,'skill').resource] < commandAbility(u,'skill').cost)}${btn('item', `♧ ${commandAbility(u,'item').name} (${itemStock(b,u)})`, u.acted || itemStock(b,u) === 0)}${btn('bag','▣ 소모품 선택',u.acted)}${btn('guard-skill', '▣ 결의 (8TP · 별도 기술)', u.skillUsed || u.tp < 8)}${btn('wait', '◷ AT 종료 / 방향')}${btn('undo', '↶ 이동 되돌리기', !moved || u.acted || u.skillUsed)}` : mode === 'facing' && u ? `<h3>${u.facing} ↗</h3><p>방향키로 자세 선택<br>확인으로 AT 종료</p>${btn('face-confirm', '방향 확정')}` : mode === 'inventory' && u ? `<h3>전투 가방</h3>${CONSUMABLES.map(item=>{const a=abilityById(item.abilityId);return btn('item-pick-'+a.id,`${itemIcon(a.id)} ${a.name} ×${a.id==='mend-leaf'?b.potions:b.inventory[a.id]}<small>${a.description}</small>`,(a.id==='mend-leaf'?b.potions:b.inventory[a.id])===0);}).join('')}${btn('back-command','명령으로 돌아가기')}` : mode === 'target' && u ? targetPanel() : mode === 'move' ? `<p>방향키 / 왼쪽 스틱<br>확인: 이동 확정<br>취소: 명령으로</p>` : `<p>활성 유닛: ${activeUnit(b).name}<br>이동 1회 · 행동 1회 · 기술 1회</p>${b.units.filter(u => u.team === 'ally' && u.hp > 0).map(u => btn('unit-' + u.id, `${JOBS[u.job].icon} ${u.name}${u.id === b.activeId ? ' ◀ AT' : ''}`, u.id !== b.activeId || b.phase !== 'ally')).join('')}${btn('finish-turn', '현재 AT 종료', b.phase !== 'ally')}`}</aside><aside class="tile-info paper"><small>TERRAIN · ${cursor.x + 1}, ${cursor.y + 1}</small><h3>${t.kind === 'water' ? '물 · 통과 불가' : t.block ? '성벽 · 통과 불가' : t.kind === 'stone' ? '석조 길' : '초지'} · 높이 ${t.h}</h3>${hovered ? `<h2>${hovered.name}</h2><p>${JOBS[hovered.job].name} · ${hovered.team === 'ally' ? '아군' : '적군'}</p><p>HP ${hovered.hp} / ${hovered.maxHp}<br>MP ${hovered.mp} · TP ${hovered.tp}<br>ATK ${hovered.atk} · DEF ${hovered.def}<br>AGI ${hovered.derived.stats.agi.toFixed(0)} · AVD ${hovered.derived.stats.avd.toFixed(0)}</p>` : ''}<p class="battle-log">${escape(b.log.at(-1) ?? '')}</p></aside><div class="turn-order">${turnOrder(b).map(u => `<span class="${u.team} ${u.done ? 'done' : ''}">${JOBS[u.job].icon} ${u.name}<small>${u.hp} HP · RT ${Math.max(0, u.readyAt - b.clock)}</small></span>`).join('')}</div>`;
    }
    if (screen === 'result' && b)
        content = `<section class="result paper">${title(b.phase === 'won' ? 'VICTORY' : 'DEFEAT', b.phase === 'won' ? '길을 되찾았습니다' : '여명은 다시 찾아옵니다')}<div class="result-icon">${b.phase === 'won' ? '⚑' : '◇'}</div><h2>${STAGES[stage].name}</h2><p>${b.round} AT · 생존 ${b.units.filter(u => u.team === 'ally' && u.hp > 0).length}명</p><p>${b.phase === 'won' ? `첫 승리 기록 및 보상 저장 완료 · 자금 ${campaign.gold} G` : '편성과 장비를 바꿔 다시 도전하세요.'}</p>${b.phase === 'won' ? btn('next-stage', campaign.unlocked === 3 ? '마지막 이야기 →' : '원정 계속 →') : btn('restart', '전투 다시 시작')}${btn('world', '월드맵으로')}</section>`;
    if (screen === 'ending')
        content = `<section class="result paper">${title('CHAPTER I · COMPLETE', '돌아온 은빛 여명')}<p>성채의 종이 다시 울립니다.<br>원정대가 지켜낸 길 위로, 새로운 아침이 번집니다.</p><h2>세 거점을 모두 해방했습니다.</h2><p>원정 기록이 저장되었습니다. 완료한 전투는 월드맵에서 다시 즐길 수 있습니다.</p>${btn('world', '엘더베일로 돌아가기')}${btn('new', '새 원정 시작')}</section>`;
    const hints = `<footer><span>${formatKey('up')} ${formatKey('down')} 선택</span><span><kbd>${formatKey('confirm')}</kbd> 확인 / 패드 ${input.bindings.buttons.confirm}</span><span><kbd>${formatKey('cancel')}</kbd> 뒤로 / 패드 ${input.bindings.buttons.cancel}</span><span><kbd>${formatKey('menu')}</kbd> 메뉴</span>${screen === 'battle' ? `<span>${formatKey('previous')}/${formatKey('next')} 유닛 · ${formatKey('view')} 시점 · ${['cameraUp','cameraLeft','cameraDown','cameraRight'].map(a=>formatKey(a as Action)).join('/')} 카메라 · ${formatKey('zoomOut')}/${formatKey('zoomIn')} 줌</span>` : ''}<small>${escape(notice)}</small></footer>`;
    ui.innerHTML = `<div class="screen-content" ${modal ? 'inert' : ''}>${content}</div>${hints}${modal ? modalUI() : ''}`;
    ui.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.onclick = () => execute(button.dataset.id!); button.onfocus = () => { focusIndex = buttons().indexOf(button); }; });
    const all = buttons();
    const restored = all.find(el => el.dataset.id === old);
    if (restored)
        restored.focus({ preventScroll: true });
    else
        focusAt(Math.min(focusIndex, all.length - 1));
    announcer.textContent = notice;
    renderer.portraits(ui, campaign.gear);
}
function targetPanel() {
    const u = unit()!, ts = targets(battle!, u, command), t = ts[targetIndex];
    if (!t)
        return '<p>대상이 없습니다.</p>' + btn('back-command', '돌아가기');
    const ability = commandAbility(u, command), heal = ability.effect !== 'damage';
    return `<div class="target-pair"><div>${portrait(u.hero,u.weaponVariant)}<small>${u.name}</small><b>${u.hp} HP</b></div><span>→</span><div>${portrait(t.hero,t.weaponVariant)}<small>${t.name}</small><b>${t.hp} HP</b></div></div><p>← → 대상 ${targetIndex + 1} / ${ts.length}</p><h3>${t.name}</h3><strong class="damage">${heal ? '+' : '−'}${damage(battle!, u, t, command)} ${ability.effect==='guard'?'DEF':ability.effect==='mp'?'MP':ability.effect==='tp'?'TP':'HP'}</strong><p>명중 ${accuracy(battle!, u, t, command)}%${ability.radius ? (heal?' · 인접 아군 효과':' · 인접 적 범위 피해') : ''}</p>${btn('target-confirm', '행동 확정')}${btn('back-command', '명령으로 돌아가기')}`;
}
function equipmentUI(stats:ReturnType<typeof derive>){
 const gear=campaign.gear[hero],base=derive(hero,classLevel(campaign,hero),{weapon:0,armor:0},trainingFor(campaign,hero).supportId);
 const keys:(keyof Stats)[]=['str','vit','dex','agi','avd','int','mnd','res'];
 return `<div class="row">${HEROES.map((n,i)=>btn('hero-'+i,n)).join('')}</div><div class="equipment-columns"><section><h3>⚔ 주무기</h3>${[0,1].map(n=>btn('gear-weapon-'+n,`${weaponIcon(hero,n)}${weaponFor(hero,n).name} ${gear.weapon===n?'✓':''}<small>ATK +${n*5} · 사거리 ${JOBS[hero].range}</small>`,!canEquip(campaign,hero,'weapon',n))).join('')}</section><section><h3>▣ 몸 방어구</h3>${[0,1].map(n=>btn('gear-armor-'+n,`${itemIcon(ARMOR[n].id)}${n?'은빛 중갑':'여행 갑옷'} ${gear.armor===n?'✓':''}<small>${n?'DEF +4 · 저항 +5 · 이동 −1':'추가 보정 없음'}</small>`,!canEquip(campaign,hero,'armor',n))).join('')}</section></div><div class="equipment-extras">${(['offhand','armguard','accessory'] as const).map(slot=>{const list=EXTRA_GEAR[slot],n=gear[slot]??0,available=list.map((_,i)=>i).filter(i=>canEquip(campaign,hero,slot,i)),next=available[(available.indexOf(n)+1)%available.length]??n,item=list[n];return btn('gear-'+slot+'-'+next,`${itemIcon(item.id)} ↻ ${{offhand:'보조손',armguard:'팔 방어구',accessory:'장신구'}[slot]}<b>${item.name}</b><small>${item.description}</small>`,false,`aria-label="${item.name}, ${item.description}. 다음 장비 ${list[next].name}"`);}).join('')}</div><div class="stat-comparison"><small>${weaponFor(hero,gear.weapon).name} · ${ARMOR[gear.armor].name}<br>기초 + 직업·성장 + 장비 → 현재</small><div>${keys.map(key=>`<span>${key.toUpperCase()} <b>${stats.statBreakdown[key].base}+${stats.statBreakdown[key].class.toFixed(0)}+${stats.statBreakdown[key].gear} → <output data-stat="${key}">${stats.stats[key].toFixed(0)}</output></b></span>`).join('')}</div><p>ATK ${base.attack} → ${stats.attack} · DEF ${base.defense} → ${stats.defense} · 이동 ${base.move} → ${stats.move}</p></div><div class="row equipment-bottom">${btn('rig-settings','◇ 리그·파츠 불러오기')}${btn('shop','▣ 보급소·추가 장비')}${btn('party','편성으로 돌아가기')}</div>`;
}
function trainingUI(){const t=trainingFor(campaign,hero);return `<div class="row">${HEROES.map((n,i)=>btn('hero-'+i,n)).join('')}</div><h3>기술 학습 · SP ${t.sp}</h3><p>출전 대원은 첫 승리마다 SP12를 얻습니다. 새 기술 SP8 · 배운 기술 재장착 무료.</p>${(CLASS_ABILITIES[JOBS[hero].id]??[JOBS[hero].abilityId]).map(id=>{const a=abilityById(id);return btn('learn-'+id,`${a.name} ${t.abilityId===id?'✓':t.learned.includes(id)?'장착':'학습 8SP'}<small>${a.description}</small>`,!t.learned.includes(id)&&t.sp<8);}).join('')}<h3>지원 스킬 · 1슬롯</h3><div class="support-grid">${SUPPORT_SKILLS.map(a=>btn('support-'+a.id,`${a.name} ${t.supportId===a.id?'✓':''}<small>${a.description}</small>`)).join('')}</div>${btn('party','편성으로 돌아가기')}`;}
function modalUI() {
    let inner = '';
    if(modal==='trade'&&pendingTrade){const q=pendingTrade,p=productById(q.id)!;inner=`${title('TRANSACTION CONFIRMATION',q.kind==='buy'?'구매 확인':'판매 확인')}<div class="trade-preview">${itemIcon(p.id,true)}<h2>${p.name} ×${q.quantity}</h2><p>${(q.kind==='buy'?p.price:Math.floor(p.price/2))*q.quantity} G · 현재 ${campaign.gold} G</p></div>${btn('trade-cancel','취소하고 돌아가기')}${btn('trade-confirm','거래 확정')}`;}
    if (modal === 'pause')
        inner = `${title('EXPEDITION PAUSED', '잠시 쉬어가기')}${btn('resume', '계속하기')}${btn('save', '원정 기록 저장')}${btn('settings', '입력 설정')}${btn('help', '전술 안내')}${screen === 'battle' ? btn('finish-turn', '현재 AT 종료', battle?.phase !== 'ally' || mode === 'animating' || mode === 'walking') + btn('restart', '현 전투 다시 시작') : ''}${btn('world', '월드맵으로')}${btn('title', '타이틀로')}`;
    if (modal === 'help')
        inner = `${title('FIELD MANUAL', '전술 안내')}<p>① 월드맵에서 거점을 고르고 세 명을 편성합니다.<br>② RT가 0이 된 유닛을 Q/E 또는 확인으로 선택합니다.<br>③ 이동 1회·행동 1회·별도 기술(결의) 1회를 원하는 순서로 수행합니다.<br>④ AT 종료에서 방향을 확정하면 다음 유닛으로 넘어갑니다. 이동·행동을 생략하면 다음 차례가 빨라집니다.</p><p>높이차 1까지 오르내립니다(궁수 2). 수면·성벽·다른 유닛은 통과할 수 없습니다. 공격 전 예상 피해를 확인하세요. 마도사 기술은 인접 적에게도 피해를 주고, 치유사는 아군을 회복합니다.</p><p>V / 패드 3: 등각↔Top view<br>IJKL / 오른쪽 스틱: 카메라 · −/+ / 트리거: 줌 · R / R3: 복원<br>게임은 브라우저 Gamepad API 표준 매핑을 사용합니다.</p>${btn('close', '돌아가기')}`;
    if (modal === 'settings')
        inner = `${title('INPUT & ACCESSIBILITY', '입력 설정')}<p>${input.capture ? `<strong>「${LABELS[input.capture.action]}」에 사용할 ${input.capture.kind === 'keys' ? '키' : '패드 버튼'}를 누르세요. Esc / 패드 Back(8): 취소</strong>` : '변경할 입력을 선택하세요. 중복 입력은 기존 동작과 교환됩니다.'}</p><div class="bindings">${ACTIONS.slice(settingsOffset, settingsOffset + 9).map(a => `<div><span>${LABELS[a]}</span>${btn('bind-keys-' + ACTIONS.indexOf(a), escape(input.bindings.keys[a]))}${btn('bind-buttons-' + ACTIONS.indexOf(a), input.bindings.buttons[a] < 0 ? '오른쪽 스틱' : '패드 ' + input.bindings.buttons[a])}</div>`).join('')}</div><div class="row">${btn('settings-prev', '기본 동작', settingsOffset === 0)}${btn('settings-next', '카메라 / 시점', settingsOffset !== 0)}</div><div class="row">${btn('defaults', '기본값 복원')}${btn('close', '저장하고 돌아가기')}</div><small>왼쪽 스틱: 선택 · 오른쪽 스틱: 카메라 · Deadzone 0.30 · 재설정 취소: Back(8)<br>표준 브라우저 Gamepad 매핑. 비표준 장치는 버튼을 직접 지정하세요.</small>`;
    if(modal==='rig') inner=`${title('CHARACTER RIG','리그와 파츠')}<p>리깅 도구에서 저장한 v2 JSON과 참조하는 모든 PNG를 함께 선택하세요. 앞·뒤 이미지와 개별 교체 파츠를 그대로 재생합니다.</p><p>기본 캐릭터는 SD 프레임 애니메이션입니다. 가져온 리그는 모든 대원에게 적용되며 이 브라우저에 저장됩니다. 무기 그립은 오른팔 아래쪽 손 위치를 따릅니다.</p>${btn('rig-load','JSON + 이미지 불러오기')}${btn('rig-reset','SD 프레임 캐릭터로 복원')}${btn('close','돌아가기')}`;
    return `<div class="modal-shade"><section class="modal paper" role="dialog" aria-modal="true" aria-label="${modal === 'settings' ? '입력 설정' : modal === 'help' ? '전술 안내' : modal === 'rig' ? '리그와 파츠' : '일시정지'}">${inner}</section></div>`;
}
window.addEventListener('keydown', e => {
    if (e.code === 'Tab' && modal) {
        e.preventDefault();
        focusAt(focusIndex + (e.shiftKey ? -1 : 1));
    }
});
renderer.canvas.addEventListener('click', e => {
    if (screen !== 'battle' || modal)
        return;
    const p = renderer.pick(e.clientX, e.clientY, visual());
    if (p) {
        cursor = p;
        onAction('confirm');
        render();
    }
});
function visual(): VisualState { return { command, battle: screen === 'battle' ? battle : screen==='dialogue'?storyBattle:null, cursor, selected, mode, top:screen==='dialogue'?false:top, zoom:screen==='dialogue'?.78:zoom, pan:screen==='dialogue'?{x:160,y:-145}:pan, paused: Boolean(modal) }; }
function frame(now: number) {
    input.tick(now);
    if (pendingMove && !modal && now >= pendingMove) {
        pendingMove = 0;
        mode = 'command';
        render();
    }
    if (pendingEnd && !modal && now >= pendingEnd) {
        pendingEnd = 0, pendingMove = 0;
        outcome();
        if (screen === 'battle') {
            mode = selected ? 'command' : 'select';
            origin = null;
            render();
        }
    }
    if (screen === 'battle' && battle?.phase === 'enemy' && !modal && !pendingEnd && now >= enemyDue) {
        const action = enemyTurn(battle);
        const duration = Math.max(0, (action?.path.length ?? 1) - 1) * 160;
        if (action?.path.length)
            renderer.move(action.id, action.path);
        if (action?.attacked)
            renderer.attack(action.id, 'attack', duration / 1000);
        enemyDue = now + duration + 720;
        pendingEnd = enemyDue;
        if ((battle.phase as string) === 'ally') {
            const next = activeUnit(battle);
            cursor = { x: next.x, y: next.y };
            selected = null;
            mode = 'select';
            moved = false;
        }
        mode = 'animating';
        outcome();
        render();
    }
    renderer.draw(visual(), now);
    requestAnimationFrame(frame);
}
// Read-only diagnostics enable assertions and tactical test planning, never state mutation.
Object.assign(window, { tacticsDiagnostics: () => structuredClone({ screen, mode, modal, campaign, battle, selected, cursor, top, zoom, pan, bindings: input.bindings, dimensions: renderer.dimensions }) });
const rigPicker=document.createElement('input');rigPicker.type='file';rigPicker.multiple=true;rigPicker.accept='.json,image/png,image/jpeg,image/webp';rigPicker.id='game-rig-files';rigPicker.hidden=true;root.append(rigPicker);
async function applyBundle(bundle:RigBundle){const primary=bundle.rig.views.Front.image;if(!primary)throw Error('앞면 이미지가 필요합니다.');await renderer.setRig(bundle.rig,bundle.images[primary.id],bundle.images);}
rigPicker.onchange=async()=>{try{const bundle=await readRigFiles(Array.from(rigPicker.files??[]));await applyBundle(bundle);await storedRig(bundle);notice='리그와 교체 파츠를 적용하고 저장했습니다.';}catch(error){notice=error instanceof Error?error.message:'리그 불러오기 실패';}finally{rigPicker.value='';render();}};
storedRig().then(async bundle=>{if(bundle){await applyBundle(bundle);render();}}).catch(()=>{notice='저장된 사용자 리그를 불러오지 못해 기본 리그를 사용합니다.';render();});
render();
requestAnimationFrame(frame);
function shopUI(){
 const stock=inventoryFor(campaign), list=PRODUCTS.filter(p=>shopFilter==='all'||p.slot===shopFilter), pages=Math.ceil(list.length/6);shopPage=Math.min(shopPage,pages-1);
 const p=productById(shopId)??list[0],q={kind:shopKind,id:p.id,quantity:shopQty},reason=tradeReason(campaign,q),equipped=equippedCount(campaign,p.id),price=shopKind==='buy'?p.price:Math.floor(p.price/2);
 const compatible=p.slot==='weapon'?WEAPONS.filter(w=>w.family===JOBS[hero].weaponFamily).findIndex(w=>w.id===p.id):p.slot==='armor'?ARMOR.findIndex(x=>x.id===p.id):p.slot==='consumable'?-1:EXTRA_GEAR[p.slot].findIndex(x=>x.id===p.id);
 return `<section class="shop paper">${title('ELDERVALE · QUARTERMASTER','원정 보급소')}<div class="shop-toolbar"><b data-gold>${campaign.gold.toLocaleString()} G</b>${btn('shop-buy','구매',false,`aria-pressed="${shopKind==='buy'}"`)}${btn('shop-sell','판매',false,`aria-pressed="${shopKind==='sell'}"`)}${btn('catalog','원문 도감 1,170')}${btn('world','월드맵')}</div><div class="shop-filters">${(['all','weapon','armor','offhand','armguard','accessory','consumable'] as const).map(k=>btn('filter-'+k,k==='all'?'전체 '+PRODUCTS.length:SLOT_NAMES[k],false,`aria-pressed="${shopFilter===k}"`)).join('')}</div><div class="shop-layout"><div class="shop-list">${list.slice(shopPage*6,shopPage*6+6).map(item=>btn('product-'+item.id,`${itemIcon(item.id)}<span><b>${item.name}</b><small>${SLOT_NAMES[item.slot]} · 보유 ${stock[item.id]??0} / 장착 ${equippedCount(campaign,item.id)}</small></span><strong>${shopKind==='buy'?item.price:Math.floor(item.price/2)} G${campaign.unlocked<item.unlock?' 🔒':''}</strong>`,false,`aria-pressed="${shopId===item.id}"`)).join('')}<div class="row shop-pages">${btn('shop-prev','← 이전',shopPage===0)}<span>${shopPage+1} / ${pages}</span>${btn('shop-next','다음 →',shopPage===pages-1)}</div></div><aside class="shop-detail"><div class="item-heading">${itemIcon(p.id,true)}<div><small>${SLOT_NAMES[p.slot]} · ${p.source?'One Vision 참고':'TacticsSD 창작'}</small><h2>${p.name}</h2><span>${p.source?.sourceName??'SILVER DAWN'}</span></div></div><p class="item-effect">${p.description}</p><p>보유 <b data-owned>${stock[p.id]??0}</b> · 장착 ${equipped} · 판매 가능 ${Math.max(0,(stock[p.id]??0)-equipped)}</p><div class="source-note">${p.source?`원문 #${p.source.sourceId} · ${p.source.source.price} G · ${p.source.source.level?'Lv.'+p.source.source.level:'레벨 조건 없음'}<br>게임 가격 = 원문 ÷10 올림 · ${p.unlock?'첫 거점 해방 후 입고':'현재 입고'}<br>${p.slot==='consumable'?'현재 URL의 회복식 적용. PDF의 과거 개정 수치는 별도 기록.':'능력치÷4·DEF÷6·무기ATK÷8 올림. 방어구는 게임 내 전직업 공용. 원소·종족·중량·방패공격은 미적용.'}`:'이름·효과·가격은 소규모 캠페인용 창작값입니다.'}</div><div class="quantity">${btn('qty-down10','−10',shopQty<=1)}${btn('qty-down','−',shopQty<=1)}<output aria-label="거래 수량">${shopQty}</output>${btn('qty-up','+',shopQty>=99)}${btn('qty-up10','+10',shopQty>=99)}</div>${btn('trade-request',`${shopKind==='buy'?'구매':'판매'} 확인 · ${price*shopQty} G`,Boolean(reason))}<p class="trade-reason" role="status">${reason||'확인 화면에서 거래를 확정합니다. 자동 저장됩니다.'}</p>${p.slot!=='consumable'?`<div class="row equip-at-shop">${btn('shop-hero','대원 ↻ '+HEROES[hero])}${btn('shop-equip','장착',compatible<0||!canEquip(campaign,hero,p.slot,compatible))}</div>`:'<p class="supply-note">승리 시 사용량이 저장됩니다. 재도전은 출전 전 보급량으로 복원합니다.</p>'}</aside></div></section>`;
}
function catalogUI(){
 const list=sourceCatalog.filter(i=>i.group===catalogGroup),pages=Math.ceil(list.length/8);catalogPage=Math.min(catalogPage,pages-1);
 return `<section class="shop paper catalog">${title('ONE VISION · SOURCE REFERENCE','원문 아이템 도감')}<p>원문 1,170행 중 28개를 게임에 적용했습니다. 나머지 1,142개는 참고 항목이며 구매·장착할 수 없습니다.</p><div class="row">${(['weapons','armor','sundries'] as const).map((k,i)=>btn('catalog-group-'+k,['무기445','방어구172','기타553'][i])).join('')}${btn('shop','상점으로')}</div><div class="catalog-rows">${list.slice(catalogPage*8,catalogPage*8+8).map(i=>`<div><span>#${i.sourceId}</span><b>${escape(i.name)}</b><span>${i.price.toLocaleString()} G (원문)</span><small>${i.registered?'일부 효과 적용 · 상점 등록':'참고 전용 · 구매 불가'}</small></div>`).join('')}</div><div class="row">${btn('catalog-first','처음',catalogPage===0)}${btn('catalog-prev10','−10쪽',catalogPage===0)}${btn('catalog-prev','이전',catalogPage===0)}<b>${catalogPage+1} / ${pages}</b>${btn('catalog-next','다음',catalogPage===pages-1)}${btn('catalog-next10','+10쪽',catalogPage===pages-1)}</div><p class="source-note">출처: ogre-db.github.io/one-vision/${catalogGroup}.html · Readme v1.11d PDF의 개정 이력과 현재 URL 표는 버전을 구분합니다.<br>원본 효과·직업조건·가격 및 행별 미등록 사유: docs/game/reference · 전체 구현 완료를 의미하지 않습니다.</p></section>`;
}
