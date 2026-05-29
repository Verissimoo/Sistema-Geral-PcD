---
name: design-system-tokens
description: Sistema de design (tema escuro padrão, tokens semânticos) e regras de refatoração visual do sistema PCD
metadata:
  type: project
---

Reformulação visual iniciada em 2026-05-29: tema **escuro como padrão**, vermelho institucional PCD (`--brand-red`) como ação primária, azul (`--accent-blue`) como detalhe, branco como texto. Tema claro preservado como `.theme-light` (secundário). Objetivo: deixar de parecer "feito por IA".

**Arquitetura de tokens** (em [index.css](../src/index.css)):
- Tokens semânticos novos são a fonte da verdade: `--bg-base/surface/elevated/overlay`, `--text-primary/secondary/muted/disabled`, `--brand-red(-hover/-subtle)`, `--accent-blue(-hover/-subtle)`, `--success/warning/danger/info(-subtle)`, `--border-subtle/default/strong`.
- Os tokens shadcn (`--background`, `--card`, `--primary`, `--border`, etc.) são **apelidos** que apontam via `var()` para os novos. Por isso todo componente shadcn re-tematiza automaticamente.
- `:root, .theme-dark` = paleta escura; `.theme-light` = paleta clara. Trocar a classe no `<html>` propaga tudo pela cascata.

**Classes Tailwind** (em [tailwind.config.js](../tailwind.config.js)): `bg-bg-surface`, `text-text-primary`, `bg-brand`, `text-accent`, `bg-success-subtle`, `border-border-subtle`, etc. ATENÇÃO: a cor Tailwind `accent` agora = **azul** (não mais o cinza neutro do shadcn). Hovers neutros de menus usam `bg-muted`/`bg-bg-elevated`.

**Tema**: [ThemeContext.jsx](../src/lib/ThemeContext.jsx) (default 'dark', salva em localStorage `pcd_theme`) + [ThemeToggle.jsx](../src/components/ThemeToggle.jsx) no header. Script anti-flash no index.html.

**Regras de refatoração de telas** (Etapa 6 do brief): `bg-white`→`bg-bg-surface`, `text-slate-900`→`text-text-primary`, `border-slate-200`→`border-border`, gradientes coloridos→`bg-*-subtle`, `font-black`→`font-semibold`, `rounded-xl/2xl`→`rounded-md/lg`, `shadow-lg/xl`→`shadow-sm/md`, sem `hover:scale-*`, sem emojis decorativos, KPIs com `tabular-nums`. Badges de status via `<Badge variant="accent|warning|success|brand|danger">`.

**Status**: Etapas 1-5 (tokens, tailwind, provider/toggle, componentes UI base, layout/sidebar) + [Dashboard.jsx](../src/pages/Dashboard.jsx) (exemplar) FEITAS. Restam ~31 páginas com cores hardcoded (~1900 ocorrências) a refatorar uma a uma — usar Dashboard como referência. PDF ([generateQuoteHTML.js](../src/lib/generateQuoteHTML.js)) NÃO entra no tema escuro (continua branco para impressão).
