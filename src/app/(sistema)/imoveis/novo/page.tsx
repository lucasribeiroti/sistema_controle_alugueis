import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { criarImovel } from './actions'

export default function NovoImovelPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/imoveis"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para imóveis
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Novo imóvel
        </h1>

        <p className="mt-2 text-slate-500">
          Cadastre um imóvel para utilização nos contratos de aluguel.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form
          action={criarImovel}
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
                placeholder="Ex.: 1500,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-400">
                Esse valor poderá ser alterado posteriormente em cada contrato.
              </p>
            </div>

            <div>
              <label
                htmlFor="situacao"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Situação
              </label>

              <select
                id="situacao"
                name="situacao"
                defaultValue="DISPONIVEL"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option value="DISPONIVEL">
                  Disponível
                </option>

                <option value="INATIVO">
                  Inativo
                </option>
              </select>

              <p className="mt-1 text-xs text-slate-400">
                A situação Alugado será definida automaticamente por um contrato ativo.
              </p>
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
              placeholder="Informações adicionais sobre o imóvel..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/imoveis"
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Salvar imóvel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}