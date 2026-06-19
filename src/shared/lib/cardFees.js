// Taxas de cartão (adquirentes/modalidades/parcelas) + cálculo de parcela.
// Fonte ÚNICA — reusada pela calculadora de Ferramentas e pelo gerador de
// orçamento (opções de pagamento). Não duplicar a tabela em outro lugar.

export const PLATFORMS = [
  {
    name: 'Infinite Pay',
    modalities: [
      {
        name: 'Link de Pagamento',
        has_fixed_fee: false,
        fixed_fee_value: 0,
        rates: [
          { label: '1x', percentage: 2.29 }, { label: '2x', percentage: 3.18 },
          { label: '3x', percentage: 3.18 }, { label: '4x', percentage: 3.18 },
          { label: '5x', percentage: 3.18 }, { label: '6x', percentage: 3.18 },
          { label: '7x', percentage: 5.39 }, { label: '8x', percentage: 5.39 },
          { label: '9x', percentage: 5.39 }, { label: '10x', percentage: 5.39 },
          { label: '11x', percentage: 5.39 }, { label: '12x', percentage: 5.39 }
        ]
      },
      {
        name: 'Maquininha Smart',
        has_fixed_fee: false,
        fixed_fee_value: 0,
        rates: [
          { label: 'Débito', percentage: 0.75 }, { label: '1x', percentage: 2.69 },
          { label: '2x', percentage: 3.94 }, { label: '3x', percentage: 4.46 },
          { label: '4x', percentage: 4.98 }, { label: '5x', percentage: 5.49 },
          { label: '6x', percentage: 5.99 }, { label: '7x', percentage: 6.51 },
          { label: '8x', percentage: 6.99 }, { label: '9x', percentage: 7.51 },
          { label: '10x', percentage: 7.99 }, { label: '11x', percentage: 8.49 },
          { label: '12x', percentage: 8.99 }
        ]
      }
    ]
  },
  {
    name: 'Hyper Cash',
    modalities: [
      {
        name: 'Cartão',
        has_fixed_fee: true,
        fixed_fee_value: 1.50,
        rates: [
          { label: 'À vista', percentage: 4.20 }, { label: '2x', percentage: 5.87 },
          { label: '3x', percentage: 6.76 }, { label: '4x', percentage: 8.06 },
          { label: '5x', percentage: 9.38 }, { label: '6x', percentage: 9.67 },
          { label: '7x', percentage: 12.06 }, { label: '8x', percentage: 13.43 },
          { label: '9x', percentage: 14.81 }, { label: '10x', percentage: 16.22 },
          { label: '11x', percentage: 16.53 }, { label: '12x', percentage: 17.28 }
        ]
      }
    ]
  }
];

// Nº de parcelas a partir do label ("12x" → 12; "À vista"/"Débito"/"1x" → 1).
export function parseParcelas(label) {
  if (!label) return 1;
  if (label === 'Débito' || label === 'À vista') return 1;
  const m = String(label).match(/^(\d+)x$/);
  return m ? parseInt(m[1], 10) : 1;
}

// Cálculo de parcela do cartão — fórmula idêntica à da calculadora de Ferramentas:
// taxa = venda × %; total = venda + taxa (+ taxa fixa quando houver); parcela = total / nº.
export function calcInstallment(venda, ratePercentage, fixedFeeValue = 0, parcelaLabel = '1x') {
  const base = Number(venda) || 0;
  const taxaPct = Number(ratePercentage) || 0;
  const valorTaxa = (base * taxaPct) / 100;
  const totalComTaxa = base + valorTaxa + (Number(fixedFeeValue) || 0);
  const numParcelas = parseParcelas(parcelaLabel);
  const valorParcela = numParcelas > 0 ? totalComTaxa / numParcelas : totalComTaxa;
  return { valorTaxa, totalComTaxa, numParcelas, valorParcela, taxaPct };
}

// Helper para achar rate de uma adquirente/modalidade/parcela.
export function findRate(acquirerName, modalityName, parcelaLabel) {
  const acq = PLATFORMS.find((p) => p.name === acquirerName);
  const mod = acq?.modalities.find((m) => m.name === modalityName);
  const rate = mod?.rates.find((r) => r.label === parcelaLabel);
  return rate ? { rate, modality: mod } : null;
}
