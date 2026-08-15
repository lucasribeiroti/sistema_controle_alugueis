'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  arredondarMoeda,
  calcularEncargosAtraso,
  obterDataHojeBrasil,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'

type MensalidadePagamentoServidor = {
  id: string
  contrato_id: string

  vencimento: string
  valor_previsto: number | string

  situacao: string

  contratos: {
    percentual_multa:
      | number
      | string
      | null

    percentual_juros:
      | number
      | string
      | null
  } | null
}

/*
 * =====================================================
 * CONVERTE VALOR DECIMAL
 * =====================================================
 *
 * Aceita:
 *
 * 1500
 * 1500.50
 * 1500,50
 * 1.500,50
 */

function converterDecimal(
  valor: string
) {
  const valorNormalizado =
    valor.includes(',')
      ? valor
          .replace(/\./g, '')
          .replace(',', '.')
      : valor

  return Number(
    valorNormalizado
  )
}

/*
 * =====================================================
 * VALIDA DATA
 * =====================================================
 */

function dataValida(
  valor: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor
    )
  ) {
    return false
  }

  const data =
    new Date(
      `${valor}T00:00:00Z`
    )

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return false
  }

  return (
    data
      .toISOString()
      .slice(0, 10) ===
    valor
  )
}

/*
 * =====================================================
 * REGISTRAR PAGAMENTO
 * =====================================================
 */

export async function registrarPagamento(
  id: string,
  formData: FormData
) {
  const supabase =
    await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const usuarioId =
    user.id

  /*
   * =====================================================
   * DADOS DO FORMULÁRIO
   * =====================================================
   */

  const dataPagamento =
    String(
      formData.get(
        'data_pagamento'
      ) || ''
    ).trim()

  const valorPagoDigitado =
    String(
      formData.get(
        'valor_pago'
      ) || ''
    ).trim()

  const multaDigitada =
    String(
      formData.get(
        'multa'
      ) || ''
    ).trim()

  const jurosDigitados =
    String(
      formData.get(
        'juros'
      ) || ''
    ).trim()

  const descontoDigitado =
    String(
      formData.get(
        'desconto'
      ) || ''
    ).trim()

  /*
   * =====================================================
   * DATA DO PAGAMENTO
   * =====================================================
   */

  if (!dataPagamento) {
    throw new Error(
      'A data do pagamento é obrigatória.'
    )
  }

  if (
    !dataValida(
      dataPagamento
    )
  ) {
    throw new Error(
      'Data de pagamento inválida.'
    )
  }

  /*
   * =====================================================
   * NÃO PERMITE DATA FUTURA
   * =====================================================
   */

  const dataHoje =
    obterDataHojeBrasil()

  if (
    dataPagamento >
    dataHoje
  ) {
    throw new Error(
      'A data do pagamento não pode ser futura.'
    )
  }

  /*
   * =====================================================
   * VALOR PAGO
   * =====================================================
   */

  if (
    !valorPagoDigitado
  ) {
    throw new Error(
      'O valor pago é obrigatório.'
    )
  }

  const valorPago =
    converterDecimal(
      valorPagoDigitado
    )

  if (
    !Number.isFinite(
      valorPago
    ) ||
    valorPago <= 0
  ) {
    throw new Error(
      'Valor pago inválido.'
    )
  }

  /*
   * =====================================================
   * MULTA INFORMADA MANUALMENTE
   * =====================================================
   *
   * null significa:
   *
   * o usuário deixou o campo vazio
   * e o sistema deverá calcular
   * automaticamente.
   *
   * Se o usuário digitar 0,00,
   * isso é considerado uma alteração
   * manual válida.
   */

  let multaInformada:
    number | null = null

  if (multaDigitada) {
    multaInformada =
      converterDecimal(
        multaDigitada
      )

    if (
      !Number.isFinite(
        multaInformada
      ) ||
      multaInformada < 0
    ) {
      throw new Error(
        'Valor da multa inválido.'
      )
    }
  }

  /*
   * =====================================================
   * JUROS INFORMADOS MANUALMENTE
   * =====================================================
   */

  let jurosInformados:
    number | null = null

  if (jurosDigitados) {
    jurosInformados =
      converterDecimal(
        jurosDigitados
      )

    if (
      !Number.isFinite(
        jurosInformados
      ) ||
      jurosInformados < 0
    ) {
      throw new Error(
        'Valor dos juros inválido.'
      )
    }
  }

  /*
   * =====================================================
   * DESCONTO
   * =====================================================
   *
   * Desconto continua sendo informado
   * manualmente.
   */

  let desconto = 0

  if (
    descontoDigitado
  ) {
    desconto =
      converterDecimal(
        descontoDigitado
      )

    if (
      !Number.isFinite(
        desconto
      ) ||
      desconto < 0
    ) {
      throw new Error(
        'Valor do desconto inválido.'
      )
    }
  }

  /*
   * =====================================================
   * BUSCA A MENSALIDADE + CONTRATO
   * =====================================================
   *
   * Agora também buscamos:
   *
   * vencimento
   * percentual_multa
   * percentual_juros
   */

  const {
    data: mensalidade,
    error: erroMensalidade,
  } = await supabase
    .from('alugueis')
    .select(`
      id,
      contrato_id,
      vencimento,
      valor_previsto,
      situacao,
      contratos (
        percentual_multa,
        percentual_juros
      )
    `)
    .eq(
      'id',
      id
    )
    .eq(
      'usuario_id',
      usuarioId
    )
    .single()

  /*
   * =====================================================
   * NÃO ENCONTRADO
   * =====================================================
   */

  if (
    erroMensalidade ||
    !mensalidade
  ) {
    console.log(
      'ERRO AO BUSCAR MENSALIDADE PARA PAGAMENTO'
    )

    if (
      erroMensalidade
    ) {
      console.log(
        'message:',
        erroMensalidade.message
      )

      console.log(
        'code:',
        erroMensalidade.code
      )

      console.log(
        'details:',
        erroMensalidade.details
      )

      console.log(
        'hint:',
        erroMensalidade.hint
      )
    }

    throw new Error(
      'Mensalidade não encontrada.'
    )
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const mensalidadeTipada =
    mensalidade as unknown as
      MensalidadePagamentoServidor

  /*
   * =====================================================
   * SITUAÇÃO
   * =====================================================
   */

  if (
    mensalidadeTipada.situacao ===
    'PAGO'
  ) {
    throw new Error(
      'Esta mensalidade já está paga.'
    )
  }

  if (
    mensalidadeTipada.situacao ===
    'CANCELADO'
  ) {
    throw new Error(
      'Não é possível registrar pagamento em uma mensalidade cancelada.'
    )
  }

  /*
   * =====================================================
   * VALOR PREVISTO
   * =====================================================
   */

  const valorPrevisto =
    Number(
      mensalidadeTipada.valor_previsto
    )

  if (
    !Number.isFinite(
      valorPrevisto
    ) ||
    valorPrevisto <= 0
  ) {
    throw new Error(
      'A mensalidade possui um valor previsto inválido.'
    )
  }

  /*
   * =====================================================
   * PERCENTUAIS DO CONTRATO
   * =====================================================
   */

  const percentualMulta =
    mensalidadeTipada
      .contratos
      ?.percentual_multa ??
    0

  const percentualJuros =
    mensalidadeTipada
      .contratos
      ?.percentual_juros ??
    0

  /*
   * =====================================================
   * CÁLCULO AUTOMÁTICO
   * =====================================================
   *
   * Aqui usamos a função central criada
   * em src/lib/alugueis.ts.
   */

  const encargosAutomaticos =
    calcularEncargosAtraso({
      valorPrevisto,

      percentualMulta,

      percentualJuros,

      vencimento:
        mensalidadeTipada.vencimento,

      dataPagamento,
    })

  /*
   * =====================================================
   * MULTA FINAL
   * =====================================================
   *
   * Se o usuário deixou o campo vazio:
   *
   * usamos a multa automática.
   *
   * Se informou algum valor:
   *
   * respeitamos o valor manual.
   */

  const multa =
    multaInformada !== null
      ? arredondarMoeda(
          multaInformada
        )
      : encargosAutomaticos.multa

  /*
   * =====================================================
   * JUROS FINAIS
   * =====================================================
   */

  const juros =
    jurosInformados !== null
      ? arredondarMoeda(
          jurosInformados
        )
      : encargosAutomaticos.juros

  /*
   * =====================================================
   * DESCONTO FINAL
   * =====================================================
   */

  desconto =
    arredondarMoeda(
      desconto
    )

  /*
   * =====================================================
   * TOTAL DA COBRANÇA
   * =====================================================
   */

  const totalCalculado =
    arredondarMoeda(
      valorPrevisto +
        multa +
        juros -
        desconto
    )

  if (
    totalCalculado <= 0
  ) {
    throw new Error(
      'O total da mensalidade deve ser maior que zero.'
    )
  }

  /*
   * =====================================================
   * CONFERE O VALOR PAGO
   * =====================================================
   *
   * Por enquanto, não trabalhamos
   * com pagamento parcial.
   */

  const valorPagoArredondado =
    arredondarMoeda(
      valorPago
    )

  const diferenca =
    Math.abs(
      valorPagoArredondado -
        totalCalculado
    )

  if (
    diferenca > 0.01
  ) {
    throw new Error(
      `O valor pago deve ser igual ao total da cobrança: R$ ${totalCalculado.toLocaleString(
        'pt-BR',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}.`
    )
  }

  /*
   * =====================================================
   * REGISTRA O PAGAMENTO
   * =====================================================
   */

  const {
    data: mensalidadePaga,
    error: erroPagamento,
  } = await supabase
    .from('alugueis')
    .update({
      data_pagamento:
        dataPagamento,

      valor_pago:
        valorPagoArredondado,

      multa,

      juros,

      desconto,

      situacao:
        'PAGO',
    })
    .eq(
      'id',
      mensalidadeTipada.id
    )
    .eq(
      'usuario_id',
      usuarioId
    )
    /*
     * Protege contra uma alteração
     * concorrente da mensalidade.
     */
    .eq(
      'situacao',
      mensalidadeTipada.situacao
    )
    .select(`
      id,
      situacao,
      valor_pago,
      multa,
      juros,
      desconto
    `)
    .single()

  /*
   * =====================================================
   * ERRO AO REGISTRAR
   * =====================================================
   */

  if (
    erroPagamento ||
    !mensalidadePaga
  ) {
    console.log(
      'ERRO AO REGISTRAR PAGAMENTO'
    )

    if (
      erroPagamento
    ) {
      console.log(
        'message:',
        erroPagamento.message
      )

      console.log(
        'code:',
        erroPagamento.code
      )

      console.log(
        'details:',
        erroPagamento.details
      )

      console.log(
        'hint:',
        erroPagamento.hint
      )
    }

    throw new Error(
      'Não foi possível registrar o pagamento.'
    )
  }

  /*
   * =====================================================
   * LOG DE DESENVOLVIMENTO
   * =====================================================
   */

  console.log(
    'PAGAMENTO REGISTRADO'
  )

  console.log(
    'Dias de atraso:',
    encargosAutomaticos.diasAtraso
  )

  console.log(
    'Multa automática:',
    encargosAutomaticos.multa
  )

  console.log(
    'Juros automáticos:',
    encargosAutomaticos.juros
  )

  console.log(
    'Multa aplicada:',
    multa
  )

  console.log(
    'Juros aplicados:',
    juros
  )

  console.log(
    'Desconto:',
    desconto
  )

  console.log(
    'Total pago:',
    valorPagoArredondado
  )

  /*
   * =====================================================
   * ATUALIZA AS TELAS
   * =====================================================
   */

  revalidatePath(
    '/alugueis'
  )

  revalidatePath(
    `/alugueis/${id}`
  )

  revalidatePath(
    `/alugueis/${id}/pagamento`
  )

  redirect(
    `/alugueis/${id}`
  )
}