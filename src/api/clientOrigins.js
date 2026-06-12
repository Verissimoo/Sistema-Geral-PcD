import { createStore } from "./store";

const store = createStore("pcd_client_origins");

export const listClientOrigins = store.list;
export const createClientOrigin = store.create;
export const updateClientOrigin = store.update;
export const deleteClientOrigin = store.remove;
