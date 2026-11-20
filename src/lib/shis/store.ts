import { create } from "zustand";
import { buildAlert, studentById, type Action, type NoticeKind, type ParentAck, type Symptom, type Visit } from "@/lib/shis/model";
import { openChild, openRoom, sealVault, sealVisit, type SealedStudent, type SealedVisit } from "@/lib/shis/vault";

type LogInput = {
  studentId: string;
  symptoms: Symptom[];
  temp: string;
  action: Action;
  notes: string;
  noticeKind: NoticeKind;
};

type ShisState = {
  ready: boolean;
  unlocked: boolean;
  visits: Visit[];
  students: SealedStudent[];
  sealedVisits: SealedVisit[];
  bootstrap: () => Promise<void>;
  unlockRoom: (code: string) => Promise<boolean>;
  lockRoom: () => void;
  openChild: (
    studentId: string,
    code: string,
  ) => Promise<{ classSection: string; visits: Visit[] } | null>;
  logVisit: (input: LogInput) => Promise<string>;
  updateAlert: (id: string, text: string) => Promise<void>;
  setAlertStatus: (id: string, status: Visit["alertStatus"]) => Promise<void>;
  setAck: (id: string, ack: ParentAck, studentId: string, code: string) => Promise<Visit[] | null>;
  reset: () => Promise<void>;
};

const dataKeys = new Map<string, CryptoKey>();
let childKeys = new Map<string, CryptoKey>();
let boot: Promise<void> | null = null;

async function reseal(visit: Visit) {
  const key = dataKeys.get(visit.studentId) ?? childKeys.get(visit.studentId);
  if (!key) return null;
  return sealVisit(key, visit);
}

export const useShis = create<ShisState>((set, get) => ({
  ready: false,
  unlocked: false,
  visits: [],
  students: [],
  sealedVisits: [],
  bootstrap: () => {
    if (get().ready) return Promise.resolve();
    boot ??= sealVault()
      .then((vault) => {
        set({ ready: true, students: vault.students, sealedVisits: vault.visits, visits: [], unlocked: false });
      })
      .catch((error) => {
        boot = null;
        throw error;
      });
    return boot;
  },
  unlockRoom: async (code) => {
    const opened = await openRoom(code.trim(), get().students, get().sealedVisits);
    if (!opened) return false;
    dataKeys.clear();
    for (const [id, key] of opened.keys) dataKeys.set(id, key);
    set({ unlocked: true, visits: opened.visits });
    return true;
  },
  lockRoom: () => {
    dataKeys.clear();
    set({ unlocked: false, visits: [] });
  },
  openChild: async (studentId, code) => {
    const opened = await openChild(studentId, code, get().students, get().sealedVisits);
    if (!opened) return null;
    childKeys.set(studentId, opened.dataKey);
    return { classSection: opened.classSection, visits: opened.visits };
  },
  logVisit: async (input) => {
    const student = studentById(input.studentId);
    const key = dataKeys.get(input.studentId);
    if (!student || !key) return "";
    const id = `v-${Date.now()}`;
    const visit: Visit = {
      id,
      at: new Date().toISOString(),
      alertStatus: "draft",
      alertText: "",
      ack: "none",
      classSection: student.classSection,
      ...input,
    };
    visit.alertText = buildAlert(student, visit);
    const sealed = await sealVisit(key, visit);
    set({
      visits: [visit, ...get().visits],
      sealedVisits: [sealed, ...get().sealedVisits],
    });
    return id;
  },
  updateAlert: async (id, text) => {
    const current = get().visits.find((visit) => visit.id === id);
    if (!current) return;
    const next = { ...current, alertText: text };
    const sealed = await reseal(next);
    set({
      visits: get().visits.map((visit) => (visit.id === id ? next : visit)),
      sealedVisits: sealed
        ? get().sealedVisits.map((visit) => (visit.id === id ? sealed : visit))
        : get().sealedVisits,
    });
  },
  setAlertStatus: async (id, status) => {
    const current = get().visits.find((visit) => visit.id === id);
    if (!current) return;
    const next = { ...current, alertStatus: status };
    const sealed = await reseal(next);
    set({
      visits: get().visits.map((visit) => (visit.id === id ? next : visit)),
      sealedVisits: sealed
        ? get().sealedVisits.map((visit) => (visit.id === id ? sealed : visit))
        : get().sealedVisits,
    });
  },
  setAck: async (id, ack, studentId, code) => {
    const opened = await openChild(studentId, code, get().students, get().sealedVisits);
    if (!opened) return null;
    childKeys.set(studentId, opened.dataKey);
    const nextVisits = opened.visits.map((visit) => (visit.id === id ? { ...visit, ack } : visit));
    const changed = nextVisits.find((visit) => visit.id === id);
    if (!changed) return nextVisits;
    const sealed = await sealVisit(opened.dataKey, changed);
    set({
      sealedVisits: get().sealedVisits.map((visit) => (visit.id === id ? sealed : visit)),
      visits: get().unlocked
        ? get().visits.map((visit) => (visit.id === id ? changed : visit))
        : get().visits,
    });
    return nextVisits;
  },
  reset: async () => {
    dataKeys.clear();
    childKeys = new Map();
    boot = null;
    const vault = await sealVault();
    boot = Promise.resolve();
    set({
      ready: true,
      unlocked: false,
      visits: [],
      students: vault.students,
      sealedVisits: vault.visits,
    });
  },
}));
