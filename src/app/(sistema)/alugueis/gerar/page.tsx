import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  FileText,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { gerarMensalidades } from './actions'

type ContratoGeracao = {
  id: string

  numero_contrato: string | null
  tipo_contrato: string | null

  data_inicio: string
  data_fim: string | null

  valor_mensal: number | string
  dia_vencimento: number

  data_primeiro_vencimento: string | null
  valor_primeira_mensalidade:
    | number
    | string
    | null

  status: string

  locatarios: {
    nome: string
  } | null

  imoveis: {
    descricao: string
  } | null
}

const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatarData(data: string | null) {
  if (!data) {
    return 'Sem data final'
  }

  const [ano, mes, dia] = data.split('-')

  if (!ano || !mes || !dia) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

function formatarValor(
  valor: number | string | null
) {
  if (valor === null) {
    return null
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return null
  }

  return formatarMoeda.format(numero)
}

export default async function GerarMensalidadesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * BUSCA CONTRATOS
   * =====================================================
   *
   * Contratos cancelados não participam.
   *
   * Contratos ativos e encerrados podem aparecer,
   * porque também podemos precisar gerar o histórico
   * de um contrato já encerrado.
   */

  const {
    data: contratos,
    error,
  } = await supabase
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
      status,
      locatarios (
        nome
      ),
      imoveis (
        descricao
      )
    `)
    .eq('usuario_id', user.id)
    .neq('status', 'CANCELADO')
    .order('data_inicio', {
      ascending: false,
    })

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

  if (error) {
    console.log(
      'ERRO AO CARREGAR CONTRATOS PARA GERAÇÃO'
    )

    console.log(
      'message:',
      error.message
    )

    console.log(
      'code:',
      error.code
    )

    console.log(
      'details:',
      error.details
    )

    console.log(
      'hint:',
      error.hint
    )
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const contratosTipados =
    contratos as unknown as ContratoGeracao[] | null

  const possuiContratos = Boolean(
    !error &&
      contratosTipados &&
      contratosTipados.length > 0
  )

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div>
        <Link
          href="/alugueis"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para aluguéis
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Gerar mensalidades
        </h1>

        <p className="mt-2 text-slate-500">
          Gere automaticamente as cobranças mensais de um
          contrato.
        </p>
      </div>

      {/* ==================================================
          ERRO
          ================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar os contratos.
        </div>
      )}

      {/* ==================================================
          SEM CONTRATOS
          ================================================== */}

      {!error && !possuiContratos && (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FileText size={26} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Nenhum contrato disponível
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            É necessário possuir pelo menos um contrato
            ativo ou encerrado para gerar mensalidades.
          </p>

          <Link
            href="/contratos"
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Ir para contratos
          </Link>
        </div>
      )}

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      {possuiContratos && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <form
            action={gerarMensalidades}
            className="space-y-8"
          >
            {/* ==============================================
                SELEÇÃO DO CONTRATO
                ============================================== */}

            <div>
              <label
                htmlFor="contrato_id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Contrato
              </label>

              <select
                id="contrato_id"
                name="contrato_id"
                defaultValue=""
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option
                  value=""
                  disabled
                >
                  Selecione um contrato
                </option>

                {contratosTipados?.map(
                  (contrato) => (
                    <option
                      key={contrato.id}
                      value={contrato.id}
                    >
                      {contrato.numero_contrato ||
                        'Sem número'}
                      {' - '}
                      {contrato.locatarios?.nome ||
                        'Locatário não informado'}
                      {' - '}
                      {contrato.imoveis?.descricao ||
                        'Imóvel não informado'}
                      {' - '}
                      {traduzirStatus(
                        contrato.status
                      )}
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Selecione o contrato cujas mensalidades
                deverão ser geradas. Contratos cancelados
                não aparecem nesta lista.
              </p>
            </div>

            {/* ==============================================
                EXPLICAÇÃO
                ============================================== */}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <CalendarPlus
                  size={22}
                  className="mt-0.5 shrink-0 text-blue-700"
                />

                <div>
                  <p className="font-semibold text-blue-900">
                    Como será feita a geração
                  </p>

                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    O sistema usa a data de início, o dia
                    normal do vencimento, o valor mensal e,
                    quando existirem, as regras especiais da
                    primeira mensalidade.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    Contratos com data final serão gerados
                    até o término. Contratos sem data final
                    receberão inicialmente 12 mensalidades.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    Competências que já existirem não serão
                    duplicadas.
                  </p>
                </div>
              </div>
            </div>

            {/* ==============================================
                CONTRATOS DISPONÍVEIS
                ============================================== */}

            <div className="border-t border-slate-200 pt-8">
              <h2 className="text-lg font-semibold text-slate-900">
                Contratos disponíveis
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Confira abaixo as regras financeiras de cada
                contrato antes de gerar.
              </p>
            </div>

            <div className="space-y-4">
              {contratosTipados?.map(
                (contrato) => (
                  <div
                    key={contrato.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                  >
                    {/* Cabeçalho do contrato */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-slate-900">
                            {contrato.numero_contrato ||
                              'Contrato sem número'}
                          </p>

                          <Status
                            status={contrato.status}
                          />
                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {contrato.locatarios?.nome ||
                            'Locatário não informado'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {contrato.imoveis?.descricao ||
                            'Imóvel não informado'}
                        </p>
                      </div>

                      <Link
                        href={`/contratos/${contrato.id}`}
                        className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
                      >
                        Ver contrato
                      </Link>
                    </div>

                    {/* Dados normais */}
                    <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2 lg:grid-cols-4">
                      {/* Início */}
                      <InformacaoContrato
                        icone={
                          <CalendarDays size={18} />
                        }
                        titulo="Início"
                        valor={formatarData(
                          contrato.data_inicio
                        )}
                      />

                      {/* Fim */}
                      <InformacaoContrato
                        icone={
                          <CalendarDays size={18} />
                        }
                        titulo="Término"
                        valor={formatarData(
                          contrato.data_fim
                        )}
                      />

                      {/* Valor */}
                      <InformacaoContrato
                        icone={
                          <CircleDollarSign
                            size={18}
                          />
                        }
                        titulo="Valor mensal"
                        valor={
                          formatarValor(
                            contrato.valor_mensal
                          ) || 'Não informado'
                        }
                      />

                      {/* Vencimento */}
                      <InformacaoContrato
                        icone={
                          <CalendarDays size={18} />
                        }
                        titulo="Vencimento normal"
                        valor={`Dia ${contrato.dia_vencimento}`}
                      />
                    </div>

                    {/* Primeira mensalidade */}
                    <div className="mt-5 rounded-lg border border-blue-200 bg-white p-5">
                      <p className="text-sm font-semibold text-slate-900">
                        Primeira mensalidade
                      </p>

                      <div className="mt-4 grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Primeiro vencimento
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {contrato.data_primeiro_vencimento
                              ? formatarData(
                                  contrato.data_primeiro_vencimento
                                )
                              : 'Calculado automaticamente'}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {contrato.data_primeiro_vencimento
                              ? 'Data especial definida no contrato.'
                              : 'Será calculado pela data de início e pelo dia normal do vencimento.'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Primeiro valor
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {contrato.valor_primeira_mensalidade !==
                            null
                              ? formatarValor(
                                  contrato.valor_primeira_mensalidade
                                )
                              : formatarValor(
                                  contrato.valor_mensal
                                )}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {contrato.valor_primeira_mensalidade !==
                            null
                              ? 'Valor especial definido para a primeira mensalidade.'
                              : 'Será utilizado o mesmo valor mensal normal.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* ==============================================
                BOTÕES
                ============================================== */}

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
              <Link
                href="/alugueis"
                className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                <CalendarPlus size={18} />
                Gerar mensalidades
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function InformacaoContrato({
  icone,
  titulo,
  valor,
}: {
  icone: React.ReactNode
  titulo: string
  valor: string
}) {
  return (
    <div>
      <div className="mb-2 text-blue-600">
        {icone}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {valor}
      </p>
    </div>
  )
}

function traduzirStatus(
  status: string
) {
  if (status === 'ENCERRADO') {
    return 'Encerrado'
  }

  if (status === 'CANCELADO') {
    return 'Cancelado'
  }

  return 'Ativo'
}

function Status({
  status,
}: {
  status: string
}) {
  if (status === 'ENCERRADO') {
    return (
      <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
        Encerrado
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Ativo
    </span>
  )
}