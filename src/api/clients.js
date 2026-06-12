import { createStore } from "./store";

const store = createStore("pcd_clients");

export const listClients = store.list;
export const getClient = store.get;
export const createClient = store.create;
export const updateClient = store.update;
export const deleteClient = store.remove;
