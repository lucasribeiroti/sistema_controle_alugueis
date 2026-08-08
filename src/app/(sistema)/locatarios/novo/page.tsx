import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { criarLocatario } from './actions'

export default function NovoLocatarioPage() {
  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/locatarios"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para locatários
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Novo locatário
        </h1>

        <p className="mt-2 text-slate-500">
          Cadastre uma pessoa ou empresa que aluga seus imóveis.
        </p>
      </div>

      {/* Formulário */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form action={criarLocatario} className="space-y-6">

          {/* Nome */}
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
              placeholder="Digite o nome do locatário"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Tipo de pessoa */}
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
              required
              defaultValue="PF"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="PF">Pessoa física</option>
              <option value="PJ">Pessoa jurídica</option>
            </select>
          </div>

          {/* CPF/CNPJ e Telefone */}
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
                placeholder="Digite o CPF ou CNPJ"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
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
                placeholder="(00) 00000-0000"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* E-mail */}
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
              placeholder="email@exemplo.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Endereço */}
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
              placeholder="Rua, número, bairro, cidade..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Observações */}
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
              placeholder="Informações adicionais sobre o locatário..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/locatarios"
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Salvar locatário
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}