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

export async function atualizarContrato(
  id: string,
  formData: FormData
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * DADOS DO FORMULÁRIO
   * =====================================================
   */

  const numeroContrato = String(
    formData.get('numero_contrato') || ''
  ).trim()

  const tipoContrato = String(
    formData.get('tipo_contrato') || ''
  ).trim()

  const dataInicio = String(
    formData.get('data_inicio') || ''
  ).trim()

  const dataFim = String(
    formData.get('data_fim') || ''
  ).trim()

  const valorMensalDigitado = String(
    formData.get('valor_mensal') || ''
  ).trim()

  const diaVencimentoDigitado = String(
    formData.get('dia_vencimento') || ''
  ).trim()

  const indiceReajuste = String(
    formData.get('indice_reajuste') || ''
  ).trim()

  const regraReajuste = String(
    formData.get('regra_reajuste') || ''
  ).trim()

  const dataProximoReajuste = String(
    formData.get('data_proximo_reajuste') || ''
  ).trim()

  const percentualMultaDigitado = String(
    formData.get('percentual_multa') || ''
  ).trim()

  const percentualJurosDigitado = String(
    formData.get('percentual_juros') || ''
  ).trim()

  const observacoes = String(
    formData.get('observacoes') || ''
  ).trim()

  /*
   * =====================================================
   * CONFIRMA SE O CONTRATO EXISTE
   * =====================================================
   */

  const {
    data: contratoAtual,
    error: erroContratoAtual,
  } = await supabase
    .from('contratos')
    .select(`
      id,
      status,
      locatario_id,
      imovel_id
    `)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (
    erroContratoAtual ||
    !contratoAtual
  ) {
    throw new Error(
      'Contrato não encontrado.'
    )
  }

  /*
   * =====================================================
   * NÚMERO DO CONTRATO
   * =====================================================
   */

  if (!numeroContrato) {
    throw new Error(
      'O número do contrato é obrigatório.'
    )
  }

  /*
   * =====================================================
   * TIPO DO CONTRATO
   * =====================================================
   */

  if (
    tipoContrato !== 'NOVO' &&
    tipoContrato !== 'ANTIGO'
  ) {
    throw new Error(
      'Tipo de contrato inválido.'
    )
  }

  /*
   * =====================================================
   * DATA DE INÍCIO
   * =====================================================
   */

  if (!dataInicio) {
    throw new Error(
      'A data de início é obrigatória.'
    )
  }

  if (!dataValida(dataInicio)) {
    throw new Error(
      'Data de início inválida.'
    )
  }

  /*
   * =====================================================
   * DATA DE TÉRMINO
   * =====================================================
   */

  if (dataFim) {
    if (!dataValida(dataFim)) {
      throw new Error(
        'Data de término inválida.'
      )
    }

    if (dataFim < dataInicio) {
      throw new Error(
        'A data de término não pode ser anterior à data de início.'
      )
    }
  }

  /*
   * =====================================================
   * VALOR MENSAL
   * =====================================================
   */

  if (!valorMensalDigitado) {
    throw new Error(
      'O valor mensal é obrigatório.'
    )
  }

  const valorMensal = converterDecimal(
    valorMensalDigitado
  )

  if (
    !Number.isFinite(valorMensal) ||
    valorMensal <= 0
  ) {
    throw new Error(
      'Valor mensal inválido.'
    )
  }

  /*
   * =====================================================
   * DIA DO VENCIMENTO
   * =====================================================
   */

  if (!diaVencimentoDigitado) {
    throw new Error(
      'O dia do vencimento é obrigatório.'
    )
  }

  const diaVencimento = Number(
    diaVencimentoDigitado
  )

  if (
    !Number.isInteger(diaVencimento) ||
    diaVencimento < 1 ||
    diaVencimento > 31
  ) {
    throw new Error(
      'O dia do vencimento deve estar entre 1 e 31.'
    )
  }

  /*
   * =====================================================
   * MULTA
   * =====================================================
   */

  let percentualMulta: number | null = null

  if (percentualMultaDigitado) {
    percentualMulta = converterDecimal(
      percentualMultaDigitado
    )

    if (
      !Number.isFinite(percentualMulta) ||
      percentualMulta < 0
    ) {
      throw new Error(
        'Percentual de multa inválido.'
      )
    }
  }

  /*
   * =====================================================
   * JUROS
   * =====================================================
   */

  let percentualJuros: number | null = null

  if (percentualJurosDigitado) {
    percentualJuros = converterDecimal(
      percentualJurosDigitado
    )

    if (
      !Number.isFinite(percentualJuros) ||
      percentualJuros < 0
    ) {
      throw new Error(
        'Percentual de juros inválido.'
      )
    }
  }

  /*
   * =====================================================
   * PRÓXIMO REAJUSTE
   * =====================================================
   */

  if (dataProximoReajuste) {
    if (!dataValida(dataProximoReajuste)) {
      throw new Error(
        'Data do próximo reajuste inválida.'
      )
    }

    if (dataProximoReajuste < dataInicio) {
      throw new Error(
        'A data do próximo reajuste não pode ser anterior ao início do contrato.'
      )
    }
  }

  /*
   * =====================================================
   * ATUALIZA O CONTRATO
   * =====================================================
   *
   * Observe que NÃO alteramos:
   *
   * - locatario_id
   * - imovel_id
   * - status
   *
   * Esses campos terão regras próprias.
   */

  const {
    data: contratoAtualizado,
    error: erroAtualizacao,
  } = await supabase
    .from('contratos')
    .update({
      numero_contrato: numeroContrato,
      tipo_contrato: tipoContrato,

      data_inicio: dataInicio,
      data_fim: dataFim || null,

      valor_mensal: valorMensal,
      dia_vencimento: diaVencimento,

      indice_reajuste:
        indiceReajuste || null,

      regra_reajuste:
        regraReajuste || null,

      data_proximo_reajuste:
        dataProximoReajuste || null,

      percentual_multa:
        percentualMulta,

      percentual_juros:
        percentualJuros,

      observacoes:
        observacoes || null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id')
    .single()

  if (
    erroAtualizacao ||
    !contratoAtualizado
  ) {
    console.log(
      'ERRO AO ATUALIZAR CONTRATO'
    )

    if (erroAtualizacao) {
      console.log(
        'message:',
        erroAtualizacao.message
      )

      console.log(
        'code:',
        erroAtualizacao.code
      )

      console.log(
        'details:',
        erroAtualizacao.details
      )

      console.log(
        'hint:',
        erroAtualizacao.hint
      )
    }

    throw new Error(
      'Não foi possível atualizar o contrato.'
    )
  }

  /*
   * =====================================================
   * ATUALIZA AS TELAS
   * =====================================================
   */

  revalidatePath('/contratos')
  revalidatePath(`/contratos/${id}`)
  revalidatePath(`/contratos/${id}/editar`)

  redirect(`/contratos/${id}`)
}