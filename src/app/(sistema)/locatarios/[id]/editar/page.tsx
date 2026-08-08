import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { atualizarLocatario } from './actions'

type EditarLocatarioPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditarLocatarioPage({
  params,
}: EditarLocatarioPageProps) {
  const { id } = await params

  const supabase = await createClient()

  // Verifica o usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Busca o locatário
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
    console.error('ERRO AO CARREGAR LOCATÁRIO:', error)
    notFound()
  }

  // Vincula o ID à Server Action
  const atualizarLocatarioComId = atualizarLocatario.bind(
    null,
    locatario.id
  )

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/locatarios/${locatario.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para o locatário
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Editar locatário
        </h1>

        <p className="mt-2 text-slate-500">
          Atualize as informações de {locatario.nome}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form action={atualizarLocatarioComId} className="space-y-6">
          <div>
            <label
              htmlFor="nome"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nome / Razão social
            </label>

            <input
              id="nome"
              type="text"
              name="nome"
              required
              defaultValue={locatario.nome}
              placeholder="Digite o nome do locatário"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="tipo_pessoa"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Tipo de pessoa
            </label>

            <select
              id="tipo_pessoa"
              name="tipo_pessoa"
              defaultValue={locatario.tipo_pessoa}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            >
              <option value="PF">Pessoa física</option>
              <option value="PJ">Pessoa jurídica</option>
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="cpf_cnpj"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                CPF / CNPJ
              </label>

              <input
                id="cpf_cnpj"
                type="text"
                name="cpf_cnpj"
                defaultValue={locatario.cpf_cnpj ?? ''}
                placeholder="Digite o CPF ou CNPJ"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="telefone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Telefone
              </label>

              <input
                id="telefone"
                type="text"
                name="telefone"
                defaultValue={locatario.telefone ?? ''}
                placeholder="(00) 00000-0000"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              name="email"
              defaultValue={locatario.email ?? ''}
              placeholder="email@exemplo.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="endereco"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Endereço
            </label>

            <input
              id="endereco"
              type="text"
              name="endereco"
              defaultValue={locatario.endereco ?? ''}
              placeholder="Rua, número, bairro, cidade..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="observacoes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Observações
            </label>

            <textarea
              id="observacoes"
              name="observacoes"
              rows={4}
              defaultValue={locatario.observacoes ?? ''}
              placeholder="Informações adicionais sobre o locatário..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/locatarios/${locatario.id}`}
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}