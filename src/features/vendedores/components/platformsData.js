// ─── Dados de Plataformas de Pagamento ─────────────────────────────
export const PLATFORMS = [
  {
    name: 'Infinite Pay',
    modalities: [
      {
        name: 'Link de Pagamento',
        has_fixed_fee: false,
        fixed_fee_value: 0,
        rates: [
          { label: '1x', percentage: 4.20 }, { label: '2x', percentage: 6.09 },
          { label: '3x', percentage: 7.01 }, { label: '4x', percentage: 7.91 },
          { label: '5x', percentage: 8.80 }, { label: '6x', percentage: 9.67 },
          { label: '7x', percentage: 12.59 }, { label: '8x', percentage: 13.42 },
          { label: '9x', percentage: 14.25 }, { label: '10x', percentage: 15.06 },
          { label: '11x', percentage: 15.87 }, { label: '12x', percentage: 16.66 }
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
          { label: 'À vista', percentage: 4.20 }, { label: '2x', percentage: 5.47 },
          { label: '3x', percentage: 6.76 }, { label: '4x', percentage: 8.06 },
          { label: '5x', percentage: 9.38 }, { label: '6x', percentage: 10.71 },
          { label: '7x', percentage: 12.06 }, { label: '8x', percentage: 13.43 },
          { label: '9x', percentage: 14.81 }, { label: '10x', percentage: 16.22 },
          { label: '11x', percentage: 17.63 }, { label: '12x', percentage: 19.07 }
        ]
      }
    ]
  }
];

export const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
