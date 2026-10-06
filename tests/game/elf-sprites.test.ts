import { describe, it, expect } from 'vitest';
import { elfDirection, elfFrame, elfPose, elfSocket, ELF_STATES, ELF_ANCHOR } from '../../game/elf-sprites';
import atlas from '../../game/assets/elf-sd-sheet-v2/frames.json';
import pkg from '../../package.json';

describe('normalized 26-pose atlas contracts', () => {
    it('maps four directions to front/back art and mirrors the same attachments', () => {
        expect(elfDirection('SE')).toEqual({ view: 'front', flip: false });
        expect(elfDirection('SW')).toEqual({ view: 'front', flip: true });
        expect(elfDirection('NE')).toEqual({ view: 'back', flip: false });
        expect(elfDirection('NW')).toEqual({ view: 'back', flip: true });
        for (const state of ELF_STATES) for (let frame = 0; frame < atlas.sequences.front[state].length; frame++) {
            expect(elfSocket('SE', { state, frame })).toEqual(elfSocket('SW', { state, frame }));
            expect(elfSocket('NE', { state, frame })).toEqual(elfSocket('NW', { state, frame }));
        }
    });
    it('uses the same five attack poses for every weapon family and healing', () => {
        for (const motion of ['slash', 'thrust', 'shoot', 'cast', 'heal']) {
            const poses = Array.from({ length: 7 }, (_, i) => elfPose('SE', elfFrame(0, false, (i + .1) / 7, motion, 0)).semantic);
            expect(poses).toEqual(['idle', 'attack1', 'attack2', 'attack3', 'attack4', 'attack5', 'idle']);
        }
    });
    it('uses jump3 then jump2 for items, preserving authored airborne offsets', () => {
        for (const dir of ['SE', 'NE'] as const) {
            const poses = Array.from({ length: 4 }, (_, i) => elfPose(dir, elfFrame(0, false, (i + .1) / 4, 'item', 0)));
            expect(poses.map(f => f.semantic)).toEqual(['idle', 'jump3', 'jump2', 'idle']);
            expect(poses.map(f => f.airborneOffsetY)).toEqual([0, -30, -20, 0]);
        }
    });
    it('cycles walking, prioritizes hurt, and returns to in-place walking after actions', () => {
        expect([0, 1, 2, 3, 4].map(i => elfPose('SE', elfFrame(i / 9 + .001, true, 1, '', 0)).semantic)).toEqual(['idle', 'walk_right', 'idle', 'walk_left', 'idle']);
        expect(elfPose('NE', elfFrame(0, true, .5, 'slash', .5)).semantic).toBe('hurt');
        expect(elfFrame(3, false, 1, 'item', 0)).toEqual({ state: 'walk', frame: 3 });
        expect([0,1,2,3,4].map(i => elfPose('SE', elfFrame(i / 5 + .001, false, 1, '', 0)).semantic)).toEqual(['idle','walk_right','idle','walk_left','idle']);
        expect(elfPose('SE', elfFrame(0, false, .9, 'collapse', 0)).semantic).toBe('collapse');
    });
    it('addresses all 26 cells with a shared anchor, and never samples the two blanks', () => {
        expect(atlas.frames).toHaveLength(26);
        expect([atlas.width, atlas.height]).toEqual([1792, 1024]);
        expect(ELF_ANCHOR).toEqual({ x: 128, y: 230, cell: 256 });
        const visited = new Set<string>();
        for (const dir of ['SE', 'NE'] as const) for (const state of ELF_STATES) for (let frame = 0; frame < atlas.sequences.front[state].length; frame++) {
            const f = elfPose(dir, { state, frame }); visited.add(f.id);
            expect(f.anchor).toEqual({ x: 128, y: 230 });
            expect(f.rect).toEqual({ x: (f.column - 1) * 256, y: (f.row - 1) * 256, w: 256, h: 256 });
            expect(f.row < 3 || f.column < 7).toBe(true);
        }
        expect(visited.size).toBe(26);
        expect(atlas.character.flying).toBe(false);
    });
    it('attaches equipment to changing hands and hides rear idle gear behind the body', () => {
        for (const dir of ['SE', 'NE'] as const) {
            const windup = elfSocket(dir, { state: 'common_attack', frame: 2 });
            const swing = elfSocket(dir, { state: 'common_attack', frame: 3 });
            expect(windup.hand[1]).toBeLessThan(swing.hand[1] - 30);
        }
        expect(elfSocket('NE', { state: 'idle', frame: 0 }).behind).toBe(true);
        expect(elfSocket('SE', { state: 'idle', frame: 0 }).behind).toBe(false);
    });
    it('opens the real game on loopback and refuses an occupied launch port', () => {
        expect(pkg.scripts.game).toBe('vite --host 127.0.0.1 --port 5173 --strictPort --open /game/');
    });
});
