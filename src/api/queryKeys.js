// Factory de query keys por domínio. Toda invalidação parte daqui — nunca
// montar arrays de key na mão nas páginas.
export const qk = {
  quotes: {
    all: ["quotes"],
    list: (f) => (f ? ["quotes", "list", f] : ["quotes", "list"]),
    detail: (id) => ["quotes", "detail", id],
  },
  clients: {
    all: ["clients"],
    list: (f) => (f ? ["clients", "list", f] : ["clients", "list"]),
    detail: (id) => ["clients", "detail", id],
  },
  users: {
    all: ["users"],
    list: () => ["users", "list"],
    detail: (id) => ["users", "detail", id],
  },
  miles: {
    all: ["miles"],
    list: () => ["miles", "list"],
  },
  goals: {
    all: ["goals"],
    list: () => ["goals", "list"],
  },
  partners: {
    all: ["partners"],
    list: () => ["partners", "list"],
    detail: (id) => ["partners", "detail", id],
  },
  partnerCompanies: {
    all: ["partnerCompanies"],
    list: () => ["partnerCompanies", "list"],
    detail: (id) => ["partnerCompanies", "detail", id],
  },
  clientOrigins: {
    all: ["clientOrigins"],
    list: () => ["clientOrigins", "list"],
  },
  contractors: {
    all: ["contractors"],
    list: () => ["contractors", "list"],
    detail: (id) => ["contractors", "detail", id],
  },
  projects: {
    all: ["projects"],
    list: () => ["projects", "list"],
  },
  rituals: {
    all: ["rituals"],
    list: () => ["rituals", "list"],
  },
};
