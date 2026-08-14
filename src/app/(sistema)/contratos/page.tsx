import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

type ContratoLista = {
  id: string
  numero_contrato: string | null
  tipo_contrato: string | null
  data_inicio: string | null
  data_fim: string | null
  valor_mensal: number | string | null
  dia_vencimento: number | null
  status: string
  locatarios: {
    nome: string
  } | null
  imoveis: {
    descricao: string
    endereco: string
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

  return `${dia}/${mes}/${ano}`
}

export default async function ContratosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: contratos, error } = await supabase
    .from('contratos')
    .select(`
      id,
      numero_contrato,
      tipo_contrato,
      data_inicio,
      data_fim,
      valor_mensal,
      dia_vencimento,
      status,
      locatarios (
        nome
      ),
      imoveis (
        descricao,
        endereco
      )
    `)
    .eq('usuario_id', user.id)
    .order('data_inicio', {
      ascending: false,
    })

  if (error) {
    console.log('ERRO SUPABASE CONTRATOS:')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)
  }

  const contratosTipados =
    contratos as unknown as ContratoLista[] | null

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Contratos
          </h1>

          <p className="mt-2 text-slate-500">
            Gerencie os contratos de aluguel dos seus imóveis.
          </p>
        </div>

        <Link
          href="/contratos/novo"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo contrato
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar os contratos.
        </div>
      ) : !contratosTipados ||
        contratosTipados.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FileText size={26} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Nenhum contrato cadastrado
          </h2>

          <p className="mt-2 max-w-md text-sm text-slate-500">
            Crie seu primeiro contrato vinculando um locatário
            a um imóvel disponível.
          </p>

          <Link
            href="/contratos/novo"
            className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Criar contrato
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
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
                    Início
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Valor
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {contratosTipados.map((contrato) => (
                  <tr
                    key={contrato.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/contratos/${contrato.id}`}
                        className="font-medium text-slate-900 transition hover:text-blue-600 hover:underline"
                      >
                        {contrato.numero_contrato ||
                          'Sem número'}
                      </Link>

                      <p className="mt-1 text-xs text-slate-500">
                        {contrato.tipo_contrato === 'ANTIGO'
                          ? 'Contrato antigo'
                          : 'Contrato novo'}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {contrato.locatarios?.nome || '-'}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {contrato.imoveis?.descricao || '-'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {contrato.imoveis?.endereco || ''}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatarData(contrato.data_inicio)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {contrato.valor_mensal !== null
                        ? formatarMoeda.format(
                            Number(
                              contrato.valor_mensal
                            )
                          )
                        : '-'}
                    </td>

                    <td className="px-6 py-4">
                      <Status status={contrato.status} />
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

function Status({
  status,
}: {
  status: string
}) {
  if (status === 'ENCERRADO') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Encerrado
      </span>
    )
  }

  if (status === 'CANCELADO') {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Cancelado
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Ativo
    </span>
  )
}