import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  TriangleAlert,
} from 'lucide-react'

import {
  obterDataHojeBrasil,
  obterSituacaoEfetiva,
  traduzirSituacaoAluguel,
  type SituacaoAluguel,
} from '@/lib/alugueis'

import { createClient } from '@/lib/supabase/server'
import { registrarPagamento } from './actions'
import PagamentoForm from './PagamentoForm'

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

    percentual_multa:
      | number
      | string
      | null

    percentual_juros:
      | number
      | string
      | null

    locatarios: {
      nome: string
    } | null

    imoveis: {
      descricao: string
    } | null
  } | null
}

const formatarMoeda =
  new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  )

/*
 * =====================================================
 * FORMATA DATA
 * =====================================================
 */

function formatarData(
  data: string | null
) {
  if (!data) {
    return 'Não informado'
  }

  const [
    ano,
    mes,
    dia,
  ] = data.split('-')

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

/*
 * =====================================================
 * FORMATA COMPETÊNCIA
 * =====================================================
 */

function formatarCompetencia(
  competencia: string | null
) {
  if (!competencia) {
    return 'Não informado'
  }

  const [
    ano,
    mes,
  ] = competencia.split('-')

  if (
    !ano ||
    !mes
  ) {
    return competencia
  }

  return `${mes}/${ano}`
}

/*
 * =====================================================
 * PÁGINA
 * =====================================================
 */

export default async function RegistrarPagamentoPage({
  params,
}: Props) {
  const {
    id,
  } = await params

  const supabase =
    await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

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
   * BUSCA A MENSALIDADE
   * =====================================================
   *
   * Agora também buscamos:
   *
   * percentual_multa
   * percentual_juros
   *
   * porque o formulário precisa deles para
   * calcular os encargos automaticamente.
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
        percentual_multa,
        percentual_juros,
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
    mensalidade as unknown as
      MensalidadePagamento

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
   * Mensalidades já pagas não podem
   * receber outro pagamento.
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
   * Mensalidades canceladas também
   * não podem receber pagamento.
   */

  if (
    situacaoEfetiva ===
    'CANCELADO'
  ) {
    redirect(
      `/alugueis/${mensalidadeTipada.id}`
    )
  }

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

  if (
    !Number.isFinite(
      valorPrevisto
    )
  ) {
    throw new Error(
      'A mensalidade possui um valor previsto inválido.'
    )
  }

  const multaInicial =
    Number(
      mensalidadeTipada.multa ??
        0
    )

  const jurosIniciais =
    Number(
      mensalidadeTipada.juros ??
        0
    )

  const descontoInicial =
    Number(
      mensalidadeTipada.desconto ??
        0
    )

  /*
   * =====================================================
   * REGRAS DO CONTRATO
   * =====================================================
   */

  const percentualMulta =
    mensalidadeTipada
      .contratos
      ?.percentual_multa ??
    0

  const percentualJuros =
    mensalidadeTipada
      .contratos
      ?.percentual_juros ??
    0

  /*
   * =====================================================
   * DATA ATUAL
   * =====================================================
   *
   * O Client Component recebe a mesma
   * referência de "hoje" usada pelo
   * restante do sistema.
   */

  const dataHoje =
    obterDataHojeBrasil()

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
          <ArrowLeft
            size={16}
          />

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
              Registre o recebimento da
              mensalidade{' '}
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
                Esta mensalidade venceu
                em{' '}
                <strong>
                  {formatarData(
                    mensalidadeTipada.vencimento
                  )}
                </strong>{' '}
                e ainda não possui
                pagamento registrado.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-800">
                A multa e os juros serão
                calculados automaticamente
                de acordo com a data do
                pagamento e as regras do
                contrato.
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
          valor={
            formatarMoeda.format(
              valorPrevisto
            )
          }
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
          FORMULÁRIO INTERATIVO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <PagamentoForm
          action={
            registrarPagamentoComId
          }

          valorPrevisto={
            valorPrevisto
          }

          vencimento={
            mensalidadeTipada.vencimento
          }

          percentualMulta={
            percentualMulta
          }

          percentualJuros={
            percentualJuros
          }

          dataHoje={
            dataHoje
          }

          multaInicial={
            multaInicial
          }

          jurosIniciais={
            jurosIniciais
          }

          descontoInicial={
            descontoInicial
          }
        />
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