export type SituacaoAluguel =
  | 'ABERTO'
  | 'ATRASADO'
  | 'PAGO'
  | 'CANCELADO'

/*
 * =====================================================
 * DATA ATUAL NO BRASIL
 * =====================================================
 *
 * Retorna a data atual no formato:
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
 *
 * Regras:
 *
 * PAGO
 * continua PAGO
 *
 * CANCELADO
 * continua CANCELADO
 *
 * ABERTO com vencimento anterior a hoje
 * passa a ser considerado ATRASADO
 *
 * ABERTO com vencimento hoje ou no futuro
 * continua ABERTO
 *
 * ATRASADO
 * continua ATRASADO
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
   * Mensalidade cancelada também
   * não deve sofrer alteração.
   */

  if (
    situacao === 'CANCELADO'
  ) {
    return 'CANCELADO'
  }

  /*
   * Se já estiver registrada como
   * atrasada, mantemos.
   */

  if (
    situacao === 'ATRASADO'
  ) {
    return 'ATRASADO'
  }

  /*
   * Data atual no Brasil.
   */

  const hoje =
    obterDataHojeBrasil()

  /*
   * Como as datas estão no formato
   * YYYY-MM-DD, podemos compará-las
   * diretamente como texto.
   *
   * Exemplo:
   *
   * vencimento:
   * 2026-08-10
   *
   * hoje:
   * 2026-08-15
   *
   * 2026-08-10 < 2026-08-15
   *
   * portanto está atrasado.
   */

  if (
    vencimento < hoje
  ) {
    return 'ATRASADO'
  }

  /*
   * Se vence hoje ou depois de hoje,
   * continua aberto.
   */

  return 'ABERTO'
}

/*
 * =====================================================
 * TEXTO DA SITUAÇÃO
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