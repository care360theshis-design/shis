import { aesDecrypt, aesEncrypt, deriveKey, makeDataKey, randomSalt, unwrapDataKey, wrapDataKey } from "@/lib/shis/crypto";
import { seedVisits, STUDENTS, type Visit } from "@/lib/shis/model";

export const DEMO_ROOM_CODE = "SHIS-ROOM";
export const DEMO_PARENT_HINT = { id: "123456", code: "1234" };

const PARENT_CODES: Record<string, string> = {
  "STU-10482": "HEAR-10482",
  "STU-11003": "KITE-7712",
  "STU-10881": "LAMP-4401",
  "STU-12110": "MINT-2280",
  "STU-09014": "NEST-9033",
  "STU-09120": "OPAL-1184",
  "STU-09255": "PEAR-6620",
  "STU-09301": "QUILL-3055",
  "STU-15002": "RIVER-8841",
  "STU-15144": "SALT-2297",
  "STU-07088": "TIDE-5510",
  "STU-16020": "WILLOW-0176",
};

export type SealedStudent = {
  id: string;
  medicalSalt: string;
  medicalWrap: string;
  parentSalt: string;
  parentWrap: string;
  profileCipher: string;
};

export type SealedVisit = {
  id: string;
  studentId: string;
  cipher: string;
};

export type VaultBundle = {
  students: SealedStudent[];
  visits: SealedVisit[];
};

function saltText(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt));
}

function saltBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sealVault(): Promise<VaultBundle> {
  const roomSalt = randomSalt();
  const roomKey = await deriveKey(DEMO_ROOM_CODE, roomSalt);
  const roomSaltText = saltText(roomSalt);
  const dataKeys = new Map<string, CryptoKey>();
  const students: SealedStudent[] = [];

  for (const student of STUDENTS) {
    const parentCode = PARENT_CODES[student.id];
    if (!parentCode) throw new Error(`Missing parent code for ${student.id}`);
    const dataKey = await makeDataKey();
    const parentSalt = randomSalt();
    const parentKey = await deriveKey(parentCode, parentSalt);
    students.push({
      id: student.id,
      medicalSalt: roomSaltText,
      medicalWrap: await wrapDataKey(roomKey, dataKey),
      parentSalt: saltText(parentSalt),
      parentWrap: await wrapDataKey(parentKey, dataKey),
      profileCipher: await aesEncrypt(
        dataKey,
        JSON.stringify({ id: student.id, classSection: student.classSection }),
      ),
    });
    dataKeys.set(student.id, dataKey);
  }

  const visits: SealedVisit[] = [];
  for (const visit of seedVisits()) {
    const dataKey = dataKeys.get(visit.studentId);
    if (!dataKey) continue;
    visits.push({
      id: visit.id,
      studentId: visit.studentId,
      cipher: await aesEncrypt(dataKey, JSON.stringify(visit)),
    });
  }
  return { students, visits };
}

export async function openRoom(
  code: string,
  students: SealedStudent[],
  visits: SealedVisit[],
): Promise<{ keys: Map<string, CryptoKey>; visits: Visit[] } | null> {
  if (students.length === 0) return null;
  try {
    const roomKey = await deriveKey(code, saltBytes(students[0].medicalSalt));
    const keys = new Map<string, CryptoKey>();
    for (const student of students) {
      keys.set(student.id, await unwrapDataKey(roomKey, student.medicalWrap));
    }
    return { keys, visits: await decryptVisits(visits, keys) };
  } catch {
    return null;
  }
}

export async function openChild(
  studentId: string,
  code: string,
  students: SealedStudent[],
  visits: SealedVisit[],
): Promise<{ classSection: string; visits: Visit[]; dataKey: CryptoKey } | null> {
  const student = students.find((item) => item.id === studentId);
  if (!student || !code.trim()) return null;
  try {
    const parentKey = await deriveKey(code.trim(), saltBytes(student.parentSalt));
    const dataKey = await unwrapDataKey(parentKey, student.parentWrap);
    const profile = JSON.parse(await aesDecrypt(dataKey, student.profileCipher)) as {
      classSection: string;
    };
    const own = visits.filter((visit) => visit.studentId === student.id);
    const opened: Visit[] = [];
    for (const visit of own) opened.push(JSON.parse(await aesDecrypt(dataKey, visit.cipher)) as Visit);
    return { classSection: profile.classSection, visits: opened, dataKey };
  } catch {
    return null;
  }
}

export async function sealVisit(dataKey: CryptoKey, visit: Visit): Promise<SealedVisit> {
  return {
    id: visit.id,
    studentId: visit.studentId,
    cipher: await aesEncrypt(dataKey, JSON.stringify(visit)),
  };
}

async function decryptVisits(visits: SealedVisit[], keys: Map<string, CryptoKey>): Promise<Visit[]> {
  const opened: Visit[] = [];
  for (const visit of visits) {
    const key = keys.get(visit.studentId);
    if (!key) continue;
    opened.push(JSON.parse(await aesDecrypt(key, visit.cipher)) as Visit);
  }
  return opened;
}
