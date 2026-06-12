import { createStore } from "./store";

const store = createStore("pcd_miles_table", "updated_date");

export const listMiles = store.list;
export const getMilesProgram = store.get;
export const createMilesProgram = store.create;
export const updateMilesProgram = store.update;
export const deleteMilesProgram = store.remove;
