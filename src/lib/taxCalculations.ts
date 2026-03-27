// Alíquotas padrão do Lucro Presumido para serviços
export const LUCRO_PRESUMIDO_RATES = {
  // Presunção de lucro para serviços: 32%
  presuncao_servicos: 0.32,
  // IRPJ: 15% sobre a base presumida
  irpj: 0.15,
  // IRPJ adicional: 10% sobre excedente de R$20.000/mês
  irpj_adicional: 0.10,
  irpj_adicional_limite: 20000,
  // CSLL: 9% sobre a base presumida
  csll: 0.09,
  // PIS: 0.65% sobre receita bruta
  pis: 0.0065,
  // COFINS: 3% sobre receita bruta
  cofins: 0.03,
  // ISS: varia por município (padrão 5%)
  iss_default: 0.05,
};

export interface TaxBreakdown {
  receita_bruta: number;
  base_presumida: number;
  irpj: number;
  irpj_adicional: number;
  csll: number;
  pis: number;
  cofins: number;
  iss: number;
  total_impostos: number;
  aliquota_efetiva: number;
}

export function calculateTaxesLucroPresumido(
  receitaBruta: number,
  issRate: number = LUCRO_PRESUMIDO_RATES.iss_default
): TaxBreakdown {
  const basePresumida = receitaBruta * LUCRO_PRESUMIDO_RATES.presuncao_servicos;

  const irpj = basePresumida * LUCRO_PRESUMIDO_RATES.irpj;
  const irpjAdicional =
    basePresumida > LUCRO_PRESUMIDO_RATES.irpj_adicional_limite
      ? (basePresumida - LUCRO_PRESUMIDO_RATES.irpj_adicional_limite) * LUCRO_PRESUMIDO_RATES.irpj_adicional
      : 0;
  const csll = basePresumida * LUCRO_PRESUMIDO_RATES.csll;
  const pis = receitaBruta * LUCRO_PRESUMIDO_RATES.pis;
  const cofins = receitaBruta * LUCRO_PRESUMIDO_RATES.cofins;
  const iss = receitaBruta * issRate;

  const totalImpostos = irpj + irpjAdicional + csll + pis + cofins + iss;
  const aliquotaEfetiva = receitaBruta > 0 ? totalImpostos / receitaBruta : 0;

  return {
    receita_bruta: receitaBruta,
    base_presumida: basePresumida,
    irpj,
    irpj_adicional: irpjAdicional,
    csll,
    pis,
    cofins,
    iss,
    total_impostos: totalImpostos,
    aliquota_efetiva: aliquotaEfetiva,
  };
}

export function calculateQuarterlyTaxes(
  monthlyRevenues: number[],
  issRate?: number
): TaxBreakdown {
  const totalRevenue = monthlyRevenues.reduce((sum, r) => sum + r, 0);
  return calculateTaxesLucroPresumido(totalRevenue, issRate);
}