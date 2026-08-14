import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleDollarSign,
  UserRound,
} from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { atualizarContrato } from './actions'

type Props = {
  params: Promise<{
    id: string
  }>
}

type ContratoEdicao = {
  id: string

  numero_contrato: string | null
  tipo_contrato: string | null

  data_inicio: string | null
  data_fim: string | null

  valor_mensal: number | string | null
  dia_vencimento: number | null

  data_primeiro_vencimento: string | null
  valor_primeira_mensalidade: number | string | null

  indice_reajuste: string | null
  regra_reajuste: string | null
  data_proximo_reajuste: string | null

  percentual_multa: number | string | null
  percentual_juros: number | string | null

  status: string
  observacoes: string | null

  locatarios: {
    id: string
    nome: string
    cpf_cnpj: string | null
  } | null

  imoveis: {
    id: string
    descricao: string
    endereco: string
  } | null
}

function formatarDecimalParaInput(
  valor: number | string | null
) {
  if (valor === null) {
    return ''
  }

  return String(valor).replace('.', ',')
}

export default async function EditarContratoPage({
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

  /*
   * =====================================================
   * BUSCA O CONTRATO
   * =====================================================
   */

  const { data: contrato, error } = await supabase
    .from('contratos')
    .select(`
      id,
      numero_contrato,
      tipo_contrato,
      data_inicio,
      data_fim,
      valor_mensal,
      dia_vencimento,
      data_primeiro_vencimento,
      valor_primeira_mensalidade,
      indice_reajuste,
      regra_reajuste,
      data_proximo_reajuste,
      percentual_multa,
      percentual_juros,
      status,
      observacoes,
      locatarios (
        id,
        nome,
        cpf_cnpj
      ),
      imoveis (
        id,
        descricao,
        endereco
      )
    `)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  /*
   * =====================================================
   * CONTRATO NÃO ENCONTRADO
   * =====================================================
   */

  if (error || !contrato) {
    console.log(
      'ERRO AO CARREGAR CONTRATO PARA EDIÇÃO'
    )

    if (error) {
      console.log('message:', error.message)
      console.log('code:', error.code)
      console.log('details:', error.details)
      console.log('hint:', error.hint)
    }

    notFound()
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const contratoTipado =
    contrato as unknown as ContratoEdicao

  /*
   * Vincula o ID do contrato à Server Action.
   */

  const atualizarContratoComId =
    atualizarContrato.bind(
      null,
      contratoTipado.id
    )

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div>
        <Link
          href={`/contratos/${contratoTipado.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para o contrato
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                Editar contrato
              </h1>

              <Status
                status={contratoTipado.status}
              />
            </div>

            <p className="mt-2 text-slate-500">
              Atualize as informações do contrato{' '}
              {contratoTipado.numero_contrato ||
                'selecionado'}.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          VÍNCULOS
          ================================================== */}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Locatário */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <UserRound size={20} />
          </div>

          <p className="text-sm font-medium text-slate-500">
            Locatário vinculado
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {contratoTipado.locatarios?.nome ||
              'Não informado'}
          </p>

          {contratoTipado.locatarios?.cpf_cnpj && (
            <p className="mt-1 text-sm text-slate-500">
              {contratoTipado.locatarios.cpf_cnpj}
            </p>
          )}

          <p className="mt-3 text-xs text-slate-500">
            O locatário não pode ser alterado nesta tela.
          </p>
        </div>

        {/* Imóvel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Building2 size={20} />
          </div>

          <p className="text-sm font-medium text-slate-500">
            Imóvel vinculado
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {contratoTipado.imoveis?.descricao ||
              'Não informado'}
          </p>

          {contratoTipado.imoveis?.endereco && (
            <p className="mt-1 text-sm text-slate-500">
              {contratoTipado.imoveis.endereco}
            </p>
          )}

          <p className="mt-3 text-xs text-slate-500">
            O imóvel não pode ser alterado nesta tela.
          </p>
        </div>
      </div>

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form
          action={atualizarContratoComId}
          className="space-y-8"
        >
          {/* ==================================================
              DADOS DO CONTRATO
              ================================================== */}

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Dados do contrato
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informações principais do contrato de aluguel.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Número */}
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
                defaultValue={
                  contratoTipado.numero_contrato ?? ''
                }
                placeholder="Ex.: CONT-2026-001"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
                required
                defaultValue={
                  contratoTipado.tipo_contrato ||
                  'NOVO'
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
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
              PERÍODO
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Período do contrato
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Defina o início e, se houver, o término
              previsto.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Início */}
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
                defaultValue={
                  contratoTipado.data_inicio ?? ''
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Fim */}
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
                defaultValue={
                  contratoTipado.data_fim ?? ''
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Pode ficar em branco para contratos
                sem data final definida.
              </p>
            </div>
          </div>

          {/* ==================================================
              MENSALIDADE NORMAL
              ================================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Mensalidade
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Valor e vencimento normal das mensalidades.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Valor */}
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
                defaultValue={formatarDecimalParaInput(
                  contratoTipado.valor_mensal
                )}
                placeholder="Ex.: 1500,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Dia */}
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
                defaultValue={
                  contratoTipado.dia_vencimento ?? ''
                }
                placeholder="Ex.: 10"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  Configure uma condição especial para a
                  primeira cobrança, caso tenha sido
                  combinada entre locador e locatário.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Primeira data */}
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
                  defaultValue={
                    contratoTipado.data_primeiro_vencimento ??
                    ''
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                />

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Opcional. Pode ser a própria data de
                  início ou uma data combinada antes do
                  primeiro vencimento normal.
                </p>
              </div>

              {/* Primeiro valor */}
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
                    defaultValue={formatarDecimalParaInput(
                      contratoTipado.valor_primeira_mensalidade
                    )}
                    placeholder="Ex.: 900,00"
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-500"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Opcional. Se ficar vazio, será usado
                  o valor mensal normal.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-blue-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">
                Exemplo
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Um contrato iniciado em 13/08/2026 com
                vencimento normal no dia 10 teria o
                primeiro vencimento regular em 10/09/2026.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Se houver uma cobrança especial em
                20/08/2026, informe essa data aqui. A partir
                da mensalidade seguinte, o sistema volta
                ao vencimento normal no dia 10.
              </p>
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
              Regras utilizadas para atualização do valor
              do aluguel.
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
                defaultValue={
                  contratoTipado.indice_reajuste ?? ''
                }
                placeholder="Ex.: IPCA"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
                defaultValue={
                  contratoTipado.regra_reajuste ?? ''
                }
                placeholder="Ex.: Anual"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Próximo reajuste */}
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
                defaultValue={
                  contratoTipado.data_proximo_reajuste ??
                  ''
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
              Percentuais aplicáveis em caso de atraso.
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
                defaultValue={formatarDecimalParaInput(
                  contratoTipado.percentual_multa
                )}
                placeholder="Ex.: 2,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
                defaultValue={formatarDecimalParaInput(
                  contratoTipado.percentual_juros
                )}
                placeholder="Ex.: 1,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
              defaultValue={
                contratoTipado.observacoes ?? ''
              }
              placeholder="Informações adicionais sobre o contrato..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          {/* ==================================================
              BOTÕES
              ================================================== */}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/contratos/${contratoTipado.id}`}
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

function Status({
  status,
}: {
  status: string
}) {
  if (status === 'ENCERRADO') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Encerrado
      </span>
    )
  }

  if (status === 'CANCELADO') {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Cancelado
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      Ativo
    </span>
  )
}