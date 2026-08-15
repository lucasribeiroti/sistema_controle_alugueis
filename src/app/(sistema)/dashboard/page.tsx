import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  FileText,
  HandCoins,
  TriangleAlert,
} from 'lucide-react'

import {
  calcularEncargosAtraso,
  obterDataHojeBrasil,
  obterSituacaoEfetiva,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'

type DashboardPageProps = {
  searchParams: Promise<{
    mes?: string | string[]
  }>
}

type AluguelDashboard = {
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
 * FORMATA DATA
 * =====================================================
 */

function formatarData(
  data: string
) {
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
  competencia: string
) {
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
 * FORMATA MÊS POR EXTENSO
 * =====================================================
 */

function formatarMesExtenso(
  mesReferencia: string
) {
  const [
    ano,
    mes,
  ] = mesReferencia
    .split('-')
    .map(Number)

  if (
    !ano ||
    !mes
  ) {
    return mesReferencia
  }

  const data =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        1
      )
    )

  const texto =
    new Intl.DateTimeFormat(
      'pt-BR',
      {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }
    ).format(data)

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
}

/*
 * =====================================================
 * ADICIONA DIAS
 * =====================================================
 */

function adicionarDias(
  data: string,
  dias: number
) {
  const [
    ano,
    mes,
    dia,
  ] = data
    .split('-')
    .map(Number)

  const dataUTC =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia
      )
    )

  dataUTC.setUTCDate(
    dataUTC.getUTCDate() +
      dias
  )

  return dataUTC
    .toISOString()
    .slice(0, 10)
}

/*
 * =====================================================
 * VALIDA MÊS
 * =====================================================
 */

function mesValido(
  mes: string | undefined
) {
  if (!mes) {
    return false
  }

  return /^\d{4}-(0[1-9]|1[0-2])$/.test(
    mes
  )
}

/*
 * =====================================================
 * VALOR ATUAL DA MENSALIDADE
 * =====================================================
 *
 * PAGO:
 * valor realmente pago.
 *
 * ATRASADO:
 * valor previsto + multa + juros até hoje.
 *
 * ABERTO:
 * valor previsto.
 */

function calcularValorAtual(
  aluguel: AluguelDashboard,
  dataHoje: string
) {
  const situacaoEfetiva =
    obterSituacaoEfetiva(
      aluguel.situacao,
      aluguel.vencimento
    )

  /*
   * =====================================================
   * PAGO
   * =====================================================
   */

  if (
    situacaoEfetiva ===
    'PAGO'
  ) {
    return Number(
      aluguel.valor_pago ??
        aluguel.valor_previsto
    )
  }

  /*
   * =====================================================
   * ATRASADO
   * =====================================================
   */

  if (
    situacaoEfetiva ===
    'ATRASADO'
  ) {
    const valorPrevisto =
      Number(
        aluguel.valor_previsto
      )

    const encargos =
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

    return (
      valorPrevisto +
      encargos.multa +
      encargos.juros
    )
  }

  /*
   * =====================================================
   * ABERTO
   * =====================================================
   */

  return Number(
    aluguel.valor_previsto
  )
}

/*
 * =====================================================
 * PAGAMENTO ANTECIPADO
 * =====================================================
 *
 * Consideramos antecipado quando o mês em que
 * o pagamento aconteceu é anterior ao mês da
 * competência.
 *
 * Exemplo:
 *
 * pagamento:
 * 15/08/2026
 *
 * competência:
 * 09/2026
 *
 * => pagamento antecipado
 *
 *
 * Pagar uma mensalidade de agosto no próprio
 * mês de agosto, mesmo antes do vencimento,
 * NÃO entra nesta classificação.
 */

function foiPagoAntecipadamente(
  aluguel: AluguelDashboard
) {
  if (
    aluguel.situacao !==
    'PAGO'
  ) {
    return false
  }

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
 * PÁGINA
 * =====================================================
 */

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
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
   * DATA ATUAL
   * =====================================================
   */

  const dataHoje =
    obterDataHojeBrasil()

  const mesAtual =
    dataHoje.slice(
      0,
      7
    )

  const parametros =
    await searchParams

  const mesRecebido =
    Array.isArray(
      parametros.mes
    )
      ? parametros.mes[0]
      : parametros.mes

  const mesReferencia =
    mesValido(
      mesRecebido
    )
      ? mesRecebido!
      : mesAtual

  const dataLimiteSeteDias =
    adicionarDias(
      dataHoje,
      7
    )

  /*
   * =====================================================
   * BUSCAS
   * =====================================================
   */

  const [
    alugueisResultado,
    contratosResultado,
    imoveisResultado,
  ] = await Promise.all([
    /*
     * ===================================================
     * MENSALIDADES
     * ===================================================
     */

    supabase
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
      ),

    /*
     * ===================================================
     * CONTRATOS ATIVOS
     * ===================================================
     */

    supabase
      .from('contratos')
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'usuario_id',
        user.id
      )
      .eq(
        'status',
        'ATIVO'
      ),

    /*
     * ===================================================
     * IMÓVEIS ALUGADOS
     * ===================================================
     */

    supabase
      .from('imoveis')
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'usuario_id',
        user.id
      )
      .eq(
        'situacao',
        'ALUGADO'
      ),
  ])

  /*
   * =====================================================
   * ERROS
   * =====================================================
   */

  if (
    alugueisResultado.error
  ) {
    console.log(
      'ERRO DASHBOARD - ALUGUÉIS'
    )

    console.log(
      alugueisResultado
        .error
        .message
    )
  }

  if (
    contratosResultado.error
  ) {
    console.log(
      'ERRO DASHBOARD - CONTRATOS'
    )

    console.log(
      contratosResultado
        .error
        .message
    )
  }

  if (
    imoveisResultado.error
  ) {
    console.log(
      'ERRO DASHBOARD - IMÓVEIS'
    )

    console.log(
      imoveisResultado
        .error
        .message
    )
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const alugueis =
    alugueisResultado
      .data as unknown as
      AluguelDashboard[] | null

  const listaAlugueis =
    alugueis ?? []

  /*
   * =====================================================
   * MESES DISPONÍVEIS
   * =====================================================
   *
   * O seletor usa:
   *
   * - competências existentes
   * - meses em que houve pagamento
   * - mês atual
   * - mês recebido pela URL
   */

  const mesesSet =
    new Set<string>()

  mesesSet.add(
    mesAtual
  )

  mesesSet.add(
    mesReferencia
  )

  listaAlugueis.forEach(
    (aluguel) => {
      if (
        aluguel.competencia
      ) {
        mesesSet.add(
          aluguel.competencia.slice(
            0,
            7
          )
        )
      }

      if (
        aluguel.data_pagamento
      ) {
        mesesSet.add(
          aluguel.data_pagamento.slice(
            0,
            7
          )
        )
      }
    }
  )

  const mesesDisponiveis =
    Array.from(
      mesesSet
    ).sort()

  /*
   * =====================================================
   * RECEBIDO NO MÊS SELECIONADO
   * =====================================================
   *
   * Aqui a lógica é de CAIXA.
   *
   * Se o dinheiro entrou no mês selecionado,
   * entra neste card.
   *
   * Não importa se a competência pertence
   * ao mesmo mês ou a um mês futuro.
   */

  const recebidoNoMes =
    listaAlugueis.reduce(
      (
        total,
        aluguel
      ) => {
        if (
          aluguel.situacao !==
          'PAGO'
        ) {
          return total
        }

        if (
          !aluguel.data_pagamento
        ) {
          return total
        }

        const mesPagamento =
          aluguel.data_pagamento.slice(
            0,
            7
          )

        if (
          mesPagamento !==
          mesReferencia
        ) {
          return total
        }

        return (
          total +
          Number(
            aluguel.valor_pago ??
              0
          )
        )
      },
      0
    )

  /*
   * =====================================================
   * PAGO ANTECIPADAMENTE NO MÊS
   * =====================================================
   *
   * É um subconjunto de "Recebido no mês".
   *
   * Exemplo:
   *
   * Agosto recebeu R$ 3.000.
   *
   * R$ 1.500 pertencem a agosto.
   * R$ 1.500 pertencem a setembro.
   *
   * Recebido:
   * R$ 3.000
   *
   * Pago antecipadamente:
   * R$ 1.500
   */

  const pagamentosAntecipadosNoMes =
    listaAlugueis.filter(
      (aluguel) => {
        if (
          !foiPagoAntecipadamente(
            aluguel
          )
        ) {
          return false
        }

        if (
          !aluguel.data_pagamento
        ) {
          return false
        }

        return (
          aluguel.data_pagamento.slice(
            0,
            7
          ) === mesReferencia
        )
      }
    )

  const totalPagoAntecipadamente =
    pagamentosAntecipadosNoMes.reduce(
      (
        total,
        aluguel
      ) => {
        return (
          total +
          Number(
            aluguel.valor_pago ??
              0
          )
        )
      },
      0
    )

  /*
   * =====================================================
   * JÁ QUITADO ANTECIPADAMENTE
   * =====================================================
   *
   * Agora olhamos para COMPETÊNCIA.
   *
   * Exemplo:
   *
   * Dashboard de setembro.
   *
   * Competência setembro
   * foi paga em agosto.
   *
   * Ela aparece aqui.
   *
   * O valor NÃO entra novamente em
   * "Recebido no mês".
   */

  const quitadosAntecipadamenteDoMes =
    listaAlugueis.filter(
      (aluguel) => {
        if (
          !foiPagoAntecipadamente(
            aluguel
          )
        ) {
          return false
        }

        const competencia =
          aluguel.competencia.slice(
            0,
            7
          )

        return (
          competencia ===
          mesReferencia
        )
      }
    )

  const totalQuitadoAntecipadamente =
    quitadosAntecipadamenteDoMes.reduce(
      (
        total,
        aluguel
      ) => {
        return (
          total +
          Number(
            aluguel.valor_pago ??
              0
          )
        )
      },
      0
    )

  /*
   * =====================================================
   * A RECEBER DA COMPETÊNCIA
   * =====================================================
   *
   * Aqui trabalhamos com competência.
   *
   * Só entram mensalidades do mês selecionado
   * que ainda não foram pagas.
   *
   * Se a mensalidade já foi paga antecipadamente,
   * ela NÃO entra.
   */

  const aReceberNoMes =
    listaAlugueis.reduce(
      (
        total,
        aluguel
      ) => {
        if (
          aluguel.competencia.slice(
            0,
            7
          ) !== mesReferencia
        ) {
          return total
        }

        const situacaoEfetiva =
          obterSituacaoEfetiva(
            aluguel.situacao,
            aluguel.vencimento
          )

        if (
          situacaoEfetiva ===
            'PAGO' ||
          situacaoEfetiva ===
            'CANCELADO'
        ) {
          return total
        }

        return (
          total +
          calcularValorAtual(
            aluguel,
            dataHoje
          )
        )
      },
      0
    )

  /*
   * =====================================================
   * EM ATRASO DA COMPETÊNCIA SELECIONADA
   * =====================================================
   *
   * Este card também respeita o mês selecionado.
   *
   * Se estivermos visualizando agosto,
   * mostramos os atrasos da competência agosto.
   *
   * Se estivermos visualizando setembro,
   * mostramos os atrasos da competência setembro.
   *
   * Os encargos são calculados até HOJE.
   */

  const totalEmAtraso =
    listaAlugueis.reduce(
      (
        total,
        aluguel
      ) => {
        if (
          aluguel.competencia.slice(
            0,
            7
          ) !== mesReferencia
        ) {
          return total
        }

        const situacaoEfetiva =
          obterSituacaoEfetiva(
            aluguel.situacao,
            aluguel.vencimento
          )

        if (
          situacaoEfetiva !==
          'ATRASADO'
        ) {
          return total
        }

        return (
          total +
          calcularValorAtual(
            aluguel,
            dataHoje
          )
        )
      },
      0
    )

  /*
   * =====================================================
   * MENSALIDADES ATRASADAS DA COMPETÊNCIA
   * =====================================================
   */

  const atrasados =
    listaAlugueis
      .filter(
        (aluguel) => {
          if (
            aluguel.competencia.slice(
              0,
              7
            ) !== mesReferencia
          ) {
            return false
          }

          return (
            obterSituacaoEfetiva(
              aluguel.situacao,
              aluguel.vencimento
            ) ===
            'ATRASADO'
          )
        }
      )
      .slice(
        0,
        5
      )

  /*
   * =====================================================
   * PRÓXIMOS VENCIMENTOS
   * =====================================================
   *
   * Esta informação é OPERACIONAL.
   *
   * Portanto, não depende do mês selecionado.
   * Ela sempre considera hoje + 7 dias.
   */

  const proximosVencimentos =
    listaAlugueis
      .filter(
        (aluguel) => {
          const situacaoEfetiva =
            obterSituacaoEfetiva(
              aluguel.situacao,
              aluguel.vencimento
            )

          if (
            situacaoEfetiva !==
            'ABERTO'
          ) {
            return false
          }

          return (
            aluguel.vencimento >=
              dataHoje &&
            aluguel.vencimento <=
              dataLimiteSeteDias
          )
        }
      )
      .slice(
        0,
        5
      )

  const quantidadeProximos =
    listaAlugueis.filter(
      (aluguel) => {
        const situacaoEfetiva =
          obterSituacaoEfetiva(
            aluguel.situacao,
            aluguel.vencimento
          )

        if (
          situacaoEfetiva !==
          'ABERTO'
        ) {
          return false
        }

        return (
          aluguel.vencimento >=
            dataHoje &&
          aluguel.vencimento <=
            dataLimiteSeteDias
        )
      }
    ).length

  /*
   * =====================================================
   * CONTADORES OPERACIONAIS
   * =====================================================
   */

  const contratosAtivos =
    contratosResultado.count ??
    0

  const imoveisAlugados =
    imoveisResultado.count ??
    0

  const visualizandoMesAtual =
    mesReferencia ===
    mesAtual

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Visão financeira e operacional do
            controle de aluguéis.
          </p>
        </div>

        {/* ================================================
            SELETOR DE MÊS
            ================================================ */}

        <form
          action="/dashboard"
          method="GET"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <label
              htmlFor="mes"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Mês de referência
            </label>

            <select
              id="mes"
              name="mes"
              defaultValue={
                mesReferencia
              }
              className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {mesesDisponiveis.map(
                (mes) => (
                  <option
                    key={
                      mes
                    }
                    value={
                      mes
                    }
                  >
                    {formatarMesExtenso(
                      mes
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Visualizar
          </button>
        </form>
      </div>

      {/* ==================================================
          MÊS SELECIONADO
          ================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Resumo financeiro
          </p>

          <p className="mt-1 text-xl font-bold text-blue-950">
            {formatarMesExtenso(
              mesReferencia
            )}
          </p>
        </div>

        {!visualizandoMesAtual && (
          <Link
            href="/dashboard"
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Voltar ao mês atual
          </Link>
        )}
      </div>

      {/* ==================================================
          RESUMO FINANCEIRO
          ================================================== */}

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Resumo financeiro
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Caixa e competências de{' '}
          {formatarMesExtenso(
            mesReferencia
          )}
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Indicador
          titulo="Recebido no mês"
          valor={formatarMoeda.format(
            recebidoNoMes
          )}
          descricao="Dinheiro que efetivamente entrou neste mês"
          tipo="RECEBIDO"
          icone={
            <Banknote
              size={22}
            />
          }
        />

        <Indicador
          titulo="Pago antecipadamente"
          valor={formatarMoeda.format(
            totalPagoAntecipadamente
          )}
          descricao="Parte do recebido que pertence a meses futuros"
          tipo="ANTECIPADO"
          icone={
            <HandCoins
              size={22}
            />
          }
        />

        <Indicador
          titulo="A receber no mês"
          valor={formatarMoeda.format(
            aReceberNoMes
          )}
          descricao="Competências do mês ainda não quitadas"
          tipo="RECEBER"
          icone={
            <CircleDollarSign
              size={22}
            />
          }
        />

        <Indicador
          titulo="Já quitado antecipadamente"
          valor={formatarMoeda.format(
            totalQuitadoAntecipadamente
          )}
          descricao="Competências deste mês pagas anteriormente"
          tipo="QUITADO"
          icone={
            <CalendarCheck
              size={22}
            />
          }
        />

        <Indicador
          titulo="Em atraso"
          valor={formatarMoeda.format(
            totalEmAtraso
          )}
          descricao="Pendências da competência com encargos atuais"
          tipo="ATRASO"
          icone={
            <TriangleAlert
              size={22}
            />
          }
        />
      </div>

      {/* ==================================================
          AVISO SOBRE OS CARDS
          ================================================== */}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          Os indicadores financeiros possuem funções
          diferentes e não devem ser simplesmente
          somados entre si. Por exemplo, Pago
          antecipadamente já faz parte de Recebido no
          mês, enquanto Em atraso faz parte do valor
          ainda pendente.
        </p>
      </div>

      {/* ==================================================
          PAGAMENTOS ANTECIPADOS RECEBIDOS
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center gap-2">
            <HandCoins
              size={20}
              className="text-violet-600"
            />

            <h2 className="font-semibold text-slate-900">
              Pagamentos antecipados recebidos em{' '}
              {formatarCompetencia(
                mesReferencia
              )}
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Valores que entraram neste mês, mas
            pertencem a competências futuras.
          </p>
        </div>

        {pagamentosAntecipadosNoMes.length ===
        0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">
              Nenhum pagamento antecipado neste mês.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Quando uma competência futura for paga
              neste período, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pagamentosAntecipadosNoMes.map(
              (aluguel) => (
                <Link
                  key={
                    aluguel.id
                  }
                  href={`/alugueis/${aluguel.id}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <InformacaoLista
                      titulo="Contrato"
                      valor={
                        aluguel
                          .contratos
                          ?.numero_contrato ||
                        'Sem número'
                      }
                    />

                    <InformacaoLista
                      titulo="Locatário"
                      valor={
                        aluguel
                          .contratos
                          ?.locatarios
                          ?.nome ||
                        'Não informado'
                      }
                    />

                    <InformacaoLista
                      titulo="Competência paga"
                      valor={formatarCompetencia(
                        aluguel.competencia
                      )}
                    />

                    <InformacaoLista
                      titulo="Pago em"
                      valor={
                        aluguel.data_pagamento
                          ? formatarData(
                              aluguel.data_pagamento
                            )
                          : 'Não informado'
                      }
                    />

                    <InformacaoLista
                      titulo="Valor"
                      valor={formatarMoeda.format(
                        Number(
                          aluguel.valor_pago ??
                            0
                        )
                      )}
                      destaque
                    />
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          COMPETÊNCIAS QUITADAS ANTECIPADAMENTE
          ================================================== */}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50">
        <div className="border-b border-emerald-200 p-6">
          <div className="flex items-center gap-2">
            <CalendarCheck
              size={20}
              className="text-emerald-700"
            />

            <h2 className="font-semibold text-emerald-900">
              Competências de{' '}
              {formatarCompetencia(
                mesReferencia
              )}{' '}
              já quitadas antecipadamente
            </h2>
          </div>

          <p className="mt-1 text-sm text-emerald-800">
            Essas mensalidades pertencem ao mês
            selecionado, mas o dinheiro entrou em
            um mês anterior.
          </p>
        </div>

        {quitadosAntecipadamenteDoMes.length ===
        0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-emerald-900">
              Nenhuma competência deste mês foi
              quitada antecipadamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-emerald-200">
            {quitadosAntecipadamenteDoMes.map(
              (aluguel) => (
                <Link
                  key={
                    aluguel.id
                  }
                  href={`/alugueis/${aluguel.id}`}
                  className="block p-5 transition hover:bg-emerald-100/50"
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <InformacaoLista
                      titulo="Contrato"
                      valor={
                        aluguel
                          .contratos
                          ?.numero_contrato ||
                        'Sem número'
                      }
                    />

                    <InformacaoLista
                      titulo="Locatário"
                      valor={
                        aluguel
                          .contratos
                          ?.locatarios
                          ?.nome ||
                        'Não informado'
                      }
                    />

                    <InformacaoLista
                      titulo="Competência"
                      valor={formatarCompetencia(
                        aluguel.competencia
                      )}
                    />

                    <InformacaoLista
                      titulo="Pago antecipadamente em"
                      valor={
                        aluguel.data_pagamento
                          ? formatarData(
                              aluguel.data_pagamento
                            )
                          : 'Não informado'
                      }
                    />

                    <InformacaoLista
                      titulo="Valor"
                      valor={formatarMoeda.format(
                        Number(
                          aluguel.valor_pago ??
                            0
                        )
                      )}
                      destaque
                    />
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          ATRASOS DA COMPETÊNCIA
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <div className="flex items-center gap-2">
              <TriangleAlert
                size={20}
                className="text-red-600"
              />

              <h2 className="font-semibold text-slate-900">
                Mensalidades em atraso de{' '}
                {formatarCompetencia(
                  mesReferencia
                )}
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Valores ainda não quitados, atualizados
              com multa e juros até hoje.
            </p>
          </div>

          <Link
            href="/alugueis"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
          >
            Ver todos

            <ArrowRight
              size={15}
            />
          </Link>
        </div>

        {atrasados.length ===
        0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-emerald-700">
              Nenhuma mensalidade em atraso nesta
              competência.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {atrasados.map(
              (aluguel) => {
                const valorAtual =
                  calcularValorAtual(
                    aluguel,
                    dataHoje
                  )

                return (
                  <Link
                    key={
                      aluguel.id
                    }
                    href={`/alugueis/${aluguel.id}`}
                    className="block p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {aluguel
                            .contratos
                            ?.locatarios
                            ?.nome ||
                            'Locatário não informado'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {aluguel
                            .contratos
                            ?.imoveis
                            ?.descricao ||
                            'Imóvel não informado'}
                        </p>

                        <p className="mt-2 text-xs text-red-600">
                          Venceu em{' '}
                          {formatarData(
                            aluguel.vencimento
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-red-700">
                          {formatarMoeda.format(
                            valorAtual
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          atualizado hoje
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              }
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          VISÃO OPERACIONAL ATUAL
          ================================================== */}

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Visão operacional atual
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Estes indicadores consideram a situação de
          hoje e não mudam com o mês selecionado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Indicador
          titulo="Contratos ativos"
          valor={String(
            contratosAtivos
          )}
          descricao="Contratos atualmente vigentes"
          tipo="PADRAO"
          icone={
            <FileText
              size={22}
            />
          }
        />

        <Indicador
          titulo="Imóveis alugados"
          valor={String(
            imoveisAlugados
          )}
          descricao="Imóveis com situação Alugado"
          tipo="PADRAO"
          icone={
            <Building2
              size={22}
            />
          }
        />

        <Indicador
          titulo="Próximos 7 dias"
          valor={String(
            quantidadeProximos
          )}
          descricao="Mensalidades abertas que vencem em breve"
          tipo="PROXIMO"
          icone={
            <CalendarClock
              size={22}
            />
          }
        />
      </div>

      {/* ==================================================
          PRÓXIMOS VENCIMENTOS
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock
                size={20}
                className="text-blue-600"
              />

              <h2 className="font-semibold text-slate-900">
                Próximos vencimentos
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Mensalidades que vencem nos próximos
              sete dias a partir de hoje.
            </p>
          </div>

          <Link
            href="/alugueis"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
          >
            Ver todos

            <ArrowRight
              size={15}
            />
          </Link>
        </div>

        {proximosVencimentos.length ===
        0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">
              Nenhum vencimento próximo.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Não existem mensalidades abertas
              vencendo nos próximos sete dias.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {proximosVencimentos.map(
              (aluguel) => (
                <Link
                  key={
                    aluguel.id
                  }
                  href={`/alugueis/${aluguel.id}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {aluguel
                          .contratos
                          ?.locatarios
                          ?.nome ||
                          'Locatário não informado'}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {aluguel
                          .contratos
                          ?.imoveis
                          ?.descricao ||
                          'Imóvel não informado'}
                      </p>

                      <p className="mt-2 text-xs text-blue-600">
                        Vence em{' '}
                        {formatarData(
                          aluguel.vencimento
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatarMoeda.format(
                          Number(
                            aluguel.valor_previsto
                          )
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatarCompetencia(
                          aluguel.competencia
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          EXPLICAÇÃO
          ================================================== */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <p className="font-semibold text-blue-900">
          Caixa x competência
        </p>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          Recebido no mês considera a data em que o
          dinheiro efetivamente entrou. Se uma
          mensalidade futura for paga antecipadamente,
          o valor entra no caixa do mês do pagamento
          e é destacado como Pago antecipadamente.
        </p>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          Ao visualizar o mês da competência, esse
          mesmo valor aparece como Já quitado
          antecipadamente e não entra novamente no
          recebido daquele mês.
        </p>
      </div>
    </div>
  )
}

/*
 * =====================================================
 * INFORMAÇÃO DAS LISTAS
 * =====================================================
 */

function InformacaoLista({
  titulo,
  valor,
  destaque = false,
}: {
  titulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {titulo}
      </p>

      <p
        className={
          destaque
            ? 'mt-1 font-semibold text-slate-900'
            : 'mt-1 text-sm font-medium text-slate-800'
        }
      >
        {valor}
      </p>
    </div>
  )
}

/*
 * =====================================================
 * INDICADOR
 * =====================================================
 */

function Indicador({
  titulo,
  valor,
  descricao,
  tipo,
  icone,
}: {
  titulo: string
  valor: string
  descricao: string

  tipo:
    | 'RECEBIDO'
    | 'ANTECIPADO'
    | 'RECEBER'
    | 'QUITADO'
    | 'ATRASO'
    | 'PROXIMO'
    | 'PADRAO'

  icone: React.ReactNode
}) {
  let card =
    'border-slate-200 bg-white'

  let iconeClasse =
    'bg-slate-100 text-slate-600'

  if (
    tipo === 'RECEBIDO'
  ) {
    card =
      'border-emerald-200 bg-emerald-50'

    iconeClasse =
      'bg-emerald-100 text-emerald-700'
  }

  if (
    tipo === 'ANTECIPADO'
  ) {
    card =
      'border-violet-200 bg-violet-50'

    iconeClasse =
      'bg-violet-100 text-violet-700'
  }

  if (
    tipo === 'RECEBER'
  ) {
    card =
      'border-amber-200 bg-amber-50'

    iconeClasse =
      'bg-amber-100 text-amber-700'
  }

  if (
    tipo === 'QUITADO'
  ) {
    card =
      'border-teal-200 bg-teal-50'

    iconeClasse =
      'bg-teal-100 text-teal-700'
  }

  if (
    tipo === 'ATRASO'
  ) {
    card =
      'border-red-200 bg-red-50'

    iconeClasse =
      'bg-red-100 text-red-700'
  }

  if (
    tipo === 'PROXIMO'
  ) {
    card =
      'border-blue-200 bg-blue-50'

    iconeClasse =
      'bg-blue-100 text-blue-700'
  }

  return (
    <div
      className={`rounded-xl border p-6 ${card}`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconeClasse}`}
      >
        {icone}
      </div>

      <p className="mt-5 text-sm font-medium text-slate-600">
        {titulo}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {valor}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {descricao}
      </p>
    </div>
  )
}