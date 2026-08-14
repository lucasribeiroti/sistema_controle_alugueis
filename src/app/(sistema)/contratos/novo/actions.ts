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

export async function criarContrato(
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

  const locatarioId = String(
    formData.get('locatario_id') || ''
  ).trim()

  const imovelId = String(
    formData.get('imovel_id') || ''
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
   * VALIDAÇÕES BÁSICAS
   * =====================================================
   */

  if (!numeroContrato) {
    throw new Error(
      'O número do contrato é obrigatório.'
    )
  }

  if (
    tipoContrato !== 'NOVO' &&
    tipoContrato !== 'ANTIGO'
  ) {
    throw new Error(
      'Tipo de contrato inválido.'
    )
  }

  if (!locatarioId) {
    throw new Error(
      'Selecione um locatário.'
    )
  }

  if (!imovelId) {
    throw new Error(
      'Selecione um imóvel.'
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
   * DATA FINAL
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

  if (
    dataProximoReajuste &&
    !dataValida(dataProximoReajuste)
  ) {
    throw new Error(
      'Data do próximo reajuste inválida.'
    )
  }

  /*
   * =====================================================
   * CONFIRMA LOCATÁRIO
   * =====================================================
   *
   * Não confiamos somente no valor recebido pelo
   * formulário.
   *
   * Conferimos novamente se o locatário:
   *
   * - pertence ao usuário
   * - continua ativo
   */

  const {
    data: locatario,
    error: erroLocatario,
  } = await supabase
    .from('locatarios')
    .select('id')
    .eq('id', locatarioId)
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .single()

  if (erroLocatario || !locatario) {
    throw new Error(
      'O locatário selecionado não está disponível para este contrato.'
    )
  }

  /*
   * =====================================================
   * RESERVA O IMÓVEL
   * =====================================================
   *
   * Aqui fazemos algo importante.
   *
   * O imóvel somente será atualizado se ainda estiver
   * DISPONIVEL.
   *
   * Dessa forma, mesmo que a página tenha ficado aberta
   * durante algum tempo, o servidor verifica novamente
   * antes de criar o contrato.
   */

  const {
    data: imoveisAtualizados,
    error: erroReservarImovel,
  } = await supabase
    .from('imoveis')
    .update({
      situacao: 'ALUGADO',
    })
    .eq('id', imovelId)
    .eq('usuario_id', user.id)
    .eq('situacao', 'DISPONIVEL')
    .select('id')

  if (
    erroReservarImovel ||
    !imoveisAtualizados ||
    imoveisAtualizados.length !== 1
  ) {
    console.log(
      'NÃO FOI POSSÍVEL RESERVAR O IMÓVEL'
    )

    if (erroReservarImovel) {
      console.log(
        'message:',
        erroReservarImovel.message
      )

      console.log(
        'code:',
        erroReservarImovel.code
      )

      console.log(
        'details:',
        erroReservarImovel.details
      )

      console.log(
        'hint:',
        erroReservarImovel.hint
      )
    }

    throw new Error(
      'Este imóvel não está mais disponível para locação.'
    )
  }

  /*
   * =====================================================
   * CRIA O CONTRATO
   * =====================================================
   */

  const {
    data: contratoCriado,
    error: erroContrato,
  } = await supabase
    .from('contratos')
    .insert({
      usuario_id: user.id,
      locatario_id: locatarioId,
      imovel_id: imovelId,

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

      status: 'ATIVO',

      observacoes:
        observacoes || null,
    })
    .select('id')
    .single()

  /*
   * =====================================================
   * SE O CONTRATO FALHAR
   * =====================================================
   *
   * Como o imóvel foi marcado como ALUGADO antes,
   * tentamos devolvê-lo para DISPONIVEL caso o INSERT
   * do contrato não consiga ser concluído.
   */

  if (erroContrato || !contratoCriado) {
    console.log(
      'ERRO AO CADASTRAR CONTRATO'
    )

    if (erroContrato) {
      console.log(
        'message:',
        erroContrato.message
      )

      console.log(
        'code:',
        erroContrato.code
      )

      console.log(
        'details:',
        erroContrato.details
      )

      console.log(
        'hint:',
        erroContrato.hint
      )
    }

    const {
      error: erroLiberarImovel,
    } = await supabase
      .from('imoveis')
      .update({
        situacao: 'DISPONIVEL',
      })
      .eq('id', imovelId)
      .eq('usuario_id', user.id)
      .eq('situacao', 'ALUGADO')

    if (erroLiberarImovel) {
      console.log(
        'ERRO AO DEVOLVER IMÓVEL PARA DISPONÍVEL'
      )

      console.log(
        'message:',
        erroLiberarImovel.message
      )

      console.log(
        'code:',
        erroLiberarImovel.code
      )

      console.log(
        'details:',
        erroLiberarImovel.details
      )

      console.log(
        'hint:',
        erroLiberarImovel.hint
      )
    }

    throw new Error(
      'Não foi possível cadastrar o contrato.'
    )
  }

  /*
   * =====================================================
   * ATUALIZA AS PÁGINAS
   * =====================================================
   */

  revalidatePath('/contratos')
  revalidatePath('/imoveis')
  revalidatePath(`/imoveis/${imovelId}`)

  /*
   * Por enquanto voltamos para a listagem.
   *
   * Quando criarmos a página de detalhes do contrato,
   * poderemos redirecionar diretamente para:
   *
   * /contratos/ID_DO_CONTRATO
   */

  redirect('/contratos')
}