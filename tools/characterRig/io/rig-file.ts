import { CURRENT_SCHEMA_VERSION, rigSchema, type CharacterRigData } from '../domain/schema.ts';

/** Development policy: incompatible rig files are discarded, never migrated or coerced. */
export function parseRig(text: string): CharacterRigData {
  if (text.length > 2_000_000) throw new Error('JSON 파일이 너무 큽니다 (최대 2MB).');
  let input: unknown;
  try { input = JSON.parse(text); } catch { throw new Error('올바른 JSON 파일이 아닙니다. 현재 작업은 유지됩니다.'); }
  if (typeof input === 'object' && input && 'schemaVersion' in input && input.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`리그 파일의 버전이 지원되지 않습니다 (현재 v${CURRENT_SCHEMA_VERSION}). 개발 단계에서는 이전 파일을 변환하지 않습니다. 새 리그를 만들어 주세요. 현재 작업은 유지됩니다.`);
  }
  const result = rigSchema.safeParse(input);
  if (!result.success) throw new Error(`리그 형식 오류: ${result.error.issues.slice(0, 3).map(i => `${i.path.join('.')} ${i.message}`).join(' / ')}`);
  return result.data;
}
export function serializeRig(rig: CharacterRigData): string { return JSON.stringify(rigSchema.parse(rig), null, 2); }
