import Link from 'next/link'

import {
  ArrowLeft,
} from 'lucide-react'

import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import FormularioEditarLocatario from './FormularioEditarLocatario'

type EditarLocatarioPageProps = {
  params: Promise<{
    id: string
  }>
}

type Locatario = {
  id: string
  nome: string
  tipo_pessoa: string
  cpf_cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cep: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  ativo: boolean
}

export default async function EditarLocatarioPage({
  params,
}: EditarLocatarioPageProps) {
  const {
    id,
  } = await params

  const supabase =
    await createClient()

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
   * BUSCA
   * =====================================================
   */

  const {
    data: locatario,
    error,
  } = await supabase
    .from('locatarios')
    .select(`
      id,
      nome,
      tipo_pessoa,
      cpf_cnpj,
      telefone,
      email,
      endereco,
      cep,
      cidade,
      estado,
      observacoes,
      ativo
    `)
    .eq(
      'id',
      id
    )
    .eq(
      'usuario_id',
      user.id
    )
    .single()

  if (
    error ||
    !locatario
  ) {
    console.error(
      'ERRO AO CARREGAR LOCATÁRIO:',
      error
    )

    notFound()
  }

  const locatarioTipado =
    locatario as Locatario

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/locatarios/${locatarioTipado.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft
            size={16}
          />

          Voltar para o locatário
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Editar locatário
        </h1>

        <p className="mt-2 text-slate-500">
          Atualize as informações de{' '}
          {locatarioTipado.nome}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <FormularioEditarLocatario
          locatario={
            locatarioTipado
          }
        />
      </div>
    </div>
  )
}