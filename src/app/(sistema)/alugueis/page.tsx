import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleDollarSign,
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react'

import {
  calcularEncargosAtraso,
  obterDataHojeBrasil,
  obterSituacaoEfetiva,
  type SituacaoAluguel,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'

type AlugueisPageProps = {
  searchParams: Promise<{
    competencia?: string | string[]
    vencimento?: string | string[]
    contrato?: string | string[]
    locatario?: string | string[]
    imovel?: string | string[]
    valor?: string | string[]
    multa?: string | string[]
    juros?: string | string[]
    desconto?: string | string[]
    pagamento?: string | string[]
    situacao?: string | string[]
  }>
}

type AluguelLista = {
  id: string

  competencia: string
  vencimento: string

  valor_previsto: number | string

  data_pagamento: string | null
  valor_pago: number | string | null

  multa: number | string | null
  juros: number | string | null
  desconto: number | string | null

  situacao: string

  contratos: {
    id: string
    numero_contrato: string | null
    status: string

    percentual_multa:
      | number
      | string
      | null

    percentual_juros:
      | number
      | string
      | null

    locatarios: {
      nome: string
    } | null

    imoveis: {
      descricao: string
    } | null
  } | null
}

type SituacaoExibicao =
  | SituacaoAluguel
  | 'NAO_PAGA'
  | 'PAGO_ATRASADO'
  | 'PAGO_ANTECIPADO_MES_ANTERIOR'
  | 'PAGO_ANTECIPADO_MESMO_MES'

type EncargosExibicao = {
  multa: number
  juros: number
  dinamico: boolean
}

type Filtros = {
  competencia: string
  vencimento: string
  contrato: string
  locatario: string
  imovel: string
  valor: string
  multa: string
  juros: string
  desconto: string
  pagamento: string
  situacao: string[]
}

type OpcaoSituacao = {
  valor: SituacaoExibicao
  texto: string
}

const formatarMoeda =
  new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  )

/*
 * =====================================================
 * OPÇÕES DE SITUAÇÃO
 * =====================================================
 */

const opcoesSituacao: OpcaoSituacao[] = [
  {
    valor: 'ABERTO',
    texto: 'Aberto',
  },
  {
    valor: 'ATRASADO',
    texto: 'Atrasado',
  },
  {
    valor: 'NAO_PAGA',
    texto: 'Não paga',
  },
  {
    valor: 'PAGO',
    texto: 'Pago',
  },
  {
    valor: 'PAGO_ATRASADO',
    texto: 'Pago em atraso',
  },
  {
    valor: 'PAGO_ANTECIPADO_MESMO_MES',
    texto: 'Pago antecipado • mesmo mês',
  },
  {
    valor: 'PAGO_ANTECIPADO_MES_ANTERIOR',
    texto: 'Pago antecipado • mês anterior',
  },
  {
    valor: 'CANCELADO',
    texto: 'Cancelado',
  },
]

/*
 * =====================================================
 * OBTÉM PARÂMETRO ÚNICO
 * =====================================================
 */

function obterParametro(
  valor:
    | string
    | string[]
    | undefined
) {
  if (
    Array.isArray(
      valor
    )
  ) {
    return valor[0] ?? ''
  }

  return valor ?? ''
}

/*
 * =====================================================
 * OBTÉM MÚLTIPLOS PARÂMETROS
 * =====================================================
 */

function obterParametrosMultiplos(
  valor:
    | string
    | string[]
    | undefined
) {
  if (!valor) {
    return []
  }

  if (
    Array.isArray(
      valor
    )
  ) {
    return valor
  }

  return [valor]
}

/*
 * =====================================================
 * NORMALIZA TEXTO
 * =====================================================
 */

function normalizarTexto(
  texto: string
) {
  return texto
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
}

/*
 * =====================================================
 * FORMATA DATA
 * =====================================================
 */

function formatarData(
  data: string | null
) {
  if (!data) {
    return 'Não pago'
  }

  const [
    ano,
    mes,
    dia,
  ] = data.split('-')

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
 * FORMATA COMPETÊNCIA
 * =====================================================
 */

function formatarCompetencia(
  competencia: string | null
) {
  if (!competencia) {
    return 'Não informado'
  }

  const [
    ano,
    mes,
  ] = competencia.split('-')

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
 * FORMATA VALOR
 * =====================================================
 */

function formatarValor(
  valor:
    | number
    | string
    | null
) {
  const numero =
    Number(
      valor ?? 0
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return formatarMoeda.format(
      0
    )
  }

  return formatarMoeda.format(
    numero
  )
}

/*
 * =====================================================
 * NORMALIZA DATA DO FILTRO
 * =====================================================
 */

function normalizarDataFiltro(
  valor: string
) {
  const filtro =
    valor.trim()

  if (!filtro) {
    return ''
  }

  const formatoBrasil =
    filtro.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    )

  if (
    formatoBrasil
  ) {
    const dia =
      formatoBrasil[1]
        .padStart(
          2,
          '0'
        )

    const mes =
      formatoBrasil[2]
        .padStart(
          2,
          '0'
        )

    const ano =
      formatoBrasil[3]

    return `${ano}-${mes}-${dia}`
  }

  return filtro
}

/*
 * =====================================================
 * NORMALIZA COMPETÊNCIA
 * =====================================================
 */

function normalizarCompetenciaFiltro(
  valor: string
) {
  const filtro =
    valor.trim()

  if (!filtro) {
    return ''
  }

  const formatoBrasil =
    filtro.match(
      /^(\d{1,2})\/(\d{4})$/
    )

  if (
    formatoBrasil
  ) {
    const mes =
      formatoBrasil[1]
        .padStart(
          2,
          '0'
        )

    const ano =
      formatoBrasil[2]

    return `${ano}-${mes}`
  }

  return filtro
}

/*
 * =====================================================
 * CONVERTE NÚMERO DO FILTRO
 * =====================================================
 */

function converterNumeroFiltro(
  valor: string
) {
  let texto =
    valor
      .replace(
        /R\$/gi,
        ''
      )
      .replace(
        /\s/g,
        ''
      )
      .trim()

  if (
    texto.includes(',')
  ) {
    texto =
      texto
        .replace(
          /\./g,
          ''
        )
        .replace(
          ',',
          '.'
        )
  }

  const numero =
    Number(texto)

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return null
  }

  return numero
}

/*
 * =====================================================
 * FILTRO NUMÉRICO
 * =====================================================
 */

function correspondeFiltroNumero(
  valorAtual: number,
  filtro: string
) {
  const texto =
    filtro.trim()

  if (!texto) {
    return true
  }

  const correspondencia =
    texto.match(
      /^(>=|<=|>|<|=)?\s*(.+)$/
    )

  if (
    !correspondencia
  ) {
    return true
  }

  const operador =
    correspondencia[1] ??
    '='

  const numeroFiltro =
    converterNumeroFiltro(
      correspondencia[2]
    )

  if (
    numeroFiltro === null
  ) {
    return true
  }

  if (
    operador === '>'
  ) {
    return (
      valorAtual >
      numeroFiltro
    )
  }

  if (
    operador === '>='
  ) {
    return (
      valorAtual >=
      numeroFiltro
    )
  }

  if (
    operador === '<'
  ) {
    return (
      valorAtual <
      numeroFiltro
    )
  }

  if (
    operador === '<='
  ) {
    return (
      valorAtual <=
      numeroFiltro
    )
  }

  return (
    Math.abs(
      valorAtual -
      numeroFiltro
    ) < 0.005
  )
}

/*
 * =====================================================
 * PAGAMENTO EM MÊS ANTERIOR
 * =====================================================
 */

function foiPagoEmMesAnterior(
  aluguel: AluguelLista
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

function foiPagoAntecipadoNoMesmoMes(
  aluguel: AluguelLista
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
 * SITUAÇÃO PARA EXIBIÇÃO
 * =====================================================
 */

function obterSituacaoExibicao(
  aluguel: AluguelLista
): SituacaoExibicao {
  const situacaoEfetiva =
    obterSituacaoEfetiva(
      aluguel.situacao,
      aluguel.vencimento
    )

  /*
   * =====================================================
   * NÃO PAGA
   * =====================================================
   *
   * A mensalidade continua ATRASADA internamente.
   *
   * Porém, se o contrato já foi ENCERRADO,
   * exibimos "Não paga".
   *
   * Isso preserva a dívida e os cálculos
   * financeiros, mudando apenas a apresentação.
   */

  if (
    situacaoEfetiva ===
      'ATRASADO' &&
    aluguel.contratos
      ?.status ===
      'ENCERRADO'
  ) {
    return 'NAO_PAGA'
  }

  /*
   * =====================================================
   * SITUAÇÕES NÃO PAGAS
   * =====================================================
   */

  if (
    situacaoEfetiva !==
    'PAGO'
  ) {
    return situacaoEfetiva
  }

  /*
   * =====================================================
   * PAGO EM MÊS ANTERIOR
   * =====================================================
   */

  if (
    foiPagoEmMesAnterior(
      aluguel
    )
  ) {
    return 'PAGO_ANTECIPADO_MES_ANTERIOR'
  }

  /*
   * =====================================================
   * PAGO EM ATRASO
   * =====================================================
   */

  if (
    aluguel.data_pagamento &&
    aluguel.data_pagamento >
      aluguel.vencimento
  ) {
    return 'PAGO_ATRASADO'
  }

  /*
   * =====================================================
   * ANTECIPADO NO MESMO MÊS
   * =====================================================
   */

  if (
    foiPagoAntecipadoNoMesmoMes(
      aluguel
    )
  ) {
    return 'PAGO_ANTECIPADO_MESMO_MES'
  }

  return 'PAGO'
}

/*
 * =====================================================
 * ENCARGOS
 * =====================================================
 */

function obterEncargosExibicao(
  aluguel: AluguelLista,
  situacaoEfetiva: SituacaoAluguel,
  dataHoje: string
): EncargosExibicao {
  /*
   * =====================================================
   * PAGO
   * =====================================================
   */

  if (
    situacaoEfetiva ===
    'PAGO'
  ) {
    return {
      multa:
        Number(
          aluguel.multa ??
            0
        ),

      juros:
        Number(
          aluguel.juros ??
            0
        ),

      dinamico: false,
    }
  }

  /*
   * =====================================================
   * ATRASADO / NÃO PAGA
   * =====================================================
   *
   * "Não paga" continua ATRASADO
   * internamente, portanto os encargos
   * continuam sendo calculados.
   */

  if (
    situacaoEfetiva ===
    'ATRASADO'
  ) {
    const valorPrevisto =
      Number(
        aluguel.valor_previsto
      )

    const calculo =
      calcularEncargosAtraso({
        valorPrevisto,

        percentualMulta:
          aluguel.contratos
            ?.percentual_multa ??
          0,

        percentualJuros:
          aluguel.contratos
            ?.percentual_juros ??
          0,

        vencimento:
          aluguel.vencimento,

        dataPagamento:
          dataHoje,
      })

    return {
      multa:
        calculo.multa,

      juros:
        calculo.juros,

      dinamico: true,
    }
  }

  return {
    multa: 0,
    juros: 0,
    dinamico: false,
  }
}

/*
 * =====================================================
 * VERIFICA FILTROS ATIVOS
 * =====================================================
 */

function possuiAlgumFiltro(
  filtros: Filtros
) {
  return Object
    .values(
      filtros
    )
    .some(
      (valor) => {
        if (
          Array.isArray(
            valor
          )
        ) {
          return (
            valor.length >
            0
          )
        }

        return (
          valor.trim() !==
          ''
        )
      }
    )
}

/*
 * =====================================================
 * PÁGINA
 * =====================================================
 */

export default async function AlugueisPage({
  searchParams,
}: AlugueisPageProps) {
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

  const dataHoje =
    obterDataHojeBrasil()

  /*
   * =====================================================
   * FILTROS DA URL
   * =====================================================
   */

  const parametros =
    await searchParams

  const filtros: Filtros = {
    competencia:
      obterParametro(
        parametros.competencia
      ),

    vencimento:
      obterParametro(
        parametros.vencimento
      ),

    contrato:
      obterParametro(
        parametros.contrato
      ),

    locatario:
      obterParametro(
        parametros.locatario
      ),

    imovel:
      obterParametro(
        parametros.imovel
      ),

    valor:
      obterParametro(
        parametros.valor
      ),

    multa:
      obterParametro(
        parametros.multa
      ),

    juros:
      obterParametro(
        parametros.juros
      ),

    desconto:
      obterParametro(
        parametros.desconto
      ),

    pagamento:
      obterParametro(
        parametros.pagamento
      ),

    situacao:
      obterParametrosMultiplos(
        parametros.situacao
      ),
  }

  /*
   * =====================================================
   * BUSCA
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
        status,
        percentual_multa,
        percentual_juros,
        locatarios (
          nome
        ),
        imoveis (
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
      'ERRO AO CARREGAR ALUGUÉIS'
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
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const alugueisTipados =
    alugueis as unknown as
      AluguelLista[] | null

  const listaCompleta =
    alugueisTipados ?? []

  /*
   * =====================================================
   * CONTRATOS DISPONÍVEIS
   * =====================================================
   */

  const contratosDisponiveis =
    Array.from(
      new Set(
        listaCompleta
          .map(
            (aluguel) =>
              aluguel
                .contratos
                ?.numero_contrato
                ?.trim() ??
              ''
          )
          .filter(
            Boolean
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        a.localeCompare(
          b,
          'pt-BR',
          {
            numeric: true,
          }
        )
    )

  /*
   * =====================================================
   * LOCATÁRIOS DISPONÍVEIS
   * =====================================================
   */

  const locatariosDisponiveis =
    Array.from(
      new Set(
        listaCompleta
          .map(
            (aluguel) =>
              aluguel
                .contratos
                ?.locatarios
                ?.nome
                ?.trim() ??
              ''
          )
          .filter(
            Boolean
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        a.localeCompare(
          b,
          'pt-BR'
        )
    )

  /*
   * =====================================================
   * IMÓVEIS DISPONÍVEIS
   * =====================================================
   */

  const imoveisDisponiveis =
    Array.from(
      new Set(
        listaCompleta
          .map(
            (aluguel) =>
              aluguel
                .contratos
                ?.imoveis
                ?.descricao
                ?.trim() ??
              ''
          )
          .filter(
            Boolean
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        a.localeCompare(
          b,
          'pt-BR',
          {
            numeric: true,
          }
        )
    )

  /*
   * =====================================================
   * PREPARA FILTROS
   * =====================================================
   */

  const competenciaFiltro =
    normalizarCompetenciaFiltro(
      filtros.competencia
    )

  const vencimentoFiltro =
    normalizarDataFiltro(
      filtros.vencimento
    )

  const pagamentoFiltro =
    normalizarDataFiltro(
      filtros.pagamento
    )

  /*
   * =====================================================
   * APLICA FILTROS
   * =====================================================
   */

  const listaFiltrada =
    listaCompleta.filter(
      (aluguel) => {
        const situacaoEfetiva =
          obterSituacaoEfetiva(
            aluguel.situacao,
            aluguel.vencimento
          )

        const situacaoExibicao =
          obterSituacaoExibicao(
            aluguel
          )

        const encargos =
          obterEncargosExibicao(
            aluguel,
            situacaoEfetiva,
            dataHoje
          )

        const desconto =
          Number(
            aluguel.desconto ??
              0
          )

        /*
         * COMPETÊNCIA
         */

        if (
          competenciaFiltro &&
          !aluguel.competencia
            .slice(
              0,
              7
            )
            .includes(
              competenciaFiltro
            )
        ) {
          return false
        }

        /*
         * VENCIMENTO
         */

        if (
          vencimentoFiltro &&
          aluguel.vencimento !==
            vencimentoFiltro
        ) {
          return false
        }

        /*
         * CONTRATO
         */

        if (
          filtros.contrato &&
          normalizarTexto(
            aluguel
              .contratos
              ?.numero_contrato ??
              ''
          ) !==
            normalizarTexto(
              filtros.contrato
            )
        ) {
          return false
        }

        /*
         * LOCATÁRIO
         */

        if (
          filtros.locatario &&
          normalizarTexto(
            aluguel
              .contratos
              ?.locatarios
              ?.nome ??
              ''
          ) !==
            normalizarTexto(
              filtros.locatario
            )
        ) {
          return false
        }

        /*
         * IMÓVEL
         */

        if (
          filtros.imovel &&
          normalizarTexto(
            aluguel
              .contratos
              ?.imoveis
              ?.descricao ??
              ''
          ) !==
            normalizarTexto(
              filtros.imovel
            )
        ) {
          return false
        }

        /*
         * VALOR
         */

        if (
          !correspondeFiltroNumero(
            Number(
              aluguel.valor_previsto
            ),
            filtros.valor
          )
        ) {
          return false
        }

        /*
         * MULTA
         */

        if (
          !correspondeFiltroNumero(
            encargos.multa,
            filtros.multa
          )
        ) {
          return false
        }

        /*
         * JUROS
         */

        if (
          !correspondeFiltroNumero(
            encargos.juros,
            filtros.juros
          )
        ) {
          return false
        }

        /*
         * DESCONTO
         */

        if (
          !correspondeFiltroNumero(
            desconto,
            filtros.desconto
          )
        ) {
          return false
        }

        /*
         * PAGAMENTO
         */

        if (
          pagamentoFiltro &&
          aluguel.data_pagamento !==
            pagamentoFiltro
        ) {
          return false
        }

        /*
         * SITUAÇÃO
         */

        if (
          filtros.situacao.length >
            0 &&
          !filtros.situacao.includes(
            situacaoExibicao
          )
        ) {
          return false
        }

        return true
      }
    )

  /*
   * =====================================================
   * RESUMO
   * =====================================================
   *
   * Importante:
   *
   * NÃO PAGA continua ATRASADO internamente.
   *
   * Portanto continua sendo contabilizada
   * no card "Atrasados".
   */

  const resumo =
    listaFiltrada.reduce(
      (
        acumulador,
        aluguel
      ) => {
        const situacaoEfetiva =
          obterSituacaoEfetiva(
            aluguel.situacao,
            aluguel.vencimento
          )

        if (
          situacaoEfetiva ===
          'PAGO'
        ) {
          acumulador.pagos += 1
        }

        if (
          situacaoEfetiva ===
          'ABERTO'
        ) {
          acumulador.abertos += 1
        }

        if (
          situacaoEfetiva ===
          'ATRASADO'
        ) {
          acumulador.atrasados += 1
        }

        if (
          situacaoEfetiva ===
          'CANCELADO'
        ) {
          acumulador.cancelados +=
            1
        }

        return acumulador
      },
      {
        pagos: 0,
        abertos: 0,
        atrasados: 0,
        cancelados: 0,
      }
    )

  const temRegistros =
    listaCompleta.length >
    0

  const temResultados =
    listaFiltrada.length >
    0

  const filtrosAtivos =
    possuiAlgumFiltro(
      filtros
    )

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Aluguéis
          </h1>

          <p className="mt-2 text-slate-500">
            Acompanhe mensalidades,
            vencimentos e pagamentos.
          </p>
        </div>

        <Link
          href="/alugueis/gerar"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <CalendarPlus
            size={18}
          />

          Gerar mensalidades
        </Link>
      </div>

      {/* ==================================================
          CARDS
          ================================================== */}

      {temRegistros && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Resumo
            titulo="Abertos"
            valor={
              resumo.abertos
            }
            tipo="ABERTO"
          />

          <Resumo
            titulo="Atrasados"
            valor={
              resumo.atrasados
            }
            tipo="ATRASADO"
          />

          <Resumo
            titulo="Pagos"
            valor={
              resumo.pagos
            }
            tipo="PAGO"
          />

          <Resumo
            titulo="Cancelados"
            valor={
              resumo.cancelados
            }
            tipo="CANCELADO"
          />
        </div>
      )}

      {/* ==================================================
          ERRO
          ================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar as
          mensalidades.
        </div>
      )}

      {/* ==================================================
          SEM REGISTROS
          ================================================== */}

      {!error &&
        !temRegistros && (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
            <CalendarDays
              size={30}
              className="mb-4 text-blue-600"
            />

            <h2 className="text-lg font-semibold text-slate-900">
              Nenhuma mensalidade encontrada
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Gere mensalidades para começar
              o acompanhamento.
            </p>
          </div>
        )}

      {/* ==================================================
          FILTROS E TABELA
          ================================================== */}

      {!error &&
        temRegistros && (
          <form
            action="/alugueis"
            method="GET"
            className="rounded-xl border border-slate-200 bg-white"
          >
            {/* ==============================================
                BARRA DE FILTROS
                ============================================== */}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter
                  size={17}
                  className="text-blue-600"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Filtros
                  </p>

                  <p className="text-xs text-slate-500">
                    {listaFiltrada.length}{' '}
                    de{' '}
                    {listaCompleta.length}{' '}
                    mensalidade(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {filtrosAtivos && (
                  <Link
                    href="/alugueis"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <RotateCcw
                      size={14}
                    />

                    Limpar filtros
                  </Link>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Search
                    size={14}
                  />

                  Filtrar
                </button>
              </div>
            </div>

            {/* ==============================================
                TABELA
                ============================================== */}

            <table className="w-full table-fixed divide-y divide-slate-200">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
              </colgroup>

              <thead className="bg-slate-50">
                <tr>
                  <Cabecalho>
                    Competência
                  </Cabecalho>

                  <Cabecalho>
                    Vencimento
                  </Cabecalho>

                  <Cabecalho>
                    Contrato
                  </Cabecalho>

                  <Cabecalho>
                    Locatário
                  </Cabecalho>

                  <Cabecalho>
                    Imóvel
                  </Cabecalho>

                  <Cabecalho>
                    Valor
                  </Cabecalho>

                  <Cabecalho>
                    Multa
                  </Cabecalho>

                  <Cabecalho>
                    Juros
                  </Cabecalho>

                  <Cabecalho>
                    Desconto
                  </Cabecalho>

                  <Cabecalho>
                    Pagamento
                  </Cabecalho>

                  <Cabecalho>
                    Situação
                  </Cabecalho>
                </tr>

                {/* FILTROS */}

                <tr className="border-t border-slate-200 bg-white align-top">
                  <CelulaFiltro>
                    <InputFiltro
                      name="competencia"
                      defaultValue={
                        filtros.competencia
                      }
                      placeholder="08/2026"
                      title="Exemplo: 08/2026"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <InputDataFiltro
                      name="vencimento"
                      defaultValue={
                        vencimentoFiltro
                      }
                      title="Selecione o vencimento"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <SelectFiltro
                      name="contrato"
                      defaultValue={
                        filtros.contrato
                      }
                    >
                      <option value="">
                        Todos
                      </option>

                      {contratosDisponiveis.map(
                        (contrato) => (
                          <option
                            key={
                              contrato
                            }
                            value={
                              contrato
                            }
                          >
                            {contrato}
                          </option>
                        )
                      )}
                    </SelectFiltro>
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <SelectFiltro
                      name="locatario"
                      defaultValue={
                        filtros.locatario
                      }
                    >
                      <option value="">
                        Todos
                      </option>

                      {locatariosDisponiveis.map(
                        (locatario) => (
                          <option
                            key={
                              locatario
                            }
                            value={
                              locatario
                            }
                          >
                            {locatario}
                          </option>
                        )
                      )}
                    </SelectFiltro>
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <SelectFiltro
                      name="imovel"
                      defaultValue={
                        filtros.imovel
                      }
                    >
                      <option value="">
                        Todos
                      </option>

                      {imoveisDisponiveis.map(
                        (imovel) => (
                          <option
                            key={
                              imovel
                            }
                            value={
                              imovel
                            }
                          >
                            {imovel}
                          </option>
                        )
                      )}
                    </SelectFiltro>
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <InputFiltro
                      name="valor"
                      defaultValue={
                        filtros.valor
                      }
                      placeholder="1500"
                      title="Exemplos: 1500, >1500, <=1000"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <InputFiltro
                      name="multa"
                      defaultValue={
                        filtros.multa
                      }
                      placeholder="20"
                      title="Exemplos: 20, >0, <=30"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <InputFiltro
                      name="juros"
                      defaultValue={
                        filtros.juros
                      }
                      placeholder="0"
                      title="Exemplos: 0, >0, >=10"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <InputFiltro
                      name="desconto"
                      defaultValue={
                        filtros.desconto
                      }
                      placeholder="0"
                      title="Exemplos: 0, >0, 100"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <InputDataFiltro
                      name="pagamento"
                      defaultValue={
                        pagamentoFiltro
                      }
                      title="Selecione a data do pagamento"
                    />
                  </CelulaFiltro>

                  <CelulaFiltro>
                    <MultiSelectSituacao
                      selecionadas={
                        filtros.situacao
                      }
                    />
                  </CelulaFiltro>
                </tr>
              </thead>

              {/* ============================================
                  RESULTADOS
                  ============================================ */}

              <tbody className="divide-y divide-slate-100">
                {listaFiltrada.map(
                  (aluguel) => {
                    const situacaoEfetiva =
                      obterSituacaoEfetiva(
                        aluguel.situacao,
                        aluguel.vencimento
                      )

                    const situacaoExibicao =
                      obterSituacaoExibicao(
                        aluguel
                      )

                    const encargos =
                      obterEncargosExibicao(
                        aluguel,
                        situacaoEfetiva,
                        dataHoje
                      )

                    const desconto =
                      Number(
                        aluguel.desconto ??
                          0
                      )

                    return (
                      <tr
                        key={
                          aluguel.id
                        }
                        className="align-middle transition hover:bg-slate-50"
                      >
                        <Celula>
                          <Link
                            href={`/alugueis/${aluguel.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {formatarCompetencia(
                              aluguel.competencia
                            )}
                          </Link>
                        </Celula>

                        <Celula>
                          <span
                            className={
                              situacaoEfetiva ===
                              'ATRASADO'
                                ? 'font-semibold text-red-700'
                                : 'text-slate-700'
                            }
                          >
                            {formatarData(
                              aluguel.vencimento
                            )}
                          </span>
                        </Celula>

                        <Celula>
                          {aluguel
                            .contratos
                            ?.id ? (
                            <Link
                              href={`/contratos/${aluguel.contratos.id}`}
                              className="font-medium text-slate-700 hover:text-blue-600 hover:underline"
                            >
                              {aluguel
                                .contratos
                                .numero_contrato ||
                                'Sem número'}
                            </Link>
                          ) : (
                            'Não informado'
                          )}
                        </Celula>

                        <Celula>
                          <span className="font-medium text-slate-700">
                            {aluguel
                              .contratos
                              ?.locatarios
                              ?.nome ||
                              'Não informado'}
                          </span>
                        </Celula>

                        <Celula>
                          {aluguel
                            .contratos
                            ?.imoveis
                            ?.descricao ||
                            'Não informado'}
                        </Celula>

                        <Celula>
                          <div className="flex items-start gap-1 font-semibold text-slate-900">
                            <CircleDollarSign
                              size={13}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <span>
                              {formatarValor(
                                aluguel.valor_previsto
                              )}
                            </span>
                          </div>
                        </Celula>

                        <Celula>
                          <ValorEncargo
                            valor={
                              encargos.multa
                            }
                            dinamico={
                              encargos.dinamico
                            }
                          />
                        </Celula>

                        <Celula>
                          <ValorEncargo
                            valor={
                              encargos.juros
                            }
                            dinamico={
                              encargos.dinamico
                            }
                          />
                        </Celula>

                        <Celula>
                          <span
                            className={
                              desconto > 0
                                ? 'font-semibold text-blue-700'
                                : 'text-slate-600'
                            }
                          >
                            {formatarMoeda.format(
                              desconto
                            )}
                          </span>
                        </Celula>

                        <Celula>
                          {aluguel.data_pagamento ? (
                            <span className="font-medium text-slate-700">
                              {formatarData(
                                aluguel.data_pagamento
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Não pago
                            </span>
                          )}
                        </Celula>

                        <Celula>
                          <Situacao
                            situacao={
                              situacaoExibicao
                            }
                          />
                        </Celula>
                      </tr>
                    )
                  }
                )}

                {!temResultados && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-12 text-center"
                    >
                      <Search
                        size={28}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-semibold text-slate-700">
                        Nenhuma mensalidade corresponde
                        aos filtros.
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Altere os filtros ou limpe a
                        pesquisa para visualizar todos
                        os registros.
                      </p>

                      <Link
                        href="/alugueis"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <RotateCcw
                          size={14}
                        />

                        Limpar filtros
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </form>
        )}

      {/* ==================================================
          AJUDA
          ================================================== */}

      {temRegistros && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-700">
            Como usar os filtros
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Contrato, Locatário e Imóvel possuem
            caixas de seleção. Vencimento e
            Pagamento utilizam calendário.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Em Situação você pode selecionar uma
            ou várias opções ao mesmo tempo.
            Se nenhuma estiver marcada, todas as
            situações serão exibidas.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Em Valor, Multa, Juros e Desconto você
            também pode usar comparações como
            &quot;&gt;1500&quot;,
            &quot;&gt;=1500&quot;,
            &quot;&lt;100&quot; ou
            &quot;=0&quot;.
          </p>
        </div>
      )}
    </div>
  )
}

/*
 * =====================================================
 * INPUT DE TEXTO
 * =====================================================
 */

function InputFiltro({
  name,
  defaultValue,
  placeholder,
  title,
}: {
  name: string
  defaultValue: string
  placeholder: string
  title: string
}) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={
        defaultValue
      }
      placeholder={
        placeholder
      }
      title={
        title
      }
      className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
    />
  )
}

/*
 * =====================================================
 * INPUT DE DATA
 * =====================================================
 */

function InputDataFiltro({
  name,
  defaultValue,
  title,
}: {
  name: string
  defaultValue: string
  title: string
}) {
  return (
    <input
      type="date"
      name={name}
      defaultValue={
        defaultValue
      }
      title={
        title
      }
      className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-1 py-1.5 text-[9px] text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
    />
  )
}

/*
 * =====================================================
 * SELECT
 * =====================================================
 */

function SelectFiltro({
  name,
  defaultValue,
  children,
}: {
  name: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <select
      name={name}
      defaultValue={
        defaultValue
      }
      className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-[10px] text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
    >
      {children}
    </select>
  )
}

/*
 * =====================================================
 * MULTISELECT DE SITUAÇÃO
 * =====================================================
 */

function MultiSelectSituacao({
  selecionadas,
}: {
  selecionadas: string[]
}) {
  const selecionadasValidas =
    opcoesSituacao.filter(
      (opcao) =>
        selecionadas.includes(
          opcao.valor
        )
    )

  let textoResumo =
    'Todas'

  if (
    selecionadasValidas.length ===
    1
  ) {
    textoResumo =
      selecionadasValidas[0]
        .texto
  }

  if (
    selecionadasValidas.length >
    1
  ) {
    textoResumo =
      `${selecionadasValidas.length} selecionadas`
  }

  return (
    <details className="group relative">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-left text-[10px] font-normal text-slate-700 outline-none transition hover:border-blue-400">
        <span className="min-w-0 truncate">
          {textoResumo}
        </span>

        <ChevronDown
          size={12}
          className="shrink-0 text-slate-400 transition group-open:rotate-180"
        />
      </summary>

      <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
        <p className="px-2 pb-2 text-[10px] font-semibold text-slate-500">
          Selecione uma ou mais situações
        </p>

        <div className="space-y-1">
          {opcoesSituacao.map(
            (opcao) => {
              const marcada =
                selecionadas.includes(
                  opcao.valor
                )

              return (
                <label
                  key={
                    opcao.valor
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-normal text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      name="situacao"
                      value={
                        opcao.valor
                      }
                      defaultChecked={
                        marcada
                      }
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-600 checked:bg-blue-600"
                    />

                    <Check
                      size={11}
                      className="pointer-events-none absolute hidden text-white peer-checked:block"
                    />
                  </span>

                  <span>
                    {opcao.texto}
                  </span>
                </label>
              )
            }
          )}
        </div>

        <p className="mt-2 border-t border-slate-100 px-2 pt-2 text-[9px] leading-4 text-slate-400">
          Nenhuma opção marcada = todas
        </p>
      </div>
    </details>
  )
}

/*
 * =====================================================
 * CÉLULA DO FILTRO
 * =====================================================
 */

function CelulaFiltro({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <th className="relative px-1.5 py-2 font-normal">
      {children}
    </th>
  )
}

/*
 * =====================================================
 * ENCARGO
 * =====================================================
 */

function ValorEncargo({
  valor,
  dinamico,
}: {
  valor: number
  dinamico: boolean
}) {
  return (
    <div>
      <span
        className={
          valor > 0
            ? 'font-semibold text-orange-700'
            : 'text-slate-600'
        }
      >
        {formatarMoeda.format(
          valor
        )}
      </span>

      {dinamico && (
        <p className="mt-1 text-[10px] leading-3 text-orange-600">
          atualizado
          <br />
          hoje
        </p>
      )}
    </div>
  )
}

/*
 * =====================================================
 * CABEÇALHO
 * =====================================================
 */

function Cabecalho({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <th
      scope="col"
      className="break-words px-2 py-3 text-left text-[10px] font-semibold uppercase leading-4 tracking-wide text-slate-500"
    >
      {children}
    </th>
  )
}

/*
 * =====================================================
 * CÉLULA
 * =====================================================
 */

function Celula({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <td className="break-words px-2 py-3 text-xs leading-5 text-slate-600">
      {children}
    </td>
  )
}

/*
 * =====================================================
 * RESUMO
 * =====================================================
 */

function Resumo({
  titulo,
  valor,
  tipo,
}: {
  titulo: string
  valor: number
  tipo: SituacaoAluguel
}) {
  let estilo =
    'border-slate-200 bg-white text-slate-900'

  let iconeEstilo =
    'bg-slate-100 text-slate-600'

  if (
    tipo === 'ABERTO'
  ) {
    estilo =
      'border-amber-200 bg-amber-50 text-amber-900'

    iconeEstilo =
      'bg-amber-100 text-amber-700'
  }

  if (
    tipo === 'ATRASADO'
  ) {
    estilo =
      'border-red-200 bg-red-50 text-red-900'

    iconeEstilo =
      'bg-red-100 text-red-700'
  }

  if (
    tipo === 'PAGO'
  ) {
    estilo =
      'border-emerald-200 bg-emerald-50 text-emerald-900'

    iconeEstilo =
      'bg-emerald-100 text-emerald-700'
  }

  return (
    <div
      className={`rounded-xl border p-5 ${estilo}`}
    >
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${iconeEstilo}`}
      >
        <CircleDollarSign
          size={20}
        />
      </div>

      <p className="text-sm font-medium opacity-70">
        {titulo}
      </p>

      <p className="mt-1 text-3xl font-bold">
        {valor}
      </p>
    </div>
  )
}

/*
 * =====================================================
 * SITUAÇÃO
 * =====================================================
 */

function Situacao({
  situacao,
}: {
  situacao: SituacaoExibicao
}) {
  /*
   * =====================================================
   * NÃO PAGA
   * =====================================================
   */

  if (
    situacao ===
    'NAO_PAGA'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-rose-700">
          Não paga
        </span>

        <span className="pl-1 text-[9px] font-medium leading-3 text-slate-500">
          contrato encerrado
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * PAGO NORMAL
   * =====================================================
   */

  if (
    situacao ===
    'PAGO'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-emerald-700">
          Pago
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * PAGO ANTECIPADO
   * MÊS ANTERIOR
   * =====================================================
   */

  if (
    situacao ===
    'PAGO_ANTECIPADO_MES_ANTERIOR'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex whitespace-nowrap rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-violet-700">
          Pago antecipado
        </span>

        <span className="pl-1 text-[9px] font-medium leading-3 text-violet-600">
          mês anterior
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * PAGO ANTECIPADO
   * MESMO MÊS
   * =====================================================
   */

  if (
    situacao ===
    'PAGO_ANTECIPADO_MESMO_MES'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-blue-700">
          Pago antecipado
        </span>

        <span className="pl-1 text-[9px] font-medium leading-3 text-blue-600">
          mesmo mês
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * PAGO EM ATRASO
   * =====================================================
   */

  if (
    situacao ===
    'PAGO_ATRASADO'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-orange-700">
          Pago em atraso
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * ATRASADO
   * =====================================================
   */

  if (
    situacao ===
    'ATRASADO'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-red-700">
          Atrasado
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * CANCELADO
   * =====================================================
   */

  if (
    situacao ===
    'CANCELADO'
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold leading-4 text-slate-600">
          Cancelado
        </span>
      </div>
    )
  }

  /*
   * =====================================================
   * ABERTO
   * =====================================================
   */

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-amber-700">
        Aberto
      </span>
    </div>
  )
}