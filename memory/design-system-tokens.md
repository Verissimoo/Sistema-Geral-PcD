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

**Status**: Fundação (tokens, tailwind, provider/toggle, UI base, layout/sidebar) + Dashboard FEITAS. **Auditoria visual completa concluída**: varredura global converteu TODAS as cores hardcoded (~1900) em tokens via word-boundary sed — zero `text/bg/border/ring/shadow-{cor}-N` literais, zero `font-black`, zero `bg-gradient` no `src`. Botão ganhou variante `success`. Heros slate-900/navy achatados para `bg-[#0B1E3D]` ou `bg-bg-elevated`; overlays translúcidos `bg-white/10` preservados sobre blocos navy; `text-white` em bg adaptativo corrigido para não sumir no tema claro.

**Mapa de conversão usado** (regra fixa): neutros slate/gray → text-text-*/border-border/bg-bg-*; amber/yellow/orange → warning; green/emerald → success; red/rose → danger; blue/sky/purple/pink → accent. Subtle = `bg-{token}/10` + `border-{token}/30`; sólido só em barras/dots/botões/ícones. Princípio: hierarquia por luminosidade (bg-base < surface < elevated), cor só para semântica.

**Pendências menores (não-bloqueantes)**: QA visual real das 21 rotas não foi feito (sem render); alguns emojis decorativos (🛫⚡) remanescentes; `text-text-muted` em blocos navy tem contraste reduzido no tema claro. PDF ([generateQuoteHTML.js](../src/lib/generateQuoteHTML.js)) permanece branco (correto para impressão).
