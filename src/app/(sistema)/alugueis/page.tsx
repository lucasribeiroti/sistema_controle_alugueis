import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  CalendarPlus,
  CircleDollarSign,
} from 'lucide-react'

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

const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatarData(data: string | null) {
  if (!data) {
    return '-'
  }

  const [ano, mes, dia] = data.split('-')

  if (!ano || !mes || !dia) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

function formatarCompetencia(
  competencia: string | null
) {
  if (!competencia) {
    return '-'
  }

  const [ano, mes] = competencia.split('-')

  if (!ano || !mes) {
    return competencia
  }

  return `${mes}/${ano}`
}

export default async function AlugueisPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * BUSCA AS MENSALIDADES
   * =====================================================
   */

  const { data: alugueis, error } = await supabase
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
    .eq('usuario_id', user.id)
    .order('vencimento', {
      ascending: false,
    })

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

  if (error) {
    console.log('ERRO SUPABASE ALUGUÉIS:')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)
  }

  /*
   * O Supabase pode inferir relacionamentos aninhados
   * de forma diferente no TypeScript.
   *
   * Informamos explicitamente o formato utilizado
   * nesta página.
   */

  const alugueisTipados =
    alugueis as unknown as AluguelLista[] | null

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
            Gerencie mensalidades, vencimentos e pagamentos
            dos contratos.
          </p>
        </div>

        <Link
          href="/alugueis/gerar"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <CalendarPlus size={18} />
          Gerar mensalidades
        </Link>
      </div>

      {/* ==================================================
          ERRO
          ================================================== */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar os aluguéis.
        </div>
      ) : !alugueisTipados ||
        alugueisTipados.length === 0 ? (
        /* ==================================================
           ESTADO VAZIO
           ================================================== */
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <CircleDollarSign size={28} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Nenhuma mensalidade gerada
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            As mensalidades dos contratos aparecerão aqui
            com competência, vencimento, valor e situação
            do pagamento.
          </p>

          <Link
            href="/alugueis/gerar"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <CalendarPlus size={18} />
            Gerar mensalidades
          </Link>
        </div>
      ) : (
        /* ==================================================
           TABELA
           ================================================== */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Competência
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vencimento
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contrato
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Locatário
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Imóvel
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Valor
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Situação
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {alugueisTipados.map((aluguel) => (
                  <tr
                    key={aluguel.id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* Competência */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/alugueis/${aluguel.id}`}
                        className="font-semibold text-slate-900 transition hover:text-blue-600 hover:underline"
                      >
                        {formatarCompetencia(
                          aluguel.competencia
                        )}
                      </Link>
                    </td>

                    {/* Vencimento */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatarData(
                        aluguel.vencimento
                      )}
                    </td>

                    {/* Contrato */}
                    <td className="px-6 py-4">
                      {aluguel.contratos?.id ? (
                        <Link
                          href={`/contratos/${aluguel.contratos.id}`}
                          className="text-sm font-medium text-slate-700 transition hover:text-blue-600 hover:underline"
                        >
                          {aluguel.contratos
                            .numero_contrato ||
                            'Sem número'}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">
                          -
                        </span>
                      )}
                    </td>

                    {/* Locatário */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {aluguel.contratos?.locatarios
                        ?.nome || '-'}
                    </td>

                    {/* Imóvel */}
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {aluguel.contratos?.imoveis
                        ?.descricao || '-'}
                    </td>

                    {/* Valor */}
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {formatarMoeda.format(
                        Number(
                          aluguel.valor_previsto
                        )
                      )}
                    </td>

                    {/* Situação */}
                    <td className="px-6 py-4">
                      <Situacao
                        situacao={aluguel.situacao}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Situacao({
  situacao,
}: {
  situacao: string
}) {
  if (situacao === 'PAGO') {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Pago
      </span>
    )
  }

  if (situacao === 'ATRASADO') {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Atrasado
      </span>
    )
  }

  if (situacao === 'CANCELADO') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Cancelado
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Aberto
    </span>
  )
}