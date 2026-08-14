'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

type ContratoGeracao = {
  id: string
  status: string

  data_inicio: string
  data_fim: string | null

  valor_mensal: number | string
  dia_vencimento: number

  data_primeiro_vencimento: string | null
  valor_primeira_mensalidade:
    | number
    | string
    | null
}

type MensalidadeNova = {
  usuario_id: string
  contrato_id: string
  competencia: string
  vencimento: string
  valor_previsto: number
  situacao: 'ABERTO'
}

/*
 * =====================================================
 * FORMATA DATA ISO
 * =====================================================
 */

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
    Date.UTC(ano, mes, 0)
  ).getUTCDate()
}

/*
 * =====================================================
 * CRIA VENCIMENTO
 * =====================================================
 *
 * Se o contrato vence no dia 31 e o mês
 * possui menos dias, usamos o último dia
 * daquele mês.
 */

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
  ] = dataInicio.split('-')

  const ano = Number(anoTexto)
  const mes = Number(mesTexto)

  /*
   * Primeiro tentamos utilizar o próprio
   * mês de início.
   *
   * Exemplo:
   *
   * início: 05/08/2026
   * vencimento: dia 10
   *
   * resultado:
   * 10/08/2026
   */

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

  /*
   * Se o vencimento daquele mês já passou,
   * usamos o mês seguinte.
   *
   * Exemplo:
   *
   * início: 13/08/2026
   * vencimento: dia 10
   *
   * resultado:
   * 10/09/2026
   */

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

/*
 * =====================================================
 * PRÓXIMO VENCIMENTO
 * =====================================================
 */

function proximoVencimento(
  vencimentoAtual: string,
  diaVencimento: number
) {
  const [
    anoTexto,
    mesTexto,
  ] = vencimentoAtual.split('-')

  let ano = Number(anoTexto)
  let mes = Number(mesTexto) + 1

  if (mes > 12) {
    mes = 1
    ano += 1
  }

  return criarVencimento(
    ano,
    mes,
    diaVencimento
  )
}

/*
 * =====================================================
 * COMPETÊNCIA
 * =====================================================
 *
 * Exemplo:
 *
 * vencimento:
 * 10/09/2026
 *
 * competência:
 * 2026-09-01
 */

function competenciaDoVencimento(
  vencimento: string
) {
  return `${vencimento.slice(0, 7)}-01`
}

/*
 * =====================================================
 * COMPARA O MÊS DE DUAS DATAS
 * =====================================================
 */

function mesmoMes(
  dataA: string,
  dataB: string
) {
  return (
    dataA.slice(0, 7) ===
    dataB.slice(0, 7)
  )
}

/*
 * =====================================================
 * GERAR MENSALIDADES
 * =====================================================
 */

export async function gerarMensalidades(
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

  /*
   * IMPORTANTE:
   *
   * Depois de confirmar que user existe,
   * guardamos o ID em uma constante.
   *
   * Assim, funções internas não precisam
   * acessar diretamente user.id.
   */

  const usuarioId = user.id

  /*
   * =====================================================
   * CONTRATO SELECIONADO
   * =====================================================
   */

  const contratoId = String(
    formData.get('contrato_id') || ''
  ).trim()

  if (!contratoId) {
    throw new Error(
      'Selecione um contrato.'
    )
  }

  /*
   * =====================================================
   * BUSCA O CONTRATO NOVAMENTE
   * =====================================================
   */

  const {
    data: contrato,
    error: erroContrato,
  } = await supabase
    .from('contratos')
    .select(`
      id,
      status,
      data_inicio,
      data_fim,
      valor_mensal,
      dia_vencimento,
      data_primeiro_vencimento,
      valor_primeira_mensalidade
    `)
    .eq('id', contratoId)
    .eq(
      'usuario_id',
      usuarioId
    )
    .single()

  /*
   * =====================================================
   * CONTRATO NÃO ENCONTRADO
   * =====================================================
   */

  if (
    erroContrato ||
    !contrato
  ) {
    console.log(
      'ERRO AO BUSCAR CONTRATO PARA GERAÇÃO'
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

    throw new Error(
      'Contrato não encontrado.'
    )
  }

  const contratoTipado =
    contrato as ContratoGeracao

  /*
   * =====================================================
   * CONTRATO CANCELADO
   * =====================================================
   */

  if (
    contratoTipado.status ===
    'CANCELADO'
  ) {
    throw new Error(
      'Não é possível gerar mensalidades para um contrato cancelado.'
    )
  }

  /*
   * =====================================================
   * DATA DE INÍCIO
   * =====================================================
   */

  if (!contratoTipado.data_inicio) {
    throw new Error(
      'O contrato não possui uma data de início válida.'
    )
  }

  /*
   * =====================================================
   * VALOR NORMAL
   * =====================================================
   */

  const valorMensal =
    Number(
      contratoTipado.valor_mensal
    )

  if (
    !Number.isFinite(
      valorMensal
    ) ||
    valorMensal <= 0
  ) {
    throw new Error(
      'O contrato possui um valor mensal inválido.'
    )
  }

  /*
   * =====================================================
   * DIA NORMAL DO VENCIMENTO
   * =====================================================
   */

  const diaVencimento =
    Number(
      contratoTipado.dia_vencimento
    )

  if (
    !Number.isInteger(
      diaVencimento
    ) ||
    diaVencimento < 1 ||
    diaVencimento > 31
  ) {
    throw new Error(
      'O contrato possui um dia de vencimento inválido.'
    )
  }

  /*
   * =====================================================
   * VALOR DA PRIMEIRA MENSALIDADE
   * =====================================================
   */

  const valorPrimeiraMensalidade =
    contratoTipado
      .valor_primeira_mensalidade !==
    null
      ? Number(
          contratoTipado
            .valor_primeira_mensalidade
        )
      : valorMensal

  if (
    !Number.isFinite(
      valorPrimeiraMensalidade
    ) ||
    valorPrimeiraMensalidade <= 0
  ) {
    throw new Error(
      'O valor da primeira mensalidade é inválido.'
    )
  }

  /*
   * =====================================================
   * PRIMEIRO VENCIMENTO REGULAR
   * =====================================================
   */

  const primeiroRegular =
    calcularPrimeiroVencimentoRegular(
      contratoTipado.data_inicio,
      diaVencimento
    )

  /*
   * =====================================================
   * LISTA DE MENSALIDADES
   * =====================================================
   */

  const mensalidades:
    MensalidadeNova[] = []

  /*
   * Proteção adicional contra duas cobranças
   * da mesma competência dentro da própria
   * geração.
   */

  const competenciasGeradas =
    new Set<string>()

  /*
   * =====================================================
   * ADICIONA UMA MENSALIDADE
   * =====================================================
   */

  function adicionarMensalidade(
    vencimento: string,
    valor: number
  ) {
    /*
     * Se existir uma data final, não criamos
     * uma cobrança depois do encerramento.
     */

    if (
      contratoTipado.data_fim &&
      vencimento >
        contratoTipado.data_fim
    ) {
      return false
    }

    const competencia =
      competenciaDoVencimento(
        vencimento
      )

    /*
     * Não cria duas mensalidades na mesma
     * competência.
     */

    if (
      competenciasGeradas.has(
        competencia
      )
    ) {
      return false
    }

    competenciasGeradas.add(
      competencia
    )

    mensalidades.push({
      /*
       * CORREÇÃO:
       *
       * Usamos usuarioId em vez de user.id.
       */
      usuario_id:
        usuarioId,

      contrato_id:
        contratoTipado.id,

      competencia,

      vencimento,

      valor_previsto:
        valor,

      situacao:
        'ABERTO',
    })

    return true
  }

  /*
   * =====================================================
   * PRIMEIRO VENCIMENTO ESPECIAL
   * =====================================================
   */

  let vencimentoRegularAtual =
    primeiroRegular

  if (
    contratoTipado
      .data_primeiro_vencimento
  ) {
    const vencimentoEspecial =
      contratoTipado
        .data_primeiro_vencimento

    /*
     * Adiciona a primeira mensalidade.
     */

    adicionarMensalidade(
      vencimentoEspecial,
      valorPrimeiraMensalidade
    )

    /*
     * Exemplo:
     *
     * início:
     * 05/08/2026
     *
     * primeira especial:
     * 05/08/2026
     *
     * vencimento normal:
     * dia 10
     *
     * Não queremos:
     *
     * 05/08
     * 10/08
     *
     * porque seriam duas cobranças de agosto.
     *
     * Então pulamos para setembro.
     */

    if (
      mesmoMes(
        vencimentoEspecial,
        primeiroRegular
      )
    ) {
      vencimentoRegularAtual =
        proximoVencimento(
          primeiroRegular,
          diaVencimento
        )
    }
  }

  /*
   * =====================================================
   * SEM PRIMEIRO VENCIMENTO ESPECIAL
   * =====================================================
   */

  if (
    !contratoTipado
      .data_primeiro_vencimento
  ) {
    adicionarMensalidade(
      primeiroRegular,
      valorPrimeiraMensalidade
    )

    vencimentoRegularAtual =
      proximoVencimento(
        primeiroRegular,
        diaVencimento
      )
  }

  /*
   * =====================================================
   * CONTRATO COM DATA FINAL
   * =====================================================
   */

  if (
    contratoTipado.data_fim
  ) {
    let contadorSeguranca = 0

    while (
      vencimentoRegularAtual <=
      contratoTipado.data_fim
    ) {
      adicionarMensalidade(
        vencimentoRegularAtual,
        valorMensal
      )

      vencimentoRegularAtual =
        proximoVencimento(
          vencimentoRegularAtual,
          diaVencimento
        )

      contadorSeguranca += 1

      /*
       * 600 meses = 50 anos.
       *
       * Isso evita loops acidentais em
       * contratos com dados inconsistentes.
       */

      if (
        contadorSeguranca > 600
      ) {
        throw new Error(
          'O período do contrato é muito longo para geração automática.'
        )
      }
    }
  } else {
    /*
     * =====================================================
     * CONTRATO SEM DATA FINAL
     * =====================================================
     *
     * Geramos 12 mensalidades inicialmente.
     */

    let contadorSeguranca = 0

    while (
      mensalidades.length < 12
    ) {
      adicionarMensalidade(
        vencimentoRegularAtual,
        valorMensal
      )

      vencimentoRegularAtual =
        proximoVencimento(
          vencimentoRegularAtual,
          diaVencimento
        )

      contadorSeguranca += 1

      if (
        contadorSeguranca > 24
      ) {
        throw new Error(
          'Não foi possível calcular as mensalidades do contrato.'
        )
      }
    }
  }

  /*
   * =====================================================
   * NENHUMA MENSALIDADE
   * =====================================================
   */

  if (
    mensalidades.length === 0
  ) {
    throw new Error(
      'Não existe nenhuma mensalidade a ser gerada dentro do período deste contrato.'
    )
  }

  /*
   * =====================================================
   * GRAVA NO SUPABASE
   * =====================================================
   *
   * contrato_id + competencia possui
   * restrição única.
   *
   * Assim, uma competência já existente
   * não será duplicada.
   */

  const {
    data: mensalidadesInseridas,
    error: erroGeracao,
  } = await supabase
    .from('alugueis')
    .upsert(
      mensalidades,
      {
        onConflict:
          'contrato_id,competencia',

        ignoreDuplicates:
          true,
      }
    )
    .select('id')

  /*
   * =====================================================
   * ERRO NA GERAÇÃO
   * =====================================================
   */

  if (erroGeracao) {
    console.log(
      'ERRO AO GERAR MENSALIDADES'
    )

    console.log(
      'message:',
      erroGeracao.message
    )

    console.log(
      'code:',
      erroGeracao.code
    )

    console.log(
      'details:',
      erroGeracao.details
    )

    console.log(
      'hint:',
      erroGeracao.hint
    )

    throw new Error(
      'Não foi possível gerar as mensalidades.'
    )
  }

  /*
   * =====================================================
   * LOGS DE DESENVOLVIMENTO
   * =====================================================
   */

  console.log(
    'MENSALIDADES CALCULADAS:',
    mensalidades.length
  )

  console.log(
    'MENSALIDADES NOVAS INSERIDAS:',
    mensalidadesInseridas?.length ?? 0
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
    '/alugueis/gerar'
  )

  redirect('/alugueis')
}