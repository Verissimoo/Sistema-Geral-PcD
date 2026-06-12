import { createStore } from "./store";

const store = createStore("pcd_users");

export const listUsers = store.list;
export const getUser = store.get;
export const createUser = store.create;
export const updateUser = store.update;
export const deleteUser = store.remove;
