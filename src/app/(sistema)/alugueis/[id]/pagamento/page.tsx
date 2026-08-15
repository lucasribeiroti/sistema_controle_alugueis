import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Info,
  TriangleAlert,
} from 'lucide-react'

import {
  obterSituacaoEfetiva,
  traduzirSituacaoAluguel,
  type SituacaoAluguel,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'
import { registrarPagamento } from './actions'

type Props = {
  params: Promise<{
    id: string
  }>
}

type MensalidadePagamento = {
  id: string

  competencia: string
  vencimento: string

  valor_previsto: number | string

  data_pagamento: string | null
  valor_pago: number | string | null

  multa: number | string | null
  juros: number | string | null
  desconto: number | string | null

  situacao: string

  contratos: {
    id: string
    numero_contrato: string | null

    locatarios: {
      nome: string
    } | null

    imoveis: {
      descricao: string
    } | null
  } | null
}

const formatarMoeda = new Intl.NumberFormat(
  'pt-BR',
  {
    style: 'currency',
    currency: 'BRL',
  }
)

function formatarData(
  data: string | null
) {
  if (!data) {
    return 'Não informado'
  }

  const [ano, mes, dia] =
    data.split('-')

  if (!ano || !mes || !dia) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

function formatarCompetencia(
  competencia: string | null
) {
  if (!competencia) {
    return 'Não informado'
  }

  const [ano, mes] =
    competencia.split('-')

  if (!ano || !mes) {
    return competencia
  }

  return `${mes}/${ano}`
}

function formatarDecimalParaInput(
  valor: number | string | null
) {
  if (valor === null) {
    return ''
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return ''
  }

  return numero.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )
}

export default async function RegistrarPagamentoPage({
  params,
}: Props) {
  const { id } = await params

  const supabase =
    await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * BUSCA A MENSALIDADE
   * =====================================================
   */

  const {
    data: mensalidade,
    error,
  } = await supabase
    .from('alugueis')
    .select(`
      id,
      competencia,
      vencimento,
      valor_previsto,
      data_pagamento,
      valor_pago,
      multa,
      juros,
      desconto,
      situacao,
      contratos (
        id,
        numero_contrato,
        locatarios (
          nome
        ),
        imoveis (
          descricao
        )
      )
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

  /*
   * =====================================================
   * NÃO ENCONTRADO
   * =====================================================
   */

  if (
    error ||
    !mensalidade
  ) {
    console.log(
      'ERRO AO CARREGAR MENSALIDADE PARA PAGAMENTO'
    )

    if (error) {
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

    notFound()
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const mensalidadeTipada =
    mensalidade as unknown as MensalidadePagamento

  /*
   * =====================================================
   * SITUAÇÃO EFETIVA
   * =====================================================
   */

  const situacaoEfetiva =
    obterSituacaoEfetiva(
      mensalidadeTipada.situacao,
      mensalidadeTipada.vencimento
    )

  /*
   * =====================================================
   * NÃO PERMITE PAGAR NOVAMENTE
   * =====================================================
   */

  if (
    situacaoEfetiva ===
    'PAGO'
  ) {
    redirect(
      `/alugueis/${mensalidadeTipada.id}`
    )
  }

  /*
   * =====================================================
   * NÃO PERMITE PAGAR CANCELADA
   * =====================================================
   */

  if (
    situacaoEfetiva ===
    'CANCELADO'
  ) {
    redirect(
      `/alugueis/${mensalidadeTipada.id}`
    )
  }

  /*
   * =====================================================
   * VERIFICA SE ESTÁ ATRASADA
   * =====================================================
   */

  const mensalidadeAtrasada =
    situacaoEfetiva ===
    'ATRASADO'

  /*
   * =====================================================
   * SERVER ACTION COM ID
   * =====================================================
   */

  const registrarPagamentoComId =
    registrarPagamento.bind(
      null,
      mensalidadeTipada.id
    )

  /*
   * =====================================================
   * VALORES
   * =====================================================
   */

  const valorPrevisto =
    Number(
      mensalidadeTipada.valor_previsto
    )

  const multaAtual =
    Number(
      mensalidadeTipada.multa ?? 0
    )

  const jurosAtuais =
    Number(
      mensalidadeTipada.juros ?? 0
    )

  const descontoAtual =
    Number(
      mensalidadeTipada.desconto ?? 0
    )

  const totalAtual =
    valorPrevisto +
    multaAtual +
    jurosAtuais -
    descontoAtual

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div>
        <Link
          href={`/alugueis/${mensalidadeTipada.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />

          Voltar para a mensalidade
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                Registrar pagamento
              </h1>

              <Situacao
                situacao={
                  situacaoEfetiva
                }
              />
            </div>

            <p className="mt-2 text-slate-500">
              Registre o recebimento da mensalidade{' '}
              {formatarCompetencia(
                mensalidadeTipada.competencia
              )}
              .
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          AVISO DE ATRASO
          ================================================== */}

      {mensalidadeAtrasada && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <TriangleAlert
              size={22}
              className="mt-0.5 shrink-0 text-red-700"
            />

            <div>
              <p className="font-semibold text-red-900">
                Pagamento em atraso
              </p>

              <p className="mt-1 text-sm leading-6 text-red-800">
                Esta mensalidade venceu em{' '}
                <strong>
                  {formatarData(
                    mensalidadeTipada.vencimento
                  )}
                </strong>{' '}
                e ainda não possui pagamento registrado.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-800">
                Confira se devem ser aplicados multa ou
                juros antes de confirmar o recebimento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          RESUMO
          ================================================== */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Resumo
          icone={
            <CalendarDays
              size={20}
            />
          }
          titulo="Competência"
          valor={formatarCompetencia(
            mensalidadeTipada.competencia
          )}
        />

        <Resumo
          icone={
            <CalendarDays
              size={20}
            />
          }
          titulo="Vencimento"
          valor={formatarData(
            mensalidadeTipada.vencimento
          )}
          destaque={
            mensalidadeAtrasada
          }
        />

        <Resumo
          icone={
            <CircleDollarSign
              size={20}
            />
          }
          titulo="Valor previsto"
          valor={formatarMoeda.format(
            valorPrevisto
          )}
        />

        <Resumo
          icone={
            <CreditCard
              size={20}
            />
          }
          titulo="Situação"
          valor={traduzirSituacaoAluguel(
            situacaoEfetiva
          )}
          destaque={
            mensalidadeAtrasada
          }
        />
      </div>

      {/* ==================================================
          CONTRATO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Contrato
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {mensalidadeTipada
                .contratos
                ?.numero_contrato ||
                'Não informado'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Locatário
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {mensalidadeTipada
                .contratos
                ?.locatarios
                ?.nome ||
                'Não informado'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Imóvel
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {mensalidadeTipada
                .contratos
                ?.imoveis
                ?.descricao ||
                'Não informado'}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          INFORMAÇÃO
          ================================================== */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info
            size={20}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div>
            <p className="font-semibold text-blue-900">
              Como informar o pagamento
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Multa, juros e desconto devem ser
              informados em reais. O valor pago deve
              corresponder ao total final da cobrança.
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Nesta versão, uma mensalidade é considerada
              totalmente quitada. Pagamentos parciais ainda
              não fazem parte do fluxo.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form
          action={
            registrarPagamentoComId
          }
          className="space-y-8"
        >
          {/* ==============================================
              PAGAMENTO
              ============================================== */}

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pagamento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informe quando e quanto foi recebido.
            </p>
          </div>

          {/* ==============================================
              DATA DO PAGAMENTO
              ============================================== */}

          <div>
            <label
              htmlFor="data_pagamento"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Data do pagamento
            </label>

            <input
              id="data_pagamento"
              type="date"
              name="data_pagamento"
              required
              className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Não é permitido registrar uma data de
              pagamento futura.
            </p>
          </div>

          {/* ==============================================
              COMPOSIÇÃO
              ============================================== */}

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Composição da cobrança
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informe somente os valores adicionais
              realmente aplicados.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* ============================================
                MULTA
                ============================================ */}

            <div>
              <label
                htmlFor="multa"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Multa
              </label>

              <input
                id="multa"
                type="text"
                inputMode="decimal"
                name="multa"
                defaultValue={
                  multaAtual > 0
                    ? formatarDecimalParaInput(
                        multaAtual
                      )
                    : ''
                }
                placeholder="Ex.: 30,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Valor em reais.
              </p>
            </div>

            {/* ============================================
                JUROS
                ============================================ */}

            <div>
              <label
                htmlFor="juros"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Juros
              </label>

              <input
                id="juros"
                type="text"
                inputMode="decimal"
                name="juros"
                defaultValue={
                  jurosAtuais > 0
                    ? formatarDecimalParaInput(
                        jurosAtuais
                      )
                    : ''
                }
                placeholder="Ex.: 10,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Valor em reais.
              </p>
            </div>

            {/* ============================================
                DESCONTO
                ============================================ */}

            <div>
              <label
                htmlFor="desconto"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Desconto
              </label>

              <input
                id="desconto"
                type="text"
                inputMode="decimal"
                name="desconto"
                defaultValue={
                  descontoAtual > 0
                    ? formatarDecimalParaInput(
                        descontoAtual
                      )
                    : ''
                }
                placeholder="Ex.: 100,00"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Valor em reais.
              </p>
            </div>
          </div>

          {/* ==============================================
              TOTAL ATUAL
              ============================================== */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total atual
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Valor previsto + multa + juros -
                  desconto.
                </p>
              </div>

              <p className="text-2xl font-bold text-slate-900">
                {formatarMoeda.format(
                  totalAtual
                )}
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              O valor acima considera o que já estiver
              salvo na mensalidade. Se você informar
              multa, juros ou desconto agora, ajuste o
              valor pago para corresponder ao novo total.
            </p>
          </div>

          {/* ==============================================
              VALOR PAGO
              ============================================== */}

          <div>
            <label
              htmlFor="valor_pago"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Valor pago
            </label>

            <input
              id="valor_pago"
              type="text"
              inputMode="decimal"
              name="valor_pago"
              required
              defaultValue={formatarDecimalParaInput(
                totalAtual
              )}
              placeholder="Ex.: 1500,00"
              className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-3 text-lg font-semibold outline-none transition focus:border-blue-500"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              O valor pago deve ser igual ao valor
              previsto + multa + juros - desconto.
            </p>
          </div>

          {/* ==============================================
              BOTÕES
              ============================================== */}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/alugueis/${mensalidadeTipada.id}`}
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
              <CreditCard
                size={18}
              />

              Confirmar pagamento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/*
 * =====================================================
 * RESUMO
 * =====================================================
 */

function Resumo({
  icone,
  titulo,
  valor,
  destaque = false,
}: {
  icone: React.ReactNode
  titulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      className={
        destaque
          ? 'rounded-xl border border-red-200 bg-red-50 p-5'
          : 'rounded-xl border border-slate-200 bg-white p-5'
      }
    >
      <div
        className={
          destaque
            ? 'mb-3 text-red-600'
            : 'mb-3 text-blue-600'
        }
      >
        {icone}
      </div>

      <p
        className={
          destaque
            ? 'text-sm font-medium text-red-700'
            : 'text-sm font-medium text-slate-500'
        }
      >
        {titulo}
      </p>

      <p
        className={
          destaque
            ? 'mt-1 font-semibold text-red-900'
            : 'mt-1 font-semibold text-slate-900'
        }
      >
        {valor}
      </p>
    </div>
  )
}

/*
 * =====================================================
 * SITUAÇÃO
 * =====================================================
 */

function Situacao({
  situacao,
}: {
  situacao: SituacaoAluguel
}) {
  const texto =
    traduzirSituacaoAluguel(
      situacao
    )

  if (
    situacao === 'PAGO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {texto}
      </span>
    )
  }

  if (
    situacao === 'ATRASADO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        {texto}
      </span>
    )
  }

  if (
    situacao === 'CANCELADO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {texto}
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {texto}
    </span>
  )
}