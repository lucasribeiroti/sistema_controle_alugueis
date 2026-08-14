import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
} from 'lucide-react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { criarContrato } from './actions'

export default async function NovoContratoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * LOCATÁRIOS ATIVOS
   * =====================================================
   */

  const {
    data: locatarios,
    error: erroLocatarios,
  } = await supabase
    .from('locatarios')
    .select(`
      id,
      nome,
      cpf_cnpj
    `)
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .order('nome', {
      ascending: true,
    })

  /*
   * =====================================================
   * IMÓVEIS DISPONÍVEIS
   * =====================================================
   */

  const {
    data: imoveis,
    error: erroImoveis,
  } = await supabase
    .from('imoveis')
    .select(`
      id,
      descricao,
      endereco,
      valor_aluguel_padrao
    `)
    .eq('usuario_id', user.id)
    .eq('situacao', 'DISPONIVEL')
    .order('descricao', {
      ascending: true,
    })

  /*
   * =====================================================
   * LOGS DE ERRO
   * =====================================================
   */

  if (erroLocatarios) {
    console.log(
      'ERRO AO CARREGAR LOCATÁRIOS'
    )

    console.log(
      'message:',
      erroLocatarios.message
    )

    console.log(
      'code:',
      erroLocatarios.code
    )

    console.log(
      'details:',
      erroLocatarios.details
    )

    console.log(
      'hint:',
      erroLocatarios.hint
    )
  }

  if (erroImoveis) {
    console.log(
      'ERRO AO CARREGAR IMÓVEIS'
    )

    console.log(
      'message:',
      erroImoveis.message
    )

    console.log(
      'code:',
      erroImoveis.code
    )

    console.log(
      'details:',
      erroImoveis.details
    )

    console.log(
      'hint:',
      erroImoveis.hint
    )
  }

  /*
   * =====================================================
   * VERIFICAÇÕES
   * =====================================================
   */

  const possuiLocatarios = Boolean(
    !erroLocatarios &&
      locatarios &&
      locatarios.length > 0
  )

  const possuiImoveis = Boolean(
    !erroImoveis &&
      imoveis &&
      imoveis.length > 0
  )

  const podeCriarContrato =
    possuiLocatarios && possuiImoveis

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}
      <div>
        <Link
          href="/contratos"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para contratos
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Novo contrato
        </h1>

        <p className="mt-2 text-slate-500">
          Vincule um locatário ativo a um imóvel
          disponível.
        </p>
      </div>

      {/* ==================================================
          AVISOS
          ================================================== */}

      {!possuiLocatarios && (
        <Aviso
          titulo="Nenhum locatário ativo disponível"
          descricao="Cadastre ou reative um locatário antes de criar um contrato."
          link="/locatarios"
          textoLink="Ir para locatários"
        />
      )}

      {!possuiImoveis && (
        <Aviso
          titulo="Nenhum imóvel disponível"
          descricao="Cadastre ou disponibilize um imóvel antes de criar um contrato."
          link="/imoveis"
          textoLink="Ir para imóveis"
        />
      )}

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form
          action={criarContrato}
          className="space-y-8"
        >
          {/* ==================================================
              DADOS PRINCIPAIS
              ================================================== */}

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Dados do contrato
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informe os dados principais da locação.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Número do contrato */}
            <div>
              <label
                htmlFor="numero_contrato"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Número do contrato
              </label>

              <input
                id="numero_contrato"
                type="text"
                name="numero_contrato"
                required
                placeholder="Ex.: CONT-2026-001"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>

            {/* Tipo */}
            <div>
              <label
                htmlFor="tipo_contrato"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tipo do contrato
              </label>

              <select
                id="tipo_contrato"
                name="tipo_contrato"
                defaultValue="NOVO"
                required
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              >
                <option value="NOVO">
                  Contrato novo
                </option>

                <option value="ANTIGO">
                  Contrato antigo
                </option>
              </select>
            </div>
          </div>

          {/* ==================================================
              LOCATÁRIO
              ================================================== */}

          <div>
            <label
              htmlFor="locatario_id"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Locatário
            </label>

            <select
              id="locatario_id"
              name="locatario_id"
              defaultValue=""
              required
              disabled={!podeCriarContrato}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
            >
              <option
                value=""
                disabled
              >
                Selecione um locatário
              </option>

              {locatarios?.map(
                (locatario) => (
                  <option
                    key={locatario.id}
                    value={locatario.id}
                  >
                    {locatario.nome}

                    {locatario.cpf_cnpj
                      ? ` - ${locatario.cpf_cnpj}`
                      : ''}
                  </option>
                )
              )}
            </select>
          </div>

          {/* ==================================================
              IMÓVEL
              ================================================== */}

          <div>
            <label
              htmlFor="imovel_id"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Imóvel
            </label>

            <select
              id="imovel_id"
              name="imovel_id"
              defaultValue=""
              required
              disabled={!podeCriarContrato}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
            >
              <option
                value=""
                disabled
              >
                Selecione um imóvel
              </option>

              {imoveis?.map((imovel) => (
                <option
                  key={imovel.id}
                  value={imovel.id}
                >
                  {imovel.descricao} -{' '}
                  {imovel.endereco}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Apenas imóveis disponíveis aparecem
              nesta lista.
            </p>
          </div>

          {/* ==================================================
              PERÍODO DO CONTRATO
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Período do contrato
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Defina o início e, se houver, o término
              previsto do contrato.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Data inicial */}
            <div>
              <label
                htmlFor="data_inicio"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Data de início
              </label>

              <input
                id="data_inicio"
                type="date"
                name="data_inicio"
                required
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>

            {/* Data final */}
            <div>
              <label
                htmlFor="data_fim"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Data de término
              </label>

              <input
                id="data_fim"
                type="date"
                name="data_fim"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Pode ficar em branco para contratos
                sem data final definida.
              </p>
            </div>
          </div>

          {/* ==================================================
              VALOR NORMAL
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Mensalidade
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure o valor mensal e o dia normal
              de vencimento.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Valor mensal */}
            <div>
              <label
                htmlFor="valor_mensal"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Valor mensal
              </label>

              <input
                id="valor_mensal"
                type="text"
                inputMode="decimal"
                name="valor_mensal"
                required
                placeholder="Ex.: 1500,00"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>

            {/* Dia do vencimento */}
            <div>
              <label
                htmlFor="dia_vencimento"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Dia normal do vencimento
              </label>

              <input
                id="dia_vencimento"
                type="number"
                name="dia_vencimento"
                min="1"
                max="31"
                required
                placeholder="Ex.: 10"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                As mensalidades seguintes respeitarão
                este dia.
              </p>
            </div>
          </div>

          {/* ==================================================
              PRIMEIRA MENSALIDADE
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarClock size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Primeira mensalidade
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Use estes campos somente quando houver
                  uma condição especial para a primeira
                  cobrança.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Data especial */}
              <div>
                <label
                  htmlFor="data_primeiro_vencimento"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Vencimento da primeira mensalidade
                </label>

                <input
                  id="data_primeiro_vencimento"
                  type="date"
                  name="data_primeiro_vencimento"
                  disabled={!podeCriarContrato}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                />

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Opcional. Pode ser a própria data de
                  início ou outra data combinada antes do
                  primeiro vencimento normal.
                </p>
              </div>

              {/* Valor especial */}
              <div>
                <label
                  htmlFor="valor_primeira_mensalidade"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Valor da primeira mensalidade
                </label>

                <div className="relative">
                  <CircleDollarSign
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="valor_primeira_mensalidade"
                    type="text"
                    inputMode="decimal"
                    name="valor_primeira_mensalidade"
                    placeholder="Ex.: 900,00"
                    disabled={!podeCriarContrato}
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Opcional. Se ficar vazio, será usado
                  o valor mensal normal do contrato.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-blue-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">
                Como funciona?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Se estes campos ficarem vazios, o sistema
                calculará automaticamente o primeiro
                vencimento usando a data de início e o dia
                normal do vencimento.
              </p>

              <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <strong>Exemplo:</strong>
                <br />
                Início: 13/08/2026
                <br />
                Dia normal: 10
                <br />
                Primeira mensalidade especial: vazia
                <br />
                <strong>
                  Resultado: primeiro vencimento em
                  10/09/2026
                </strong>
              </div>
            </div>
          </div>

          {/* ==================================================
              REAJUSTE
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Reajuste
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Preencha somente se o contrato possuir
              regras de reajuste.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Índice */}
            <div>
              <label
                htmlFor="indice_reajuste"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Índice de reajuste
              </label>

              <input
                id="indice_reajuste"
                type="text"
                name="indice_reajuste"
                placeholder="Ex.: IPCA"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>

            {/* Regra */}
            <div>
              <label
                htmlFor="regra_reajuste"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Regra de reajuste
              </label>

              <input
                id="regra_reajuste"
                type="text"
                name="regra_reajuste"
                placeholder="Ex.: Anual"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>

            {/* Data */}
            <div>
              <label
                htmlFor="data_proximo_reajuste"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Próximo reajuste
              </label>

              <input
                id="data_proximo_reajuste"
                type="date"
                name="data_proximo_reajuste"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* ==================================================
              MULTA E JUROS
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Multa e juros
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure os percentuais previstos em caso
              de atraso.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Multa */}
            <div>
              <label
                htmlFor="percentual_multa"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Multa por atraso (%)
              </label>

              <input
                id="percentual_multa"
                type="text"
                inputMode="decimal"
                name="percentual_multa"
                placeholder="Ex.: 2,00"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>

            {/* Juros */}
            <div>
              <label
                htmlFor="percentual_juros"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Juros por atraso (%)
              </label>

              <input
                id="percentual_juros"
                type="text"
                inputMode="decimal"
                name="percentual_juros"
                placeholder="Ex.: 1,00"
                disabled={!podeCriarContrato}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* ==================================================
              OBSERVAÇÕES
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <label
              htmlFor="observacoes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Observações
            </label>

            <textarea
              id="observacoes"
              name="observacoes"
              rows={5}
              placeholder="Informações adicionais sobre o contrato..."
              disabled={!podeCriarContrato}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* ==================================================
              BOTÕES
              ================================================== */}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/contratos"
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={!podeCriarContrato}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Salvar contrato
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Aviso({
  titulo,
  descricao,
  link,
  textoLink,
}: {
  titulo: string
  descricao: string
  link: string
  textoLink: string
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          className="mt-0.5 shrink-0 text-amber-700"
        />

        <div>
          <p className="font-semibold text-amber-900">
            {titulo}
          </p>

          <p className="mt-1 text-sm text-amber-800">
            {descricao}
          </p>

          <Link
            href={link}
            className="mt-3 inline-block text-sm font-semibold text-amber-900 underline"
          >
            {textoLink}
          </Link>
        </div>
      </div>
    </div>
  )
}