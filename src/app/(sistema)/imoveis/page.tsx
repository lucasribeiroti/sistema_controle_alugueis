import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export default async function ImoveisPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: imoveis, error } = await supabase
    .from('imoveis')
    .select(`
      id,
      descricao,
      endereco,
      codigo_iptu,
      uc_energia,
      uc_agua,
      valor_aluguel_padrao,
      situacao,
      criado_em
    `)
    .eq('usuario_id', user.id)
    .order('descricao', { ascending: true })

  if (error) {
    console.log('ERRO SUPABASE IMOVEIS:')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Imóveis
          </h1>

          <p className="mt-2 text-slate-500">
            Gerencie os imóveis disponíveis para locação.
          </p>
        </div>

        <Link
          href="/imoveis/novo"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo imóvel
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar os imóveis.
        </div>
      ) : !imoveis || imoveis.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Building2 size={26} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Nenhum imóvel cadastrado
          </h2>

          <p className="mt-2 max-w-md text-sm text-slate-500">
            Cadastre seu primeiro imóvel para começar a criar contratos
            e controlar os aluguéis.
          </p>

          <Link
            href="/imoveis/novo"
            className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Cadastrar imóvel
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Imóvel
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Endereço
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    IPTU
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Valor padrão
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Situação
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {imoveis.map((imovel) => (
                  <tr
                    key={imovel.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium">
                      <Link
                        href={`/imoveis/${imovel.id}`}
                        className="text-slate-900 transition hover:text-blue-600 hover:underline"
                      >
                        {imovel.descricao}
                      </Link>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {imovel.endereco}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {imovel.codigo_iptu || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {imovel.valor_aluguel_padrao !== null
                        ? formatarMoeda.format(
                            Number(imovel.valor_aluguel_padrao)
                          )
                        : '-'}
                    </td>

                    <td className="px-6 py-4">
                      <Situacao situacao={imovel.situacao} />
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
  if (situacao === 'ALUGADO') {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        Alugado
      </span>
    )
  }

  if (situacao === 'INATIVO') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Inativo
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Disponível
    </span>
  )
}