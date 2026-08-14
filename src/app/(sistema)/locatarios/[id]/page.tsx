import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Pencil,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { alterarStatusLocatario } from './actions'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function LocatarioDetalhesPage({
  params,
}: Props) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: locatario, error } = await supabase
    .from('locatarios')
    .select(`
      id,
      nome,
      tipo_pessoa,
      cpf_cnpj,
      telefone,
      email,
      endereco,
      observacoes,
      ativo
    `)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (error || !locatario) {
    notFound()
  }

  const alterarStatusComDados = alterarStatusLocatario.bind(
    null,
    locatario.id,
    locatario.ativo
  )

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/locatarios"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para locatários
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {locatario.nome}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  locatario.ativo
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {locatario.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              Informações do locatário.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Ativar / Inativar */}
            <form action={alterarStatusComDados}>
              <button
                type="submit"
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium text-white transition ${
                  locatario.ativo
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {locatario.ativo ? (
                  <>
                    <CircleX size={18} />
                    Inativar
                  </>
                ) : (
                  <>
                    <CircleCheck size={18} />
                    Reativar
                  </>
                )}
              </button>
            </form>

            {/* Editar */}
            <Link
              href={`/locatarios/${locatario.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Pencil size={18} />
              Editar
            </Link>
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Nome / Razão social"
            valor={locatario.nome}
          />

          <Campo
            titulo="Tipo de pessoa"
            valor={
              locatario.tipo_pessoa === 'PF'
                ? 'Pessoa Física'
                : 'Pessoa Jurídica'
            }
          />

          <Campo
            titulo="CPF / CNPJ"
            valor={locatario.cpf_cnpj}
          />

          <Campo
            titulo="Telefone"
            valor={locatario.telefone}
          />

          <Campo
            titulo="E-mail"
            valor={locatario.email}
          />

          <Campo
            titulo="Status"
            valor={locatario.ativo ? 'Ativo' : 'Inativo'}
          />

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Endereço"
              valor={locatario.endereco}
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Observações"
              valor={locatario.observacoes}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({
  titulo,
  valor,
}: {
  titulo: string
  valor: string | null | undefined
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 text-base text-slate-900">
        {valor || 'Não informado'}
      </p>
    </div>
  )
}