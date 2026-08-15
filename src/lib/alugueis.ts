export type SituacaoAluguel =
  | 'ABERTO'
  | 'ATRASADO'
  | 'PAGO'
  | 'CANCELADO'

export type CalculoEncargos = {
  diasAtraso: number
  multa: number
  juros: number
  totalEncargos: number
}

/*
 * =====================================================
 * DATA ATUAL NO BRASIL
 * =====================================================
 *
 * Retorna:
 *
 * YYYY-MM-DD
 *
 * Exemplo:
 *
 * 2026-08-15
 */

export function obterDataHojeBrasil() {
  const partes =
    new Intl.DateTimeFormat(
      'pt-BR',
      {
        timeZone:
          'America/Sao_Paulo',

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).formatToParts(
      new Date()
    )

  const ano =
    partes.find(
      (parte) =>
        parte.type === 'year'
    )?.value

  const mes =
    partes.find(
      (parte) =>
        parte.type === 'month'
    )?.value

  const dia =
    partes.find(
      (parte) =>
        parte.type === 'day'
    )?.value

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    throw new Error(
      'Não foi possível determinar a data atual.'
    )
  }

  return `${ano}-${mes}-${dia}`
}

/*
 * =====================================================
 * SITUAÇÃO EFETIVA DA MENSALIDADE
 * =====================================================
 */

export function obterSituacaoEfetiva(
  situacao: string,
  vencimento: string
): SituacaoAluguel {
  /*
   * Pagamento confirmado sempre prevalece.
   */

  if (
    situacao === 'PAGO'
  ) {
    return 'PAGO'
  }

  /*
   * Mensalidade cancelada continua cancelada.
   */

  if (
    situacao === 'CANCELADO'
  ) {
    return 'CANCELADO'
  }

  /*
   * Se já estiver gravada como atrasada,
   * mantemos.
   */

  if (
    situacao === 'ATRASADO'
  ) {
    return 'ATRASADO'
  }

  const hoje =
    obterDataHojeBrasil()

  /*
   * Como usamos YYYY-MM-DD,
   * a comparação textual funciona
   * corretamente.
   */

  if (
    vencimento < hoje
  ) {
    return 'ATRASADO'
  }

  return 'ABERTO'
}

/*
 * =====================================================
 * TRADUÇÃO DA SITUAÇÃO
 * =====================================================
 */

export function traduzirSituacaoAluguel(
  situacao: SituacaoAluguel
) {
  if (
    situacao === 'PAGO'
  ) {
    return 'Pago'
  }

  if (
    situacao === 'ATRASADO'
  ) {
    return 'Atrasado'
  }

  if (
    situacao === 'CANCELADO'
  ) {
    return 'Cancelado'
  }

  return 'Aberto'
}

/*
 * =====================================================
 * ARREDONDAMENTO MONETÁRIO
 * =====================================================
 *
 * Mantém o valor com duas casas decimais.
 */

export function arredondarMoeda(
  valor: number
) {
  return Math.round(
    (valor + Number.EPSILON) * 100
  ) / 100
}

/*
 * =====================================================
 * CONVERTE DATA PARA UTC
 * =====================================================
 *
 * Trabalhamos com UTC apenas para calcular
 * a quantidade de dias entre duas datas.
 *
 * Isso evita problemas de horário de verão
 * ou diferenças de fuso.
 */

function converterDataParaUTC(
  data: string
) {
  const [
    anoTexto,
    mesTexto,
    diaTexto,
  ] = data.split('-')

  const ano =
    Number(anoTexto)

  const mes =
    Number(mesTexto)

  const dia =
    Number(diaTexto)

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia)
  ) {
    throw new Error(
      'Data inválida para cálculo financeiro.'
    )
  }

  return Date.UTC(
    ano,
    mes - 1,
    dia
  )
}

/*
 * =====================================================
 * CALCULA DIAS DE ATRASO
 * =====================================================
 *
 * Exemplos:
 *
 * vencimento:
 * 10/08/2026
 *
 * pagamento:
 * 10/08/2026
 *
 * resultado:
 * 0 dias
 *
 *
 * pagamento:
 * 15/08/2026
 *
 * resultado:
 * 5 dias
 */

export function calcularDiasAtraso(
  vencimento: string,
  dataPagamento: string
) {
  /*
   * Pagamento no vencimento ou antes
   * não possui atraso.
   */

  if (
    dataPagamento <= vencimento
  ) {
    return 0
  }

  const vencimentoUTC =
    converterDataParaUTC(
      vencimento
    )

  const pagamentoUTC =
    converterDataParaUTC(
      dataPagamento
    )

  const milissegundosPorDia =
    1000 *
    60 *
    60 *
    24

  const diferenca =
    pagamentoUTC -
    vencimentoUTC

  const dias =
    Math.floor(
      diferenca /
        milissegundosPorDia
    )

  return Math.max(
    0,
    dias
  )
}

/*
 * =====================================================
 * CALCULA MULTA E JUROS
 * =====================================================
 *
 * Regra:
 *
 * Se não houver atraso:
 *
 * multa = 0
 * juros = 0
 *
 *
 * Se houver atraso:
 *
 * multa =
 * valor × percentual de multa
 *
 * juros =
 * valor
 * × percentual de juros mensal
 * × dias de atraso / 30
 *
 *
 * Exemplo:
 *
 * valor:
 * R$ 1.500,00
 *
 * multa:
 * 2%
 *
 * juros:
 * 1% ao mês
 *
 * dias de atraso:
 * 5
 *
 *
 * multa:
 *
 * 1500 × 2%
 * = 30
 *
 *
 * juros:
 *
 * 1500 × 1% × 5 / 30
 * = 2,50
 */

export function calcularEncargosAtraso({
  valorPrevisto,
  percentualMulta,
  percentualJuros,
  vencimento,
  dataPagamento,
}: {
  valorPrevisto: number
  percentualMulta:
    | number
    | string
    | null
  percentualJuros:
    | number
    | string
    | null
  vencimento: string
  dataPagamento: string
}): CalculoEncargos {
  /*
   * =====================================================
   * DIAS DE ATRASO
   * =====================================================
   */

  const diasAtraso =
    calcularDiasAtraso(
      vencimento,
      dataPagamento
    )

  /*
   * Sem atraso:
   *
   * nenhum encargo automático.
   */

  if (
    diasAtraso === 0
  ) {
    return {
      diasAtraso: 0,
      multa: 0,
      juros: 0,
      totalEncargos: 0,
    }
  }

  /*
   * =====================================================
   * PERCENTUAIS
   * =====================================================
   */

  const multaPercentual =
    Number(
      percentualMulta ?? 0
    )

  const jurosPercentual =
    Number(
      percentualJuros ?? 0
    )

  /*
   * =====================================================
   * MULTA
   * =====================================================
   *
   * Aplicada uma única vez.
   */

  const multa =
    multaPercentual > 0
      ? arredondarMoeda(
          valorPrevisto *
            (multaPercentual /
              100)
        )
      : 0

  /*
   * =====================================================
   * JUROS
   * =====================================================
   *
   * Juros simples proporcionais
   * aos dias de atraso.
   *
   * Base:
   * 30 dias por mês.
   */

  const juros =
    jurosPercentual > 0
      ? arredondarMoeda(
          valorPrevisto *
            (jurosPercentual /
              100) *
            (diasAtraso / 30)
        )
      : 0

  /*
   * =====================================================
   * TOTAL DOS ENCARGOS
   * =====================================================
   */

  const totalEncargos =
    arredondarMoeda(
      multa +
        juros
    )

  return {
    diasAtraso,
    multa,
    juros,
    totalEncargos,
  }
}