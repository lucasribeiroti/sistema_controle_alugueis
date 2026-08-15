'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

function converterDecimal(valor: string) {
  const valorNormalizado = valor.includes(',')
    ? valor
        .replace(/\./g, '')
        .replace(',', '.')
    : valor

  return Number(valorNormalizado)
}

function dataValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const data = new Date(`${valor}T00:00:00Z`)

  if (Number.isNaN(data.getTime())) {
    return false
  }

  return data.toISOString().slice(0, 10) === valor
}

/*
 * =====================================================
 * DATA ATUAL NO BRASIL
 * =====================================================
 *
 * Usamos o fuso de São Paulo para evitar que
 * o servidor interprete "hoje" de acordo com
 * outro fuso horário.
 */

function obterDataHojeBrasil() {
  const partes = new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).formatToParts(new Date())

  const ano = partes.find(
    (parte) => parte.type === 'year'
  )?.value

  const mes = partes.find(
    (parte) => parte.type === 'month'
  )?.value

  const dia = partes.find(
    (parte) => parte.type === 'day'
  )?.value

  if (!ano || !mes || !dia) {
    throw new Error(
      'Não foi possível determinar a data atual.'
    )
  }

  return `${ano}-${mes}-${dia}`
}

function arredondarMoeda(valor: number) {
  return Math.round(
    (valor + Number.EPSILON) * 100
  ) / 100
}

export async function registrarPagamento(
  id: string,
  formData: FormData
) {
  const supabase = await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const usuarioId = user.id

  /*
   * =====================================================
   * DADOS DO FORMULÁRIO
   * =====================================================
   */

  const dataPagamento = String(
    formData.get('data_pagamento') || ''
  ).trim()

  const valorPagoDigitado = String(
    formData.get('valor_pago') || ''
  ).trim()

  const multaDigitada = String(
    formData.get('multa') || ''
  ).trim()

  const jurosDigitados = String(
    formData.get('juros') || ''
  ).trim()

  const descontoDigitado = String(
    formData.get('desconto') || ''
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

  if (!dataValida(dataPagamento)) {
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

  if (!valorPagoDigitado) {
    throw new Error(
      'O valor pago é obrigatório.'
    )
  }

  const valorPago =
    converterDecimal(
      valorPagoDigitado
    )

  if (
    !Number.isFinite(valorPago) ||
    valorPago <= 0
  ) {
    throw new Error(
      'Valor pago inválido.'
    )
  }

  /*
   * =====================================================
   * MULTA
   * =====================================================
   */

  let multa = 0

  if (multaDigitada) {
    multa =
      converterDecimal(
        multaDigitada
      )

    if (
      !Number.isFinite(multa) ||
      multa < 0
    ) {
      throw new Error(
        'Valor da multa inválido.'
      )
    }
  }

  /*
   * =====================================================
   * JUROS
   * =====================================================
   */

  let juros = 0

  if (jurosDigitados) {
    juros =
      converterDecimal(
        jurosDigitados
      )

    if (
      !Number.isFinite(juros) ||
      juros < 0
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
   */

  let desconto = 0

  if (descontoDigitado) {
    desconto =
      converterDecimal(
        descontoDigitado
      )

    if (
      !Number.isFinite(desconto) ||
      desconto < 0
    ) {
      throw new Error(
        'Valor do desconto inválido.'
      )
    }
  }

  /*
   * =====================================================
   * BUSCA A MENSALIDADE
   * =====================================================
   */

  const {
    data: mensalidade,
    error: erroMensalidade,
  } = await supabase
    .from('alugueis')
    .select(`
      id,
      contrato_id,
      valor_previsto,
      situacao
    `)
    .eq('id', id)
    .eq(
      'usuario_id',
      usuarioId
    )
    .single()

  if (
    erroMensalidade ||
    !mensalidade
  ) {
    console.log(
      'ERRO AO BUSCAR MENSALIDADE PARA PAGAMENTO'
    )

    if (erroMensalidade) {
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
   * SITUAÇÃO
   * =====================================================
   */

  if (
    mensalidade.situacao ===
    'PAGO'
  ) {
    throw new Error(
      'Esta mensalidade já está paga.'
    )
  }

  if (
    mensalidade.situacao ===
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
      mensalidade.valor_previsto
    )

  if (
    !Number.isFinite(
      valorPrevisto
    ) ||
    valorPrevisto < 0
  ) {
    throw new Error(
      'A mensalidade possui um valor previsto inválido.'
    )
  }

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

  if (totalCalculado <= 0) {
    throw new Error(
      'O total da mensalidade deve ser maior que zero.'
    )
  }

  /*
   * =====================================================
   * CONFERE O VALOR PAGO
   * =====================================================
   */

  const diferenca =
    Math.abs(
      arredondarMoeda(
        valorPago
      ) -
        totalCalculado
    )

  if (diferenca > 0.01) {
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
        arredondarMoeda(
          valorPago
        ),

      multa:
        arredondarMoeda(
          multa
        ),

      juros:
        arredondarMoeda(
          juros
        ),

      desconto:
        arredondarMoeda(
          desconto
        ),

      situacao:
        'PAGO',
    })
    .eq(
      'id',
      mensalidade.id
    )
    .eq(
      'usuario_id',
      usuarioId
    )
    .eq(
      'situacao',
      mensalidade.situacao
    )
    .select(`
      id,
      situacao,
      valor_pago
    `)
    .single()

  /*
   * =====================================================
   * ERRO NO PAGAMENTO
   * =====================================================
   */

  if (
    erroPagamento ||
    !mensalidadePaga
  ) {
    console.log(
      'ERRO AO REGISTRAR PAGAMENTO'
    )

    if (erroPagamento) {
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
   * ATUALIZA AS TELAS
   * =====================================================
   */

  revalidatePath(
    '/alugueis'
  )

  revalidatePath(
    `/alugueis/${id}`
  )

  redirect(
    `/alugueis/${id}`
  )
}