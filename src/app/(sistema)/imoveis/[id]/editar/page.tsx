import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { atualizarImovel } from './actions'

type EditarImovelPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditarImovelPage({
  params,
}: EditarImovelPageProps) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: imovel, error } = await supabase
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
      observacoes
    `)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (error || !imovel) {
    console.log('ERRO AO CARREGAR IMÓVEL')
    console.log('message:', error?.message)
    console.log('code:', error?.code)
    console.log('details:', error?.details)
    console.log('hint:', error?.hint)

    notFound()
  }

  const atualizarImovelComId = atualizarImovel.bind(
    null,
    imovel.id
  )

  const imovelAlugado = imovel.situacao === 'ALUGADO'

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/imoveis/${imovel.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para o imóvel
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Editar imóvel
        </h1>

        <p className="mt-2 text-slate-500">
          Atualize as informações de {imovel.descricao}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form
          action={atualizarImovelComId}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="descricao"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Descrição
            </label>

            <input
              id="descricao"
              type="text"
              name="descricao"
              required
              defaultValue={imovel.descricao}
              placeholder="Ex.: Apartamento 101"
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
              required
              defaultValue={imovel.endereco}
              placeholder="Rua, número, bairro, cidade..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="codigo_iptu"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Código do IPTU
              </label>

              <input
                id="codigo_iptu"
                type="text"
                name="codigo_iptu"
                defaultValue={imovel.codigo_iptu ?? ''}
                placeholder="Código do IPTU"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="uc_energia"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                UC da energia
              </label>

              <input
                id="uc_energia"
                type="text"
                name="uc_energia"
                defaultValue={imovel.uc_energia ?? ''}
                placeholder="Unidade consumidora"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="uc_agua"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                UC da água
              </label>

              <input
                id="uc_agua"
                type="text"
                name="uc_agua"
                defaultValue={imovel.uc_agua ?? ''}
                placeholder="Unidade consumidora"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="valor_aluguel_padrao"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Valor padrão do aluguel
              </label>

              <input
                id="valor_aluguel_padrao"
                type="text"
                inputMode="decimal"
                name="valor_aluguel_padrao"
                defaultValue={
                  imovel.valor_aluguel_padrao !== null
                    ? String(imovel.valor_aluguel_padrao)
                        .replace('.', ',')
                    : ''
                }
                placeholder="Ex.: 1500,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Esse valor funciona como referência para novos contratos.
              </p>
            </div>

            <div>
              <label
                htmlFor="situacao"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Situação
              </label>

              {imovelAlugado ? (
                <>
                  <input
                    type="hidden"
                    name="situacao"
                    value="ALUGADO"
                  />

                  <div className="flex min-h-[50px] items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-medium text-blue-700">
                    Alugado
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    A situação deste imóvel é controlada pelo contrato ativo.
                  </p>
                </>
              ) : (
                <>
                  <select
                    id="situacao"
                    name="situacao"
                    defaultValue={imovel.situacao}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="DISPONIVEL">
                      Disponível
                    </option>

                    <option value="INATIVO">
                      Inativo
                    </option>
                  </select>

                  <p className="mt-1 text-xs text-slate-500">
                    A situação Alugado será controlada automaticamente pelos contratos.
                  </p>
                </>
              )}
            </div>
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
              defaultValue={imovel.observacoes ?? ''}
              placeholder="Informações adicionais sobre o imóvel..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/imoveis/${imovel.id}`}
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