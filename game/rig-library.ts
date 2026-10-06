import { parseRig } from '../tools/characterRig/io/rig-file';
import type { CharacterRigData } from '../tools/characterRig/domain/rig';
export type RigBundle = {rig:CharacterRigData; images:Record<string,string>};
export async function readRigFiles(files:File[]):Promise<RigBundle> {
 const json=files.find(f=>f.name.endsWith('.json'));if(!json)throw Error('리그 JSON과 참조 이미지를 함께 선택하세요.');
 const rig=parseRig(await json.text()), images:Record<string,string>={};
 const refs=Object.values(rig.views).flatMap(v=>[v.image,...v.parts.map(p=>p.replacement)]).filter(Boolean);
 for(const ref of refs){if(!ref||images[ref.id])continue;const file=files.find(f=>f.name===ref.name);if(!file)throw Error(`이미지 누락: ${ref.name}. JSON과 모든 이미지를 함께 선택하세요.`);
 images[ref.id]=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error(file.name+' 읽기 실패'));reader.readAsDataURL(file);});}
 return {rig,images};
}
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('tacticssd-art',1);request.onupgradeneeded=()=>request.result.createObjectStore('rigs');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function storedRig(write?:RigBundle|null):Promise<RigBundle|undefined>{const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction('rigs',write===undefined?'readonly':'readwrite'),store=transaction.objectStore('rigs');const request=write===undefined?store.get('current'):write===null?store.delete('current'):store.put(write,'current');let value:RigBundle|undefined;request.onsuccess=()=>{value=write===undefined?request.result:undefined;};transaction.oncomplete=()=>{database.close();resolve(value);};transaction.onerror=()=>{database.close();reject(transaction.error);};});}
