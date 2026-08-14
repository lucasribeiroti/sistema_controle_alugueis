import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Info,
} from 'lucide-react'

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

const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatarData(
  data: string | null
) {
  if (!data) {
    return 'Não informado'
  }

  const [ano, mes, dia] = data.split('-')

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

  const supabase = await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    .eq('id', id)
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
   * NÃO PERMITE PAGAR NOVAMENTE
   * =====================================================
   */

  if (
    mensalidadeTipada.situacao ===
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
    mensalidadeTipada.situacao ===
    'CANCELADO'
  ) {
    redirect(
      `/alugueis/${mensalidadeTipada.id}`
    )
  }

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

        <h1 className="text-3xl font-bold text-slate-900">
          Registrar pagamento
        </h1>

        <p className="mt-2 text-slate-500">
          Registre o recebimento da mensalidade{' '}
          {formatarCompetencia(
            mensalidadeTipada.competencia
          )}
          .
        </p>
      </div>

      {/* ==================================================
          RESUMO
          ================================================== */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Resumo
          icone={
            <CalendarDays size={20} />
          }
          titulo="Competência"
          valor={formatarCompetencia(
            mensalidadeTipada.competencia
          )}
        />

        <Resumo
          icone={
            <CalendarDays size={20} />
          }
          titulo="Vencimento"
          valor={formatarData(
            mensalidadeTipada.vencimento
          )}
        />

        <Resumo
          icone={
            <CircleDollarSign size={20} />
          }
          titulo="Valor previsto"
          valor={formatarMoeda.format(
            valorPrevisto
          )}
        />

        <Resumo
          icone={
            <CreditCard size={20} />
          }
          titulo="Situação"
          valor={
            mensalidadeTipada.situacao ===
            'ATRASADO'
              ? 'Atrasado'
              : 'Aberto'
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
              {mensalidadeTipada.contratos
                ?.numero_contrato ||
                'Não informado'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Locatário
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {mensalidadeTipada.contratos
                ?.locatarios?.nome ||
                'Não informado'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Imóvel
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {mensalidadeTipada.contratos
                ?.imoveis?.descricao ||
                'Não informado'}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          AVISO
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
              Nesta primeira versão não estamos
              registrando pagamentos parciais.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form
          action={registrarPagamentoComId}
          className="space-y-8"
        >
          {/* ==================================================
              DATA DO PAGAMENTO
              ================================================== */}

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pagamento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informe quando e quanto foi recebido.
            </p>
          </div>

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
          </div>

          {/* ==================================================
              COMPOSIÇÃO
              ================================================== */}

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
            {/* Multa */}
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

            {/* Juros */}
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

            {/* Desconto */}
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

          {/* ==================================================
              TOTAL ATUAL
              ================================================== */}

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
              Esse resumo considera os valores que já
              estavam registrados. Se você preencher ou
              alterar multa, juros ou desconto abaixo,
              ajuste também o valor pago de acordo com o
              novo total.
            </p>
          </div>

          {/* ==================================================
              VALOR PAGO
              ================================================== */}

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

          {/* ==================================================
              EXEMPLO
              ================================================== */}

          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">
              Exemplo
            </p>

            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>
                  Valor previsto
                </span>

                <span>
                  R$ 1.500,00
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>
                  + Multa
                </span>

                <span>
                  R$ 30,00
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>
                  + Juros
                </span>

                <span>
                  R$ 10,00
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>
                  - Desconto
                </span>

                <span>
                  R$ 0,00
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4 border-t border-slate-200 pt-3 font-semibold text-slate-900">
                <span>
                  Valor pago
                </span>

                <span>
                  R$ 1.540,00
                </span>
              </div>
            </div>
          </div>

          {/* ==================================================
              BOTÕES
              ================================================== */}

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
              <CreditCard size={18} />
              Confirmar pagamento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Resumo({
  icone,
  titulo,
  valor,
}: {
  icone: React.ReactNode
  titulo: string
  valor: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 text-blue-600">
        {icone}
      </div>

      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {valor}
      </p>
    </div>
  )
}