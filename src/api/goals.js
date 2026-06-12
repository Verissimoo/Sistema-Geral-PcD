import { createStore } from "./store";

const store = createStore("pcd_commercial_goals");

export const listGoals = store.list;
export const getGoal = store.get;
export const createGoal = store.create;
export const updateGoal = store.update;
export const deleteGoal = store.remove;
