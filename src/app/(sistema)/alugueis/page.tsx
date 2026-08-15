import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  FileText,
} from 'lucide-react'

import {
  obterSituacaoEfetiva,
  traduzirSituacaoAluguel,
  type SituacaoAluguel,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'

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

    locatarios: {
      nome: string
    } | null

    imoveis: {
      descricao: string
    } | null
  } | null
}

const formatarMoeda = new Intl.NumberFormat(
  'pt-BR',
  {
    style: 'currency',
    currency: 'BRL',
  }
)

function formatarData(
  data: string | null
) {
  if (!data) {
    return 'Não informado'
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

function formatarValor(
  valor: number | string | null
) {
  if (valor === null) {
    return 'Não informado'
  }

  const numero =
    Number(valor)

  if (
    !Number.isFinite(numero)
  ) {
    return 'Não informado'
  }

  return formatarMoeda.format(
    numero
  )
}

export default async function AlugueisPage() {
  const supabase =
    await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  const possuiAlugueis =
    Boolean(
      !error &&
        alugueisTipados &&
        alugueisTipados.length > 0
    )

  /*
   * =====================================================
   * CONTADORES
   * =====================================================
   *
   * Aqui usamos a situação EFETIVA.
   *
   * Portanto, uma mensalidade que está
   * ABERTO no banco pode ser contada como
   * ATRASADO se o vencimento já passou.
   */

  const resumo =
    alugueisTipados?.reduce(
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
          acumulador.cancelados += 1
        }

        return acumulador
      },
      {
        pagos: 0,
        abertos: 0,
        atrasados: 0,
        cancelados: 0,
      }
    ) ?? {
      pagos: 0,
      abertos: 0,
      atrasados: 0,
      cancelados: 0,
    }

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
          RESUMO
          ================================================== */}

      {possuiAlugueis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Resumo
            titulo="Abertos"
            valor={resumo.abertos}
            tipo="ABERTO"
          />

          <Resumo
            titulo="Atrasados"
            valor={resumo.atrasados}
            tipo="ATRASADO"
          />

          <Resumo
            titulo="Pagos"
            valor={resumo.pagos}
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
          Não foi possível carregar
          as mensalidades.
        </div>
      )}

      {/* ==================================================
          SEM MENSALIDADES
          ================================================== */}

      {!error &&
        !possuiAlugueis && (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <CalendarDays
                size={26}
              />
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              Nenhuma mensalidade
              encontrada
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Gere as mensalidades de
              um contrato para começar
              a acompanhar os
              vencimentos e pagamentos.
            </p>

            <Link
              href="/alugueis/gerar"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <CalendarPlus
                size={18}
              />

              Gerar mensalidades
            </Link>
          </div>
        )}

      {/* ==================================================
          TABELA
          ================================================== */}

      {possuiAlugueis && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
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
                    Situação
                  </Cabecalho>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {alugueisTipados?.map(
                  (aluguel) => {
                    /*
                     * ========================================
                     * SITUAÇÃO EFETIVA
                     * ========================================
                     */

                    const situacaoEfetiva =
                      obterSituacaoEfetiva(
                        aluguel.situacao,
                        aluguel.vencimento
                      )

                    return (
                      <tr
                        key={
                          aluguel.id
                        }
                        className="transition hover:bg-slate-50"
                      >
                        {/* Competência */}

                        <Celula>
                          <Link
                            href={`/alugueis/${aluguel.id}`}
                            className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
                          >
                            {formatarCompetencia(
                              aluguel.competencia
                            )}
                          </Link>
                        </Celula>

                        {/* Vencimento */}

                        <Celula>
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={16}
                              className={
                                situacaoEfetiva ===
                                'ATRASADO'
                                  ? 'text-red-500'
                                  : 'text-slate-400'
                              }
                            />

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
                          </div>
                        </Celula>

                        {/* Contrato */}

                        <Celula>
                          {aluguel
                            .contratos
                            ?.id ? (
                            <Link
                              href={`/contratos/${aluguel.contratos.id}`}
                              className="inline-flex items-center gap-2 text-slate-700 transition hover:text-blue-600"
                            >
                              <FileText
                                size={16}
                                className="text-slate-400"
                              />

                              {aluguel
                                .contratos
                                .numero_contrato ||
                                'Sem número'}
                            </Link>
                          ) : (
                            'Não informado'
                          )}
                        </Celula>

                        {/* Locatário */}

                        <Celula>
                          {aluguel
                            .contratos
                            ?.locatarios
                            ?.nome ||
                            'Não informado'}
                        </Celula>

                        {/* Imóvel */}

                        <Celula>
                          {aluguel
                            .contratos
                            ?.imoveis
                            ?.descricao ||
                            'Não informado'}
                        </Celula>

                        {/* Valor */}

                        <Celula>
                          <div className="flex items-center gap-2 font-medium text-slate-900">
                            <CircleDollarSign
                              size={16}
                              className="text-slate-400"
                            />

                            {formatarValor(
                              aluguel.valor_previsto
                            )}
                          </div>
                        </Celula>

                        {/* Situação */}

                        <Celula>
                          <Situacao
                            situacao={
                              situacaoEfetiva
                            }
                          />
                        </Celula>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================
          EXPLICAÇÃO DO ATRASO
          ================================================== */}

      {possuiAlugueis && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-700">
            Situação das mensalidades
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Uma mensalidade não paga
            passa a ser exibida como
            atrasada automaticamente a
            partir do dia seguinte ao
            vencimento.
          </p>
        </div>
      )}
    </div>
  )
}

/*
 * =====================================================
 * CABEÇALHO DA TABELA
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
      className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
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
    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
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
  situacao: SituacaoAluguel
}) {
  const texto =
    traduzirSituacaoAluguel(
      situacao
    )

  if (
    situacao === 'PAGO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {texto}
      </span>
    )
  }

  if (
    situacao === 'ATRASADO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        {texto}
      </span>
    )
  }

  if (
    situacao === 'CANCELADO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {texto}
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {texto}
    </span>
  )
}