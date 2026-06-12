---
name: pricing-model
description: Modelo de precificação do gerador de orçamento — modos, fonte da verdade e flags de cálculo
metadata:
  type: project
---

A precificação (Bloco 4 de [VendedorOrcamento.jsx](../src/pages/vendedor/VendedorOrcamento.jsx)) tem **fonte única da verdade** em [pricingCalculator.js](../src/lib/pricingCalculator.js) → `computePricingTotals` / `computeCommission`. O front recalcula em paralelo só para exibição; nunca confie em `pricing.nipon_value` salvo.

**Modos de emissão** (mutuamente exclusivos, exceto blocos extras):
- **Padrão**: bloco principal (campos diretos em `pricing`: type, miles_qty, tax, cost_brl/cost_brl_calc, cost_per_thousand, cash_part, is_azul) + **`pricing.extra_blocks[]`** (vários tipos de tarifa somados — feature "Adicionar tipo de emissão"). Custo/Nipon totais = soma de todos os blocos. Cada bloco tem `type` ∈ milhas | milhas_dinheiro | dinheiro.
- **Multi-programa** (`pricing.multi_program`): programa por trecho (ida/volta), `trechos_pricing[]`.
- **Quebra de Trecho** (`pricing.is_split`): emissão por segmento de voo, `trechos[]` + `total_cost`/`total_nipon`.

**Regra do Nipon (venda mínima)**: custo × 1.10, EXCETO Azul em milhas puro (× 1.0). **milhas_dinheiro sempre × 1.10** mesmo Azul (regra de negócio). Helper `emissionCostNipon(block)` centraliza isso por bloco.

**Flag `cost_is_total`** (por bloco, principal e extras): quando ligado, o valor digitado (custo + taxa + milhas/dinheiro) já é o TOTAL de todos os passageiros → multiplicador = 1 em vez de ×passageiros. Usado p/ Smiles etc. que cobram a tarifa cheia para todos juntos.

**Discrepância pré-existente conhecida**: para `type === "milhas"`, o front exibe Nipon baseado em `sale_per_thousand` (venda da tabela), mas o pricingCalculator (autoridade, usado em comissão) deriva Nipon de custo × 1.10. Não foi "corrigido" para não regredir comportamento esperado.

**Pendências menores**: cards de detalhe do orçamento mostram só o `type` do bloco principal (totais já somam extras corretamente); QuickPriceEditDialog preserva `extra_blocks`/`cost_is_total` (clona) mas não os edita; labels "por pessoa" do card principal ficam imprecisos quando `cost_is_total` ligado (o resumo consolidado mostra os totais corretos). Comissão usa carteira própria 30% / demais 25% + 45% do excedente sobre o Nipon.
