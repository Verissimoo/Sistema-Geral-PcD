// Hooks de dados por domínio (TanStack Query). Padrão:
//   - useQuery para leituras, com query keys do qk
//   - useMutation para escritas, invalidando as keys do domínio no onSuccess
// Erros são tratados centralmente (ver lib/query-client.js).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "./queryKeys";
import * as quotesApi from "./quotes";
import * as usersApi from "./users";
import * as clientsApi from "./clients";
import * as milesApi from "./miles";
import * as goalsApi from "./goals";
import * as partnersApi from "./partners";
import * as clientOriginsApi from "./clientOrigins";
import * as contractorsApi from "./contractors";
import * as projectsApi from "./projects";
import * as ritualsApi from "./rituals";

function useInvalidate(keys) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
}

// ─── Quotes ─────────────────────────────────────────────────────────
export function useQuotes(options = {}) {
  return useQuery({ queryKey: qk.quotes.list(), queryFn: quotesApi.listQuotes, ...options });
}
export function useQuote(id, options = {}) {
  return useQuery({
    queryKey: qk.quotes.detail(id),
    queryFn: () => quotesApi.getQuote(id),
    enabled: !!id,
    ...options,
  });
}
export function useCreateQuote() {
  const invalidate = useInvalidate([qk.quotes.all]);
  return useMutation({ mutationFn: quotesApi.createQuote, onSuccess: invalidate });
}
export function useUpdateQuote() {
  const invalidate = useInvalidate([qk.quotes.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => quotesApi.updateQuote(id, updates),
    onSuccess: invalidate,
  });
}
export function useDeleteQuote() {
  const invalidate = useInvalidate([qk.quotes.all]);
  return useMutation({ mutationFn: quotesApi.deleteQuote, onSuccess: invalidate });
}

// ─── Users ──────────────────────────────────────────────────────────
export function useUsers(options = {}) {
  return useQuery({ queryKey: qk.users.list(), queryFn: usersApi.listUsers, ...options });
}
export function useCreateUser() {
  const invalidate = useInvalidate([qk.users.all]);
  return useMutation({ mutationFn: usersApi.createUser, onSuccess: invalidate });
}
export function useUpdateUser() {
  const invalidate = useInvalidate([qk.users.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => usersApi.updateUser(id, updates),
    onSuccess: invalidate,
  });
}
export function useDeleteUser() {
  const invalidate = useInvalidate([qk.users.all]);
  return useMutation({ mutationFn: usersApi.deleteUser, onSuccess: invalidate });
}

// ─── Clients ────────────────────────────────────────────────────────
export function useClients(options = {}) {
  return useQuery({ queryKey: qk.clients.list(), queryFn: clientsApi.listClients, ...options });
}
export function useClient(id, options = {}) {
  return useQuery({
    queryKey: qk.clients.detail(id),
    queryFn: () => clientsApi.getClient(id),
    enabled: !!id,
    ...options,
  });
}
export function useCreateClient() {
  const invalidate = useInvalidate([qk.clients.all]);
  return useMutation({ mutationFn: clientsApi.createClient, onSuccess: invalidate });
}

// ─── Miles ──────────────────────────────────────────────────────────
export function useMilesTable(options = {}) {
  return useQuery({ queryKey: qk.miles.list(), queryFn: milesApi.listMiles, ...options });
}
export function useCreateMilesProgram() {
  const invalidate = useInvalidate([qk.miles.all]);
  return useMutation({ mutationFn: milesApi.createMilesProgram, onSuccess: invalidate });
}
export function useUpdateMilesProgram() {
  const invalidate = useInvalidate([qk.miles.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => milesApi.updateMilesProgram(id, updates),
    onSuccess: invalidate,
  });
}
export function useDeleteMilesProgram() {
  const invalidate = useInvalidate([qk.miles.all]);
  return useMutation({ mutationFn: milesApi.deleteMilesProgram, onSuccess: invalidate });
}

// ─── Commercial Goals ───────────────────────────────────────────────
export function useCommercialGoals(options = {}) {
  return useQuery({ queryKey: qk.goals.list(), queryFn: goalsApi.listGoals, ...options });
}
export function useCreateGoal() {
  const invalidate = useInvalidate([qk.goals.all]);
  return useMutation({ mutationFn: goalsApi.createGoal, onSuccess: invalidate });
}
export function useUpdateGoal() {
  const invalidate = useInvalidate([qk.goals.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => goalsApi.updateGoal(id, updates),
    onSuccess: invalidate,
  });
}
export function useDeleteGoal() {
  const invalidate = useInvalidate([qk.goals.all]);
  return useMutation({ mutationFn: goalsApi.deleteGoal, onSuccess: invalidate });
}

// ─── Partners + Partner Companies ───────────────────────────────────
export function usePartners(options = {}) {
  return useQuery({ queryKey: qk.partners.list(), queryFn: partnersApi.listPartners, ...options });
}
export function usePartner(id, options = {}) {
  return useQuery({
    queryKey: qk.partners.detail(id),
    queryFn: () => partnersApi.getPartner(id),
    enabled: !!id,
    ...options,
  });
}
export function useCreatePartner() {
  const invalidate = useInvalidate([qk.partners.all]);
  return useMutation({ mutationFn: partnersApi.createPartner, onSuccess: invalidate });
}
export function useUpdatePartner() {
  const invalidate = useInvalidate([qk.partners.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => partnersApi.updatePartner(id, updates),
    onSuccess: invalidate,
  });
}
export function usePartnerCompanies(options = {}) {
  return useQuery({
    queryKey: qk.partnerCompanies.list(),
    queryFn: partnersApi.listPartnerCompanies,
    ...options,
  });
}
export function usePartnerCompany(id, options = {}) {
  return useQuery({
    queryKey: qk.partnerCompanies.detail(id),
    queryFn: () => partnersApi.getPartnerCompany(id),
    enabled: !!id,
    ...options,
  });
}
export function useCreatePartnerCompany() {
  const invalidate = useInvalidate([qk.partnerCompanies.all]);
  return useMutation({ mutationFn: partnersApi.createPartnerCompany, onSuccess: invalidate });
}
export function useUpdatePartnerCompany() {
  const invalidate = useInvalidate([qk.partnerCompanies.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => partnersApi.updatePartnerCompany(id, updates),
    onSuccess: invalidate,
  });
}

// ─── Client Origins ─────────────────────────────────────────────────
export function useClientOriginsQuery(options = {}) {
  return useQuery({
    queryKey: qk.clientOrigins.list(),
    queryFn: clientOriginsApi.listClientOrigins,
    ...options,
  });
}
export function useCreateClientOrigin() {
  const invalidate = useInvalidate([qk.clientOrigins.all]);
  return useMutation({ mutationFn: clientOriginsApi.createClientOrigin, onSuccess: invalidate });
}
export function useUpdateClientOrigin() {
  const invalidate = useInvalidate([qk.clientOrigins.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => clientOriginsApi.updateClientOrigin(id, updates),
    onSuccess: invalidate,
  });
}
export function useDeleteClientOrigin() {
  const invalidate = useInvalidate([qk.clientOrigins.all]);
  return useMutation({ mutationFn: clientOriginsApi.deleteClientOrigin, onSuccess: invalidate });
}

// ─── Contractors / Projects / Rituals ───────────────────────────────
export function useContractors(options = {}) {
  return useQuery({
    queryKey: qk.contractors.list(),
    queryFn: contractorsApi.listContractors,
    ...options,
  });
}
export function useCreateContractor() {
  const invalidate = useInvalidate([qk.contractors.all]);
  return useMutation({ mutationFn: contractorsApi.createContractor, onSuccess: invalidate });
}
export function useUpdateContractor() {
  const invalidate = useInvalidate([qk.contractors.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => contractorsApi.updateContractor(id, updates),
    onSuccess: invalidate,
  });
}

export function useProjects(options = {}) {
  return useQuery({ queryKey: qk.projects.list(), queryFn: projectsApi.listProjects, ...options });
}
export function useCreateProject() {
  const invalidate = useInvalidate([qk.projects.all]);
  return useMutation({ mutationFn: projectsApi.createProject, onSuccess: invalidate });
}
export function useUpdateProject() {
  const invalidate = useInvalidate([qk.projects.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => projectsApi.updateProject(id, updates),
    onSuccess: invalidate,
  });
}

export function useRituals(options = {}) {
  return useQuery({ queryKey: qk.rituals.list(), queryFn: ritualsApi.listRituals, ...options });
}
export function useCreateRitual() {
  const invalidate = useInvalidate([qk.rituals.all]);
  return useMutation({ mutationFn: ritualsApi.createRitual, onSuccess: invalidate });
}
export function useUpdateRitual() {
  const invalidate = useInvalidate([qk.rituals.all]);
  return useMutation({
    mutationFn: ({ id, updates }) => ritualsApi.updateRitual(id, updates),
    onSuccess: invalidate,
  });
}
