import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function LocatarioDetalhesPage({ params }: Props) {
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
    .select('*')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (error || !locatario) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/locatarios"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para locatários
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {locatario.nome}
            </h1>

            <p className="mt-2 text-slate-500">
              Informações do locatário.
            </p>
          </div>

          <Link
            href={`/locatarios/${locatario.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </div>

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