import { createStore } from "./store";

const partnersStore = createStore("pcd_partners");
const companiesStore = createStore("pcd_partner_companies");

export const listPartners = partnersStore.list;
export const getPartner = partnersStore.get;
export const createPartner = partnersStore.create;
export const updatePartner = partnersStore.update;
export const deletePartner = partnersStore.remove;

export const listPartnerCompanies = companiesStore.list;
export const getPartnerCompany = companiesStore.get;
export const createPartnerCompany = companiesStore.create;
export const updatePartnerCompany = companiesStore.update;
export const deletePartnerCompany = companiesStore.remove;
