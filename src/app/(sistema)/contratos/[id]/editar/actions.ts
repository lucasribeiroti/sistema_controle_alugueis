'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

function converterDecimal(valor: string) {
  const valorNormalizado =
    valor.includes(',')
      ? valor
          .replace(/\./g, '')
          .replace(',', '.')
      : valor

  return Number(valorNormalizado)
}

function dataValida(valor: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false
  }

  const data =
    new Date(`${valor}T00:00:00Z`)

  if (
    Number.isNaN(data.getTime())
  ) {
    return false
  }

  return (
    data.toISOString().slice(0, 10) ===
    valor
  )
}

function formatarDataISO(
  ano: number,
  mes: number,
  dia: number
) {
  const anoTexto =
    String(ano).padStart(4, '0')

  const mesTexto =
    String(mes).padStart(2, '0')

  const diaTexto =
    String(dia).padStart(2, '0')

  return `${anoTexto}-${mesTexto}-${diaTexto}`
}

function ultimoDiaDoMes(
  ano: number,
  mes: number
) {
  return new Date(
    Date.UTC(
      ano,
      mes,
      0
    )
  ).getUTCDate()
}

function criarVencimento(
  ano: number,
  mes: number,
  diaVencimento: number
) {
  const ultimoDia =
    ultimoDiaDoMes(
      ano,
      mes
    )

  const diaReal =
    Math.min(
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
  const [
    anoTexto,
    mesTexto,
  ] = dataInicio.split('-')

  const ano =
    Number(anoTexto)

  const mes =
    Number(mesTexto)

  const vencimentoMesmoMes =
    criarVencimento(
      ano,
      mes,
      diaVencimento
    )

  if (
    vencimentoMesmoMes >=
    dataInicio
  ) {
    return vencimentoMesmoMes
  }

  let proximoAno =
    ano

  let proximoMes =
    mes + 1

  if (
    proximoMes > 12
  ) {
    proximoMes = 1
    proximoAno += 1
  }

  return criarVencimento(
    proximoAno,
    proximoMes,
    diaVencimento
  )
}

/*
 * =====================================================
 * ATUALIZAR CONTRATO
 * =====================================================
 */

export async function atualizarContrato(
  id: string,
  formData: FormData
) {
  const supabase =
    await createClient()

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const numeroContrato =
    String(
      formData.get(
        'numero_contrato'
      ) || ''
    ).trim()

  const tipoContrato =
    String(
      formData.get(
        'tipo_contrato'
      ) || ''
    ).trim()

  const dataInicio =
    String(
      formData.get(
        'data_inicio'
      ) || ''
    ).trim()

  const dataFim =
    String(
      formData.get(
        'data_fim'
      ) || ''
    ).trim()

  const valorMensalDigitado =
    String(
      formData.get(
        'valor_mensal'
      ) || ''
    ).trim()

  const diaVencimentoDigitado =
    String(
      formData.get(
        'dia_vencimento'
      ) || ''
    ).trim()

  const dataPrimeiroVencimento =
    String(
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

  const indiceReajuste =
    String(
      formData.get(
        'indice_reajuste'
      ) || ''
    ).trim()

  const regraReajuste =
    String(
      formData.get(
        'regra_reajuste'
      ) || ''
    ).trim()

  const dataProximoReajuste =
    String(
      formData.get(
        'data_proximo_reajuste'
      ) || ''
    ).trim()

  const percentualMultaDigitado =
    String(
      formData.get(
        'percentual_multa'
      ) || ''
    ).trim()

  const percentualJurosDigitado =
    String(
      formData.get(
        'percentual_juros'
      ) || ''
    ).trim()

  const observacoes =
    String(
      formData.get(
        'observacoes'
      ) || ''
    ).trim()

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
   * TIPO
   * =====================================================
   */

  if (
    tipoContrato !== 'ANTIGO' &&
    tipoContrato !== 'NOVO'
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

  if (
    !dataValida(
      dataInicio
    )
  ) {
    throw new Error(
      'Data de início inválida.'
    )
  }

  /*
   * =====================================================
   * DATA FINAL
   * =====================================================
   */

  if (
    dataFim &&
    !dataValida(dataFim)
  ) {
    throw new Error(
      'Data final inválida.'
    )
  }

  if (
    dataFim &&
    dataFim < dataInicio
  ) {
    throw new Error(
      'A data final não pode ser anterior à data de início.'
    )
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
    !Number.isFinite(
      valorMensal
    ) ||
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

  const diaVencimento =
    Number(
      diaVencimentoDigitado
    )

  if (
    !Number.isInteger(
      diaVencimento
    ) ||
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
   * PRIMEIRO VENCIMENTO ESPECIAL
   * =====================================================
   */

  if (
    dataPrimeiroVencimento &&
    !dataValida(
      dataPrimeiroVencimento
    )
  ) {
    throw new Error(
      'O vencimento da primeira mensalidade é inválido.'
    )
  }

  if (
    dataPrimeiroVencimento &&
    dataPrimeiroVencimento <
      dataInicio
  ) {
    throw new Error(
      'O vencimento da primeira mensalidade não pode ser anterior ao início do contrato.'
    )
  }

  if (
    dataPrimeiroVencimento &&
    dataPrimeiroVencimento >
      primeiroVencimentoRegular
  ) {
    throw new Error(
      `O vencimento especial da primeira mensalidade não pode ser posterior a ${primeiroVencimentoRegular
        .split('-')
        .reverse()
        .join('/')}.`
    )
  }

  if (
    dataFim &&
    dataPrimeiroVencimento &&
    dataPrimeiroVencimento >
      dataFim
  ) {
    throw new Error(
      'O vencimento da primeira mensalidade não pode ser posterior ao término do contrato.'
    )
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
        'O valor da primeira mensalidade deve ser maior que zero.'
      )
    }
  }

  /*
   * =====================================================
   * DATA DO PRÓXIMO REAJUSTE
   * =====================================================
   */

  if (
    dataProximoReajuste &&
    !dataValida(
      dataProximoReajuste
    )
  ) {
    throw new Error(
      'Data do próximo reajuste inválida.'
    )
  }

  /*
   * =====================================================
   * PERCENTUAL DE MULTA
   * =====================================================
   */

  let percentualMulta =
    0

  if (
    percentualMultaDigitado
  ) {
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
   * PERCENTUAL DE JUROS
   * =====================================================
   */

  let percentualJuros =
    0

  if (
    percentualJurosDigitado
  ) {
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
   * RPC TRANSACIONAL
   * =====================================================
   */

  const {
    error,
  } = await supabase.rpc(
    'editar_contrato_e_sincronizar_mensalidades',
    {
      p_contrato_id:
        id,

      p_numero_contrato:
        numeroContrato,

      p_tipo_contrato:
        tipoContrato,

      p_data_inicio:
        dataInicio,

      p_data_fim:
        dataFim || null,

      p_valor_mensal:
        valorMensal,

      p_dia_vencimento:
        diaVencimento,

      p_data_primeiro_vencimento:
        dataPrimeiroVencimento ||
        null,

      p_valor_primeira_mensalidade:
        valorPrimeiraMensalidade,

      p_indice_reajuste:
        indiceReajuste ||
        null,

      p_regra_reajuste:
        regraReajuste ||
        null,

      p_data_proximo_reajuste:
        dataProximoReajuste ||
        null,

      p_percentual_multa:
        percentualMulta,

      p_percentual_juros:
        percentualJuros,

      p_observacoes:
        observacoes ||
        null,
    }
  )

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

  if (error) {
    console.log(
      'ERRO AO EDITAR CONTRATO E SINCRONIZAR MENSALIDADES'
    )

    console.log(
      'message:',
      error.message
    )

    console.log(
      'code:',
      error.code
    )

    console.log(
      'details:',
      error.details
    )

    console.log(
      'hint:',
      error.hint
    )

    throw new Error(
      error.message ||
        'Não foi possível atualizar o contrato.'
    )
  }

  /*
   * =====================================================
   * REVALIDAÇÃO
   * =====================================================
   */

  revalidatePath(
    '/contratos'
  )

  revalidatePath(
    `/contratos/${id}`
  )

  revalidatePath(
    `/contratos/${id}/editar`
  )

  revalidatePath(
    '/alugueis'
  )

  revalidatePath(
    '/alugueis/gerar'
  )

  /*
   * =====================================================
   * REDIRECIONAMENTO
   * =====================================================
   */

  redirect(
    `/contratos/${id}`
  )
}