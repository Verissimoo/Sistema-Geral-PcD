import { createStore } from "./store";

const store = createStore("projects", "created_at");

export const listProjects = store.list;
export const getProject = store.get;
export const createProject = store.create;
export const updateProject = store.update;
export const deleteProject = store.remove;
export const filterProjects = store.filter;
