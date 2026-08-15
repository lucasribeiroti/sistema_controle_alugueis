import ExcelJS from 'exceljs'
import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  calcularEncargosAtraso,
  obterDataHojeBrasil,
  obterSituacaoEfetiva,
  type SituacaoAluguel,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type AluguelRelatorio = {
  id: string

  competencia: string
  vencimento: string

  valor_previsto:
    | number
    | string

  data_pagamento:
    | string
    | null

  valor_pago:
    | number
    | string
    | null

  multa:
    | number
    | string
    | null

  juros:
    | number
    | string
    | null

  desconto:
    | number
    | string
    | null

  situacao: string

  contratos: {
    id: string
    numero_contrato:
      | string
      | null

    locatario_id: string
    imovel_id: string

    percentual_multa:
      | number
      | string
      | null

    percentual_juros:
      | number
      | string
      | null

    locatarios: {
      id: string
      nome: string
    } | null

    imoveis: {
      id: string
      descricao: string
    } | null
  } | null
}

type SituacaoExibicao =
  | SituacaoAluguel
  | 'PAGO_ATRASADO'
  | 'PAGO_ANTECIPADO_MESMO_MES'
  | 'PAGO_ANTECIPADO_MES_ANTERIOR'

type LinhaRelatorio = {
  aluguel: AluguelRelatorio

  situacao:
    SituacaoExibicao

  multa: number
  juros: number
  desconto: number
  totalAtual: number
}

/*
 * =====================================================
 * CONVERTE PARA NÚMERO
 * =====================================================
 */

function numero(
  valor:
    | string
    | number
    | null
    | undefined
) {
  const convertido =
    Number(
      valor ?? 0
    )

  if (
    !Number.isFinite(
      convertido
    )
  ) {
    return 0
  }

  return convertido
}

/*
 * =====================================================
 * PARÂMETRO NUMÉRICO
 * =====================================================
 */

function parametroNumero(
  valor: string | null
) {
  if (
    valor === null ||
    valor.trim() === ''
  ) {
    return null
  }

  const convertido =
    Number(valor)

  if (
    !Number.isFinite(
      convertido
    )
  ) {
    return null
  }

  return convertido
}

/*
 * =====================================================
 * DATA PARA O EXCEL
 * =====================================================
 */

function converterDataExcel(
  data: string | null
) {
  if (!data) {
    return null
  }

  const [
    ano,
    mes,
    dia,
  ] =
    data
      .split('-')
      .map(Number)

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return null
  }

  return new Date(
    Date.UTC(
      ano,
      mes - 1,
      dia,
      12,
      0,
      0
    )
  )
}

/*
 * =====================================================
 * DATA PARA TEXTO
 * =====================================================
 */

function formatarData(
  data: string | null
) {
  if (!data) {
    return ''
  }

  const [
    ano,
    mes,
    dia,
  ] =
    data.split('-')

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

/*
 * =====================================================
 * COMPETÊNCIA
 * =====================================================
 */

function formatarCompetencia(
  competencia: string
) {
  const [
    ano,
    mes,
  ] =
    competencia.split('-')

  if (
    !ano ||
    !mes
  ) {
    return competencia
  }

  return `${mes}/${ano}`
}

/*
 * =====================================================
 * PAGAMENTO EM MÊS ANTERIOR
 * =====================================================
 *
 * Exemplo:
 *
 * competência:
 * 09/2026
 *
 * pagamento:
 * 15/08/2026
 *
 * => Pago antecipado em mês anterior
 */

function pagoEmMesAnterior(
  aluguel: AluguelRelatorio
) {
  if (
    !aluguel.data_pagamento
  ) {
    return false
  }

  const mesPagamento =
    aluguel.data_pagamento.slice(
      0,
      7
    )

  const mesCompetencia =
    aluguel.competencia.slice(
      0,
      7
    )

  return (
    mesPagamento <
    mesCompetencia
  )
}

/*
 * =====================================================
 * PAGAMENTO ANTECIPADO NO MESMO MÊS
 * =====================================================
 */

function pagoAntecipadoMesmoMes(
  aluguel: AluguelRelatorio
) {
  if (
    !aluguel.data_pagamento
  ) {
    return false
  }

  const mesPagamento =
    aluguel.data_pagamento.slice(
      0,
      7
    )

  const mesCompetencia =
    aluguel.competencia.slice(
      0,
      7
    )

  return (
    mesPagamento ===
      mesCompetencia &&
    aluguel.data_pagamento <
      aluguel.vencimento
  )
}

/*
 * =====================================================
 * SITUAÇÃO DO RELATÓRIO
 * =====================================================
 */

function obterSituacaoRelatorio(
  aluguel: AluguelRelatorio
): SituacaoExibicao {
  const situacaoEfetiva =
    obterSituacaoEfetiva(
      aluguel.situacao,
      aluguel.vencimento
    )

  /*
   * Ainda não pago.
   */

  if (
    situacaoEfetiva !==
    'PAGO'
  ) {
    return situacaoEfetiva
  }

  /*
   * Pago em mês anterior.
   */

  if (
    pagoEmMesAnterior(
      aluguel
    )
  ) {
    return 'PAGO_ANTECIPADO_MES_ANTERIOR'
  }

  /*
   * Pago depois do vencimento.
   */

  if (
    aluguel.data_pagamento &&
    aluguel.data_pagamento >
      aluguel.vencimento
  ) {
    return 'PAGO_ATRASADO'
  }

  /*
   * Pago antes do vencimento,
   * dentro do próprio mês.
   */

  if (
    pagoAntecipadoMesmoMes(
      aluguel
    )
  ) {
    return 'PAGO_ANTECIPADO_MESMO_MES'
  }

  return 'PAGO'
}

/*
 * =====================================================
 * TEXTO DA SITUAÇÃO
 * =====================================================
 */

function traduzirSituacao(
  situacao:
    SituacaoExibicao
) {
  if (
    situacao ===
    'ABERTO'
  ) {
    return 'Aberto'
  }

  if (
    situacao ===
    'ATRASADO'
  ) {
    return 'Atrasado'
  }

  if (
    situacao ===
    'PAGO'
  ) {
    return 'Pago'
  }

  if (
    situacao ===
    'PAGO_ATRASADO'
  ) {
    return 'Pago em atraso'
  }

  if (
    situacao ===
    'PAGO_ANTECIPADO_MESMO_MES'
  ) {
    return 'Pago antecipado no mesmo mês'
  }

  if (
    situacao ===
    'PAGO_ANTECIPADO_MES_ANTERIOR'
  ) {
    return 'Pago antecipado em mês anterior'
  }

  return 'Cancelado'
}

/*
 * =====================================================
 * PREPARA CADA LINHA
 * =====================================================
 */

function prepararLinha(
  aluguel: AluguelRelatorio,
  dataHoje: string
): LinhaRelatorio {
  const situacaoEfetiva =
    obterSituacaoEfetiva(
      aluguel.situacao,
      aluguel.vencimento
    )

  const valorPrevisto =
    numero(
      aluguel.valor_previsto
    )

  let multa = 0
  let juros = 0

  /*
   * =====================================================
   * MENSALIDADE PAGA
   * =====================================================
   *
   * Usa os valores históricos gravados.
   */

  if (
    situacaoEfetiva ===
    'PAGO'
  ) {
    multa =
      numero(
        aluguel.multa
      )

    juros =
      numero(
        aluguel.juros
      )
  }

  /*
   * =====================================================
   * MENSALIDADE ATRASADA
   * =====================================================
   *
   * Multa e juros são calculados
   * até a data da exportação.
   */

  if (
    situacaoEfetiva ===
    'ATRASADO'
  ) {
    const calculo =
      calcularEncargosAtraso({
        valorPrevisto,

        percentualMulta:
          aluguel
            .contratos
            ?.percentual_multa ??
          0,

        percentualJuros:
          aluguel
            .contratos
            ?.percentual_juros ??
          0,

        vencimento:
          aluguel.vencimento,

        dataPagamento:
          dataHoje,
      })

    multa =
      calculo.multa

    juros =
      calculo.juros
  }

  /*
   * =====================================================
   * DESCONTO
   * =====================================================
   */

  const desconto =
    numero(
      aluguel.desconto
    )

  /*
   * =====================================================
   * TOTAL ATUAL
   * =====================================================
   */

  let totalAtual =
    valorPrevisto +
    multa +
    juros -
    desconto

  /*
   * Se já foi pago,
   * o valor histórico pago prevalece.
   */

  if (
    situacaoEfetiva ===
    'PAGO'
  ) {
    totalAtual =
      numero(
        aluguel.valor_pago ??
          totalAtual
      )
  }

  return {
    aluguel,

    situacao:
      obterSituacaoRelatorio(
        aluguel
      ),

    multa,

    juros,

    desconto,

    totalAtual,
  }
}

/*
 * =====================================================
 * ROTA GET
 * =====================================================
 */

export async function GET(
  request: NextRequest
) {
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
    return NextResponse.json(
      {
        error:
          'Usuário não autenticado.',
      },
      {
        status: 401,
      }
    )
  }

  const parametros =
    request.nextUrl.searchParams

  /*
   * =====================================================
   * PARÂMETROS
   * =====================================================
   */

  const competenciaDe =
    parametros.get(
      'competencia_de'
    )

  const competenciaAte =
    parametros.get(
      'competencia_ate'
    )

  const vencimentoDe =
    parametros.get(
      'vencimento_de'
    )

  const vencimentoAte =
    parametros.get(
      'vencimento_ate'
    )

  const pagamentoDe =
    parametros.get(
      'pagamento_de'
    )

  const pagamentoAte =
    parametros.get(
      'pagamento_ate'
    )

  const contratoId =
    parametros.get(
      'contrato_id'
    )

  const locatarioId =
    parametros.get(
      'locatario_id'
    )

  const imovelId =
    parametros.get(
      'imovel_id'
    )

  const valorMin =
    parametroNumero(
      parametros.get(
        'valor_min'
      )
    )

  const valorMax =
    parametroNumero(
      parametros.get(
        'valor_max'
      )
    )

  const multaMin =
    parametroNumero(
      parametros.get(
        'multa_min'
      )
    )

  const jurosMin =
    parametroNumero(
      parametros.get(
        'juros_min'
      )
    )

  const descontoMin =
    parametroNumero(
      parametros.get(
        'desconto_min'
      )
    )

  const situacoes =
    parametros.getAll(
      'situacao'
    )

  /*
   * =====================================================
   * BUSCA AS MENSALIDADES
   * =====================================================
   */

  const {
    data: alugueis,
    error,
  } = await supabase
    .from('alugueis')
    .select(`
      id,
      competencia,
      vencimento,
      valor_previsto,
      data_pagamento,
      valor_pago,
      multa,
      juros,
      desconto,
      situacao,
      contratos (
        id,
        numero_contrato,
        locatario_id,
        imovel_id,
        percentual_multa,
        percentual_juros,
        locatarios (
          id,
          nome
        ),
        imoveis (
          id,
          descricao
        )
      )
    `)
    .eq(
      'usuario_id',
      user.id
    )
    .order(
      'vencimento',
      {
        ascending: true,
      }
    )

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

  if (error) {
    console.log(
      'ERRO AO GERAR RELATÓRIO'
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

    return NextResponse.json(
      {
        error:
          'Não foi possível gerar o relatório.',
      },
      {
        status: 500,
      }
    )
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const lista =
    (
      alugueis as unknown as
        AluguelRelatorio[] | null
    ) ?? []

  const dataHoje =
    obterDataHojeBrasil()

  /*
   * =====================================================
   * PREPARA MULTA, JUROS E SITUAÇÃO
   * =====================================================
   */

  const linhas =
    lista.map(
      (aluguel) =>
        prepararLinha(
          aluguel,
          dataHoje
        )
    )

  /*
   * =====================================================
   * FILTRA
   * =====================================================
   */

  const filtradas =
    linhas.filter(
      (linha) => {
        const {
          aluguel,
        } = linha

        const competencia =
          aluguel.competencia.slice(
            0,
            7
          )

        /*
         * ================================================
         * COMPETÊNCIA
         * ================================================
         */

        if (
          competenciaDe &&
          competencia <
            competenciaDe
        ) {
          return false
        }

        if (
          competenciaAte &&
          competencia >
            competenciaAte
        ) {
          return false
        }

        /*
         * ================================================
         * VENCIMENTO
         * ================================================
         */

        if (
          vencimentoDe &&
          aluguel.vencimento <
            vencimentoDe
        ) {
          return false
        }

        if (
          vencimentoAte &&
          aluguel.vencimento >
            vencimentoAte
        ) {
          return false
        }

        /*
         * ================================================
         * PAGAMENTO
         * ================================================
         */

        if (
          pagamentoDe
        ) {
          if (
            !aluguel.data_pagamento ||
            aluguel.data_pagamento <
              pagamentoDe
          ) {
            return false
          }
        }

        if (
          pagamentoAte
        ) {
          if (
            !aluguel.data_pagamento ||
            aluguel.data_pagamento >
              pagamentoAte
          ) {
            return false
          }
        }

        /*
         * ================================================
         * CONTRATO
         * ================================================
         */

        if (
          contratoId &&
          aluguel.contratos
            ?.id !==
            contratoId
        ) {
          return false
        }

        /*
         * ================================================
         * LOCATÁRIO
         * ================================================
         */

        if (
          locatarioId &&
          aluguel.contratos
            ?.locatario_id !==
            locatarioId
        ) {
          return false
        }

        /*
         * ================================================
         * IMÓVEL
         * ================================================
         */

        if (
          imovelId &&
          aluguel.contratos
            ?.imovel_id !==
            imovelId
        ) {
          return false
        }

        /*
         * ================================================
         * VALOR PREVISTO
         * ================================================
         */

        const valorPrevisto =
          numero(
            aluguel.valor_previsto
          )

        if (
          valorMin !== null &&
          valorPrevisto <
            valorMin
        ) {
          return false
        }

        if (
          valorMax !== null &&
          valorPrevisto >
            valorMax
        ) {
          return false
        }

        /*
         * ================================================
         * MULTA
         * ================================================
         */

        if (
          multaMin !== null &&
          linha.multa <
            multaMin
        ) {
          return false
        }

        /*
         * ================================================
         * JUROS
         * ================================================
         */

        if (
          jurosMin !== null &&
          linha.juros <
            jurosMin
        ) {
          return false
        }

        /*
         * ================================================
         * DESCONTO
         * ================================================
         */

        if (
          descontoMin !== null &&
          linha.desconto <
            descontoMin
        ) {
          return false
        }

        /*
         * ================================================
         * SITUAÇÃO
         * ================================================
         */

        if (
          situacoes.length >
            0 &&
          !situacoes.includes(
            linha.situacao
          )
        ) {
          return false
        }

        return true
      }
    )

  /*
   * =====================================================
   * CRIA O EXCEL
   * =====================================================
   */

  const workbook =
    new ExcelJS.Workbook()

  workbook.creator =
    'Sistema de Controle de Aluguéis'

  workbook.created =
    new Date()

  workbook.modified =
    new Date()

  /*
   * =====================================================
   * PLANILHA
   * =====================================================
   */

  const worksheet =
    workbook.addWorksheet(
      'Aluguéis',
      {
        views: [
          {
            state:
              'frozen',

            ySplit: 5,
          },
        ],
      }
    )

  /*
   * =====================================================
   * TÍTULO
   * =====================================================
   */

  worksheet.mergeCells(
    'A1:M1'
  )

  const titulo =
    worksheet.getCell(
      'A1'
    )

  titulo.value =
    'RELATÓRIO DE ALUGUÉIS'

  titulo.font = {
    bold: true,
    size: 16,
    color: {
      argb:
        'FFFFFFFF',
    },
  }

  titulo.fill = {
    type:
      'pattern',
    pattern:
      'solid',
    fgColor: {
      argb:
        'FF1E40AF',
    },
  }

  titulo.alignment = {
    horizontal:
      'center',
    vertical:
      'middle',
  }

  worksheet.getRow(
    1
  ).height = 28

  /*
   * =====================================================
   * DATA DA GERAÇÃO
   * =====================================================
   */

  worksheet.mergeCells(
    'A2:M2'
  )

  worksheet.getCell(
    'A2'
  ).value =
    `Gerado em ${formatarData(dataHoje)}`

  worksheet.getCell(
    'A2'
  ).font = {
    italic: true,
    color: {
      argb:
        'FF64748B',
    },
  }

  /*
   * =====================================================
   * FILTROS UTILIZADOS
   * =====================================================
   */

  const filtrosUsados:
    string[] = []

  if (
    competenciaDe
  ) {
    filtrosUsados.push(
      `Competência inicial: ${formatarCompetencia(
        competenciaDe
      )}`
    )
  }

  if (
    competenciaAte
  ) {
    filtrosUsados.push(
      `Competência final: ${formatarCompetencia(
        competenciaAte
      )}`
    )
  }

  if (
    vencimentoDe
  ) {
    filtrosUsados.push(
      `Vencimento inicial: ${formatarData(
        vencimentoDe
      )}`
    )
  }

  if (
    vencimentoAte
  ) {
    filtrosUsados.push(
      `Vencimento final: ${formatarData(
        vencimentoAte
      )}`
    )
  }

  if (
    pagamentoDe
  ) {
    filtrosUsados.push(
      `Pagamento inicial: ${formatarData(
        pagamentoDe
      )}`
    )
  }

  if (
    pagamentoAte
  ) {
    filtrosUsados.push(
      `Pagamento final: ${formatarData(
        pagamentoAte
      )}`
    )
  }

  if (
    contratoId
  ) {
    const contrato =
      lista.find(
        (item) =>
          item.contratos
            ?.id ===
          contratoId
      )

    filtrosUsados.push(
      `Contrato: ${
        contrato
          ?.contratos
          ?.numero_contrato ??
        contratoId
      }`
    )
  }

  if (
    locatarioId
  ) {
    const registro =
      lista.find(
        (item) =>
          item.contratos
            ?.locatario_id ===
          locatarioId
      )

    filtrosUsados.push(
      `Locatário: ${
        registro
          ?.contratos
          ?.locatarios
          ?.nome ??
        locatarioId
      }`
    )
  }

  if (
    imovelId
  ) {
    const registro =
      lista.find(
        (item) =>
          item.contratos
            ?.imovel_id ===
          imovelId
      )

    filtrosUsados.push(
      `Imóvel: ${
        registro
          ?.contratos
          ?.imoveis
          ?.descricao ??
        imovelId
      }`
    )
  }

  if (
    valorMin !== null
  ) {
    filtrosUsados.push(
      `Valor mínimo: R$ ${valorMin.toFixed(2)}`
    )
  }

  if (
    valorMax !== null
  ) {
    filtrosUsados.push(
      `Valor máximo: R$ ${valorMax.toFixed(2)}`
    )
  }

  if (
    multaMin !== null
  ) {
    filtrosUsados.push(
      `Multa mínima: R$ ${multaMin.toFixed(2)}`
    )
  }

  if (
    jurosMin !== null
  ) {
    filtrosUsados.push(
      `Juros mínimo: R$ ${jurosMin.toFixed(2)}`
    )
  }

  if (
    descontoMin !== null
  ) {
    filtrosUsados.push(
      `Desconto mínimo: R$ ${descontoMin.toFixed(2)}`
    )
  }

  if (
    situacoes.length >
    0
  ) {
    filtrosUsados.push(
      `Situações: ${situacoes
        .map(
          (situacao) =>
            traduzirSituacao(
              situacao as SituacaoExibicao
            )
        )
        .join(', ')}`
    )
  }

  worksheet.mergeCells(
    'A3:M3'
  )

  worksheet.getCell(
    'A3'
  ).value =
    filtrosUsados.length >
      0
      ? `Filtros aplicados: ${filtrosUsados.join(
          ' | '
        )}`
      : 'Filtros aplicados: nenhum'

  worksheet.getCell(
    'A3'
  ).alignment = {
    wrapText: true,
  }

  worksheet.getCell(
    'A3'
  ).font = {
    size: 9,
    color: {
      argb:
        'FF475569',
    },
  }

  /*
   * =====================================================
   * QUANTIDADE
   * =====================================================
   */

  worksheet.mergeCells(
    'A4:M4'
  )

  worksheet.getCell(
    'A4'
  ).value =
    `${filtradas.length} mensalidade(s) encontrada(s)`

  worksheet.getCell(
    'A4'
  ).font = {
    bold: true,
    color: {
      argb:
        'FF334155',
    },
  }

  /*
   * =====================================================
   * CABEÇALHOS
   * =====================================================
   */

  const cabecalhos = [
    'Competência',
    'Vencimento',
    'Contrato',
    'Locatário',
    'Imóvel',
    'Valor previsto',
    'Multa',
    'Juros',
    'Desconto',
    'Total atual',
    'Valor pago',
    'Data pagamento',
    'Situação',
  ]

  const linhaCabecalho =
    worksheet.getRow(
      5
    )

  linhaCabecalho.values =
    cabecalhos

  linhaCabecalho.height =
    26

  linhaCabecalho.eachCell(
    (cell) => {
      cell.font = {
        bold: true,
        color: {
          argb:
            'FFFFFFFF',
        },
      }

      cell.fill = {
        type:
          'pattern',
        pattern:
          'solid',
        fgColor: {
          argb:
            'FF334155',
        },
      }

      cell.alignment = {
        horizontal:
          'center',
        vertical:
          'middle',
        wrapText: true,
      }
    }
  )

  /*
   * =====================================================
   * DADOS
   * =====================================================
   */

  filtradas.forEach(
    (
      linha,
      indice
    ) => {
      const {
        aluguel,
      } = linha

      const linhaExcel =
        worksheet.addRow([
          formatarCompetencia(
            aluguel.competencia
          ),

          converterDataExcel(
            aluguel.vencimento
          ),

          aluguel.contratos
            ?.numero_contrato ??
            'Sem número',

          aluguel.contratos
            ?.locatarios
            ?.nome ??
            'Não informado',

          aluguel.contratos
            ?.imoveis
            ?.descricao ??
            'Não informado',

          numero(
            aluguel.valor_previsto
          ),

          linha.multa,

          linha.juros,

          linha.desconto,

          linha.totalAtual,

          aluguel.valor_pago !==
          null
            ? numero(
                aluguel.valor_pago
              )
            : null,

          converterDataExcel(
            aluguel.data_pagamento
          ),

          traduzirSituacao(
            linha.situacao
          ),
        ])

      /*
       * =================================================
       * LINHAS ALTERNADAS
       * =================================================
       */

      if (
        indice % 2 === 1
      ) {
        linhaExcel.eachCell(
          (cell) => {
            cell.fill = {
              type:
                'pattern',
              pattern:
                'solid',
              fgColor: {
                argb:
                  'FFF8FAFC',
              },
            }
          }
        )
      }

      /*
       * =================================================
       * SITUAÇÃO COM COR
       * =================================================
       */

      const situacaoCell =
        linhaExcel.getCell(
          13
        )

      situacaoCell.font = {
        bold: true,
      }

      if (
        linha.situacao ===
        'ATRASADO'
      ) {
        situacaoCell.font = {
          bold: true,
          color: {
            argb:
              'FFB91C1C',
          },
        }
      }

      if (
        linha.situacao ===
        'PAGO'
      ) {
        situacaoCell.font = {
          bold: true,
          color: {
            argb:
              'FF047857',
          },
        }
      }

      if (
        linha.situacao ===
        'PAGO_ATRASADO'
      ) {
        situacaoCell.font = {
          bold: true,
          color: {
            argb:
              'FFC2410C',
          },
        }
      }

      if (
        linha.situacao ===
        'PAGO_ANTECIPADO_MESMO_MES'
      ) {
        situacaoCell.font = {
          bold: true,
          color: {
            argb:
              'FF1D4ED8',
          },
        }
      }

      if (
        linha.situacao ===
        'PAGO_ANTECIPADO_MES_ANTERIOR'
      ) {
        situacaoCell.font = {
          bold: true,
          color: {
            argb:
              'FF6D28D9',
          },
        }
      }

      /*
       * =================================================
       * ALINHAMENTO
       * =================================================
       */

      linhaExcel.alignment = {
        vertical:
          'middle',
      }

      linhaExcel.height =
        21
    }
  )

  /*
   * =====================================================
   * LARGURA DAS COLUNAS
   * =====================================================
   */

  worksheet.getColumn(
    1
  ).width = 14

  worksheet.getColumn(
    2
  ).width = 14

  worksheet.getColumn(
    3
  ).width = 18

  worksheet.getColumn(
    4
  ).width = 30

  worksheet.getColumn(
    5
  ).width = 25

  worksheet.getColumn(
    6
  ).width = 17

  worksheet.getColumn(
    7
  ).width = 14

  worksheet.getColumn(
    8
  ).width = 14

  worksheet.getColumn(
    9
  ).width = 14

  worksheet.getColumn(
    10
  ).width = 17

  worksheet.getColumn(
    11
  ).width = 17

  worksheet.getColumn(
    12
  ).width = 17

  worksheet.getColumn(
    13
  ).width = 34

  /*
   * =====================================================
   * FORMATO DE DATA
   * =====================================================
   */

  worksheet.getColumn(
    2
  ).numFmt =
    'dd/mm/yyyy'

  worksheet.getColumn(
    12
  ).numFmt =
    'dd/mm/yyyy'

  /*
   * =====================================================
   * FORMATO MONETÁRIO
   * =====================================================
   */

  const colunasMoeda = [
    6,
    7,
    8,
    9,
    10,
    11,
  ]

  colunasMoeda.forEach(
    (coluna) => {
      worksheet.getColumn(
        coluna
      ).numFmt =
        '"R$" #,##0.00'
    }
  )

  /*
   * =====================================================
   * FILTRO NATIVO DO EXCEL
   * =====================================================
   */

  worksheet.autoFilter = {
    from: 'A5',
    to: 'M5',
  }

  /*
   * =====================================================
   * LINHA DE TOTAL
   * =====================================================
   */

  if (
    filtradas.length >
    0
  ) {
    const totalPrevisto =
      filtradas.reduce(
        (
          soma,
          linha
        ) =>
          soma +
          numero(
            linha.aluguel
              .valor_previsto
          ),
        0
      )

    const totalMulta =
      filtradas.reduce(
        (
          soma,
          linha
        ) =>
          soma +
          linha.multa,
        0
      )

    const totalJuros =
      filtradas.reduce(
        (
          soma,
          linha
        ) =>
          soma +
          linha.juros,
        0
      )

    const totalDesconto =
      filtradas.reduce(
        (
          soma,
          linha
        ) =>
          soma +
          linha.desconto,
        0
      )

    const totalAtual =
      filtradas.reduce(
        (
          soma,
          linha
        ) =>
          soma +
          linha.totalAtual,
        0
      )

    const totalPago =
      filtradas.reduce(
        (
          soma,
          linha
        ) =>
          soma +
          numero(
            linha.aluguel
              .valor_pago
          ),
        0
      )

    const linhaTotal =
      worksheet.addRow([
        '',
        '',
        '',
        '',
        'TOTAL',
        totalPrevisto,
        totalMulta,
        totalJuros,
        totalDesconto,
        totalAtual,
        totalPago,
        '',
        '',
      ])

    linhaTotal.font = {
      bold: true,
    }

    linhaTotal.fill = {
      type:
        'pattern',
      pattern:
        'solid',
      fgColor: {
        argb:
          'FFE2E8F0',
      },
    }

    linhaTotal.height =
      24
  }

  /*
   * =====================================================
   * GERA O ARQUIVO
   * =====================================================
   */

  const buffer =
    await workbook.xlsx.writeBuffer()

  const nomeArquivo =
    `relatorio_alugueis_${dataHoje}.xlsx`

  /*
   * =====================================================
   * DEVOLVE O XLSX PARA DOWNLOAD
   * =====================================================
   */

  return new NextResponse(
    Buffer.from(
      buffer
    ),
    {
      status: 200,

      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

        'Content-Disposition':
          `attachment; filename="${nomeArquivo}"`,

        'Cache-Control':
          'no-store',
      },
    }
  )
}