'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type CampoErroContrato =
  | 'numero_contrato'
  | 'tipo_contrato'
  | 'locatario_id'
  | 'imovel_id'
  | 'data_inicio'
  | 'data_fim'
  | 'valor_mensal'
  | 'dia_vencimento'
  | 'data_primeiro_vencimento'
  | 'valor_primeira_mensalidade'
  | 'data_proximo_reajuste'
  | 'percentual_multa'
  | 'percentual_juros'
  | 'geral'

export type EstadoCriarContrato = {
  sucesso: boolean
  mensagem: string
  campo?: CampoErroContrato
}

/*
 * =====================================================
 * RETORNO DE ERRO
 * =====================================================
 */

function retornarErro(
  campo: CampoErroContrato,
  mensagem: string
): EstadoCriarContrato {
  return {
    sucesso: false,
    campo,
    mensagem,
  }
}

/*
 * =====================================================
 * CONVERTE DECIMAL
 * =====================================================
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
 * DATA ISO
 * =====================================================
 */

function formatarDataISO(
  ano: number,
  mes: number,
  dia: number
) {
  const anoTexto =
    String(ano).padStart(
      4,
      '0'
    )

  const mesTexto =
    String(mes).padStart(
      2,
      '0'
    )

  const diaTexto =
    String(dia).padStart(
      2,
      '0'
    )

  return `${anoTexto}-${mesTexto}-${diaTexto}`
}

/*
 * =====================================================
 * ÚLTIMO DIA DO MÊS
 * =====================================================
 */

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

/*
 * =====================================================
 * CRIA VENCIMENTO
 * =====================================================
 */

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

/*
 * =====================================================
 * PRIMEIRO VENCIMENTO REGULAR
 * =====================================================
 */

function calcularPrimeiroVencimentoRegular(
  dataInicio: string,
  diaVencimento: number
) {
  const [
    anoTexto,
    mesTexto,
  ] =
    dataInicio.split('-')

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
 * CRIA CONTRATO
 * =====================================================
 */

export async function criarContrato(
  _estadoAnterior: EstadoCriarContrato,
  formData: FormData
): Promise<EstadoCriarContrato> {
  const supabase =
    await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * DADOS
   * =====================================================
   */

  const numeroContrato =
    String(
      formData.get(
        'numero_contrato'
      ) ?? ''
    ).trim()

  const tipoContrato =
    String(
      formData.get(
        'tipo_contrato'
      ) ?? ''
    ).trim()

  const locatarioId =
    String(
      formData.get(
        'locatario_id'
      ) ?? ''
    ).trim()

  const imovelId =
    String(
      formData.get(
        'imovel_id'
      ) ?? ''
    ).trim()

  const dataInicio =
    String(
      formData.get(
        'data_inicio'
      ) ?? ''
    ).trim()

  const dataFim =
    String(
      formData.get(
        'data_fim'
      ) ?? ''
    ).trim()

  const valorMensalDigitado =
    String(
      formData.get(
        'valor_mensal'
      ) ?? ''
    ).trim()

  const diaVencimentoDigitado =
    String(
      formData.get(
        'dia_vencimento'
      ) ?? ''
    ).trim()

  const dataPrimeiroVencimento =
    String(
      formData.get(
        'data_primeiro_vencimento'
      ) ?? ''
    ).trim()

  const valorPrimeiraMensalidadeDigitado =
    String(
      formData.get(
        'valor_primeira_mensalidade'
      ) ?? ''
    ).trim()

  const indiceReajuste =
    String(
      formData.get(
        'indice_reajuste'
      ) ?? ''
    ).trim()

  const regraReajuste =
    String(
      formData.get(
        'regra_reajuste'
      ) ?? ''
    ).trim()

  const dataProximoReajuste =
    String(
      formData.get(
        'data_proximo_reajuste'
      ) ?? ''
    ).trim()

  const percentualMultaDigitado =
    String(
      formData.get(
        'percentual_multa'
      ) ?? ''
    ).trim()

  const percentualJurosDigitado =
    String(
      formData.get(
        'percentual_juros'
      ) ?? ''
    ).trim()

  const observacoes =
    String(
      formData.get(
        'observacoes'
      ) ?? ''
    ).trim()

  /*
   * =====================================================
   * NÚMERO DO CONTRATO
   * =====================================================
   */

  if (
    !numeroContrato
  ) {
    return retornarErro(
      'numero_contrato',
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
    return retornarErro(
      'tipo_contrato',
      'Tipo de contrato inválido.'
    )
  }

  /*
   * =====================================================
   * LOCATÁRIO
   * =====================================================
   */

  if (
    !locatarioId
  ) {
    return retornarErro(
      'locatario_id',
      'Selecione um locatário.'
    )
  }

  /*
   * =====================================================
   * IMÓVEL
   * =====================================================
   */

  if (
    !imovelId
  ) {
    return retornarErro(
      'imovel_id',
      'Selecione um imóvel.'
    )
  }

  /*
   * =====================================================
   * DATA DE INÍCIO
   * =====================================================
   */

  if (
    !dataInicio
  ) {
    return retornarErro(
      'data_inicio',
      'A data de início é obrigatória.'
    )
  }

  if (
    !dataValida(
      dataInicio
    )
  ) {
    return retornarErro(
      'data_inicio',
      'Data de início inválida.'
    )
  }

  /*
   * =====================================================
   * DATA FINAL
   * =====================================================
   */

  if (
    dataFim
  ) {
    if (
      !dataValida(
        dataFim
      )
    ) {
      return retornarErro(
        'data_fim',
        'Data de término inválida.'
      )
    }

    if (
      dataFim <
      dataInicio
    ) {
      return retornarErro(
        'data_fim',
        'A data de término não pode ser anterior à data de início.'
      )
    }
  }

  /*
   * =====================================================
   * VALOR MENSAL
   * =====================================================
   */

  if (
    !valorMensalDigitado
  ) {
    return retornarErro(
      'valor_mensal',
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
    return retornarErro(
      'valor_mensal',
      'Valor mensal inválido.'
    )
  }

  /*
   * =====================================================
   * DIA DO VENCIMENTO
   * =====================================================
   */

  if (
    !diaVencimentoDigitado
  ) {
    return retornarErro(
      'dia_vencimento',
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
    return retornarErro(
      'dia_vencimento',
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

  if (
    dataPrimeiroVencimento
  ) {
    if (
      !dataValida(
        dataPrimeiroVencimento
      )
    ) {
      return retornarErro(
        'data_primeiro_vencimento',
        'Data do primeiro vencimento inválida.'
      )
    }

    /*
     * Esse era o erro que estava
     * abrindo o Runtime Error.
     */

    if (
      dataPrimeiroVencimento <
      dataInicio
    ) {
      return retornarErro(
        'data_primeiro_vencimento',
        'O primeiro vencimento não pode ser anterior ao início do contrato.'
      )
    }

    if (
      dataPrimeiroVencimento >
      primeiroVencimentoRegular
    ) {
      return retornarErro(
        'data_primeiro_vencimento',
        'O primeiro vencimento não pode ser posterior ao primeiro vencimento regular do contrato.'
      )
    }

    if (
      dataFim &&
      dataPrimeiroVencimento >
        dataFim
    ) {
      return retornarErro(
        'data_primeiro_vencimento',
        'O primeiro vencimento não pode ser posterior ao término do contrato.'
      )
    }
  }

  /*
   * =====================================================
   * PRIMEIRA MENSALIDADE
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
      valorPrimeiraMensalidade <=
        0
    ) {
      return retornarErro(
        'valor_primeira_mensalidade',
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
      return retornarErro(
        'percentual_multa',
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
      return retornarErro(
        'percentual_juros',
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
    dataProximoReajuste
  ) {
    if (
      !dataValida(
        dataProximoReajuste
      )
    ) {
      return retornarErro(
        'data_proximo_reajuste',
        'Data do próximo reajuste inválida.'
      )
    }

    if (
      dataProximoReajuste <
      dataInicio
    ) {
      return retornarErro(
        'data_proximo_reajuste',
        'A data do próximo reajuste não pode ser anterior ao início do contrato.'
      )
    }
  }

  /*
   * =====================================================
   * CONFIRMA LOCATÁRIO
   * =====================================================
   */

  const {
    data: locatario,
    error: erroLocatario,
  } =
    await supabase
      .from(
        'locatarios'
      )
      .select('id')
      .eq(
        'id',
        locatarioId
      )
      .eq(
        'usuario_id',
        user.id
      )
      .eq(
        'ativo',
        true
      )
      .single()

  if (
    erroLocatario ||
    !locatario
  ) {
    return retornarErro(
      'locatario_id',
      'O locatário selecionado não está mais disponível para este contrato.'
    )
  }

  /*
   * =====================================================
   * RESERVA IMÓVEL
   * =====================================================
   */

  const {
    data:
      imoveisAtualizados,
    error:
      erroReservarImovel,
  } =
    await supabase
      .from(
        'imoveis'
      )
      .update({
        situacao:
          'ALUGADO',
      })
      .eq(
        'id',
        imovelId
      )
      .eq(
        'usuario_id',
        user.id
      )
      .eq(
        'situacao',
        'DISPONIVEL'
      )
      .select('id')

  if (
    erroReservarImovel ||
    !imoveisAtualizados ||
    imoveisAtualizados.length !==
      1
  ) {
    console.error(
      'NÃO FOI POSSÍVEL RESERVAR O IMÓVEL'
    )

    if (
      erroReservarImovel
    ) {
      console.error(
        'message:',
        erroReservarImovel.message
      )

      console.error(
        'code:',
        erroReservarImovel.code
      )

      console.error(
        'details:',
        erroReservarImovel.details
      )

      console.error(
        'hint:',
        erroReservarImovel.hint
      )
    }

    return retornarErro(
      'imovel_id',
      'Este imóvel não está mais disponível para locação.'
    )
  }

  /*
   * =====================================================
   * CRIA CONTRATO
   * =====================================================
   */

  const {
    data:
      contratoCriado,
    error:
      erroContrato,
  } =
    await supabase
      .from(
        'contratos'
      )
      .insert({
        usuario_id:
          user.id,

        locatario_id:
          locatarioId,

        imovel_id:
          imovelId,

        numero_contrato:
          numeroContrato,

        tipo_contrato:
          tipoContrato,

        data_inicio:
          dataInicio,

        data_fim:
          dataFim ||
          null,

        valor_mensal:
          valorMensal,

        dia_vencimento:
          diaVencimento,

        data_primeiro_vencimento:
          dataPrimeiroVencimento ||
          null,

        valor_primeira_mensalidade:
          valorPrimeiraMensalidade,

        indice_reajuste:
          indiceReajuste ||
          null,

        regra_reajuste:
          regraReajuste ||
          null,

        data_proximo_reajuste:
          dataProximoReajuste ||
          null,

        percentual_multa:
          percentualMulta,

        percentual_juros:
          percentualJuros,

        status:
          'ATIVO',

        observacoes:
          observacoes ||
          null,
      })
      .select('id')
      .single()

  /*
   * =====================================================
   * ERRO AO CRIAR
   * =====================================================
   */

  if (
    erroContrato ||
    !contratoCriado
  ) {
    console.error(
      'ERRO AO CADASTRAR CONTRATO'
    )

    if (
      erroContrato
    ) {
      console.error(
        'message:',
        erroContrato.message
      )

      console.error(
        'code:',
        erroContrato.code
      )

      console.error(
        'details:',
        erroContrato.details
      )

      console.error(
        'hint:',
        erroContrato.hint
      )
    }

    /*
     * Libera o imóvel novamente.
     */

    const {
      error:
        erroLiberarImovel,
    } =
      await supabase
        .from(
          'imoveis'
        )
        .update({
          situacao:
            'DISPONIVEL',
        })
        .eq(
          'id',
          imovelId
        )
        .eq(
          'usuario_id',
          user.id
        )
        .eq(
          'situacao',
          'ALUGADO'
        )

    if (
      erroLiberarImovel
    ) {
      console.error(
        'ERRO AO DEVOLVER IMÓVEL PARA DISPONÍVEL'
      )

      console.error(
        erroLiberarImovel
      )
    }

    /*
     * Número de contrato duplicado.
     */

    if (
      erroContrato?.code ===
      '23505'
    ) {
      return retornarErro(
        'numero_contrato',
        'Já existe um contrato cadastrado com este número.'
      )
    }

    return retornarErro(
      'geral',
      'Não foi possível cadastrar o contrato. Verifique os dados e tente novamente.'
    )
  }

  /*
   * =====================================================
   * SUCESSO
   * =====================================================
   */

  revalidatePath(
    '/contratos'
  )

  revalidatePath(
    '/imoveis'
  )

  revalidatePath(
    `/imoveis/${imovelId}`
  )

  redirect(
    '/contratos'
  )
}