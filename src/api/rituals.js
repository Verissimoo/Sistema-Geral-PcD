import { createStore } from "./store";

const store = createStore("rituals", "created_at");

export const listRituals = store.list;
export const getRitual = store.get;
export const createRitual = store.create;
export const updateRitual = store.update;
export const deleteRitual = store.remove;
export const filterRituals = store.filter;
