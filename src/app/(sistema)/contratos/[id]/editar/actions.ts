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

function formatarDataISO(
  ano: number,
  mes: number,
  dia: number
) {
  const anoTexto = String(ano).padStart(4, '0')
  const mesTexto = String(mes).padStart(2, '0')
  const diaTexto = String(dia).padStart(2, '0')

  return `${anoTexto}-${mesTexto}-${diaTexto}`
}

function ultimoDiaDoMes(
  ano: number,
  mes: number
) {
  return new Date(
    Date.UTC(ano, mes, 0)
  ).getUTCDate()
}

function criarVencimento(
  ano: number,
  mes: number,
  diaVencimento: number
) {
  const ultimoDia = ultimoDiaDoMes(
    ano,
    mes
  )

  const diaReal = Math.min(
    diaVencimento,
    ultimoDia
  )

  return formatarDataISO(
    ano,
    mes,
    diaReal
  )
}

function calcularPrimeiroVencimentoRegular(
  dataInicio: string,
  diaVencimento: number
) {
  const [anoTexto, mesTexto] =
    dataInicio.split('-')

  const ano = Number(anoTexto)
  const mes = Number(mesTexto)

  const vencimentoMesmoMes =
    criarVencimento(
      ano,
      mes,
      diaVencimento
    )

  if (
    vencimentoMesmoMes >= dataInicio
  ) {
    return vencimentoMesmoMes
  }

  let proximoAno = ano
  let proximoMes = mes + 1

  if (proximoMes > 12) {
    proximoMes = 1
    proximoAno += 1
  }

  return criarVencimento(
    proximoAno,
    proximoMes,
    diaVencimento
  )
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

  /*
   * PRIMEIRA MENSALIDADE
   */

  const dataPrimeiroVencimento = String(
    formData.get(
      'data_primeiro_vencimento'
    ) || ''
  ).trim()

  const valorPrimeiraMensalidadeDigitado =
    String(
      formData.get(
        'valor_primeira_mensalidade'
      ) || ''
    ).trim()

  const indiceReajuste = String(
    formData.get('indice_reajuste') || ''
  ).trim()

  const regraReajuste = String(
    formData.get('regra_reajuste') || ''
  ).trim()

  const dataProximoReajuste = String(
    formData.get(
      'data_proximo_reajuste'
    ) || ''
  ).trim()

  const percentualMultaDigitado = String(
    formData.get(
      'percentual_multa'
    ) || ''
  ).trim()

  const percentualJurosDigitado = String(
    formData.get(
      'percentual_juros'
    ) || ''
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
   * NÚMERO
   * =====================================================
   */

  if (!numeroContrato) {
    throw new Error(
      'O número do contrato é obrigatório.'
    )
  }

  /*
   * =====================================================
   * TIPO
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

  const valorMensal =
    converterDecimal(
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
   * PRIMEIRO VENCIMENTO REGULAR
   * =====================================================
   */

  const primeiroVencimentoRegular =
    calcularPrimeiroVencimentoRegular(
      dataInicio,
      diaVencimento
    )

  /*
   * =====================================================
   * PRIMEIRO VENCIMENTO PERSONALIZADO
   * =====================================================
   */

  if (dataPrimeiroVencimento) {
    if (
      !dataValida(
        dataPrimeiroVencimento
      )
    ) {
      throw new Error(
        'Data do primeiro vencimento inválida.'
      )
    }

    if (
      dataPrimeiroVencimento <
      dataInicio
    ) {
      throw new Error(
        'O primeiro vencimento não pode ser anterior ao início do contrato.'
      )
    }

    if (
      dataPrimeiroVencimento >
      primeiroVencimentoRegular
    ) {
      throw new Error(
        'O primeiro vencimento não pode ser posterior ao primeiro vencimento regular do contrato.'
      )
    }

    if (
      dataFim &&
      dataPrimeiroVencimento > dataFim
    ) {
      throw new Error(
        'O primeiro vencimento não pode ser posterior ao término do contrato.'
      )
    }
  }

  /*
   * =====================================================
   * VALOR DA PRIMEIRA MENSALIDADE
   * =====================================================
   */

  let valorPrimeiraMensalidade:
    number | null = null

  if (
    valorPrimeiraMensalidadeDigitado
  ) {
    valorPrimeiraMensalidade =
      converterDecimal(
        valorPrimeiraMensalidadeDigitado
      )

    if (
      !Number.isFinite(
        valorPrimeiraMensalidade
      ) ||
      valorPrimeiraMensalidade <= 0
    ) {
      throw new Error(
        'Valor da primeira mensalidade inválido.'
      )
    }
  }

  /*
   * =====================================================
   * MULTA
   * =====================================================
   */

  let percentualMulta:
    number | null = null

  if (percentualMultaDigitado) {
    percentualMulta =
      converterDecimal(
        percentualMultaDigitado
      )

    if (
      !Number.isFinite(
        percentualMulta
      ) ||
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

  let percentualJuros:
    number | null = null

  if (percentualJurosDigitado) {
    percentualJuros =
      converterDecimal(
        percentualJurosDigitado
      )

    if (
      !Number.isFinite(
        percentualJuros
      ) ||
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
    if (
      !dataValida(
        dataProximoReajuste
      )
    ) {
      throw new Error(
        'Data do próximo reajuste inválida.'
      )
    }

    if (
      dataProximoReajuste <
      dataInicio
    ) {
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
   * Não alteramos aqui:
   *
   * locatario_id
   * imovel_id
   * status
   */

  const {
    data: contratoAtualizado,
    error: erroAtualizacao,
  } = await supabase
    .from('contratos')
    .update({
      numero_contrato:
        numeroContrato,

      tipo_contrato:
        tipoContrato,

      data_inicio:
        dataInicio,

      data_fim:
        dataFim || null,

      valor_mensal:
        valorMensal,

      dia_vencimento:
        diaVencimento,

      /*
       * PRIMEIRA MENSALIDADE
       */

      data_primeiro_vencimento:
        dataPrimeiroVencimento ||
        null,

      valor_primeira_mensalidade:
        valorPrimeiraMensalidade,

      indice_reajuste:
        indiceReajuste || null,

      regra_reajuste:
        regraReajuste || null,

      data_proximo_reajuste:
        dataProximoReajuste ||
        null,

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

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

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

  revalidatePath(
    `/contratos/${id}`
  )

  revalidatePath(
    `/contratos/${id}/editar`
  )

  revalidatePath('/alugueis')

  revalidatePath(
    '/alugueis/gerar'
  )

  redirect(
    `/contratos/${id}`
  )
}