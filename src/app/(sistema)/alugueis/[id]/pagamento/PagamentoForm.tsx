'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  CircleDollarSign,
  CreditCard,
  Info,
} from 'lucide-react'

import {
  arredondarMoeda,
  calcularEncargosAtraso,
} from '@/lib/alugueis'

type Props = {
  action: (
    formData: FormData
  ) => void | Promise<void>

  valorPrevisto: number

  vencimento: string

  percentualMulta:
    | number
    | string
    | null

  percentualJuros:
    | number
    | string
    | null

  dataHoje: string

  multaInicial: number
  jurosIniciais: number
  descontoInicial: number
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
 * FORMATA DECIMAL PARA O INPUT
 * =====================================================
 */

function formatarDecimalParaInput(
  valor: number
) {
  return valor.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )
}

/*
 * =====================================================
 * CONVERTE O QUE FOI DIGITADO
 * =====================================================
 */

function converterDecimal(
  valor: string
) {
  const texto =
    valor.trim()

  if (!texto) {
    return 0
  }

  const normalizado =
    texto.includes(',')
      ? texto
          .replace(/\./g, '')
          .replace(',', '.')
      : texto

  const numero =
    Number(normalizado)

  if (
    !Number.isFinite(numero)
  ) {
    return 0
  }

  return numero
}

/*
 * =====================================================
 * FORMATA DATA
 * =====================================================
 */

function formatarData(
  data: string
) {
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
 * FORMULÁRIO
 * =====================================================
 */

export default function PagamentoForm({
  action,
  valorPrevisto,
  vencimento,
  percentualMulta,
  percentualJuros,
  dataHoje,
  multaInicial,
  jurosIniciais,
  descontoInicial,
}: Props) {
  /*
   * =====================================================
   * ESTADOS
   * =====================================================
   */

  const [
    dataPagamento,
    setDataPagamento,
  ] = useState(
    dataHoje
  )

  const calculoInicial =
    calcularEncargosAtraso({
      valorPrevisto,

      percentualMulta,

      percentualJuros,

      vencimento,

      dataPagamento:
        dataHoje,
    })

  const [
    multa,
    setMulta,
  ] = useState(
    multaInicial > 0
      ? formatarDecimalParaInput(
          multaInicial
        )
      : formatarDecimalParaInput(
          calculoInicial.multa
        )
  )

  const [
    juros,
    setJuros,
  ] = useState(
    jurosIniciais > 0
      ? formatarDecimalParaInput(
          jurosIniciais
        )
      : formatarDecimalParaInput(
          calculoInicial.juros
        )
  )

  const [
    desconto,
    setDesconto,
  ] = useState(
    formatarDecimalParaInput(
      descontoInicial
    )
  )

  /*
   * =====================================================
   * VALORES NUMÉRICOS
   * =====================================================
   */

  const multaNumero =
    converterDecimal(
      multa
    )

  const jurosNumero =
    converterDecimal(
      juros
    )

  const descontoNumero =
    converterDecimal(
      desconto
    )

  /*
   * =====================================================
   * DIAS DE ATRASO
   * =====================================================
   *
   * Calculamos novamente usando a data
   * atualmente selecionada.
   */

  const encargosAtuais =
    calcularEncargosAtraso({
      valorPrevisto,

      percentualMulta,

      percentualJuros,

      vencimento,

      dataPagamento,
    })

  /*
   * =====================================================
   * TOTAL
   * =====================================================
   */

  const total =
    arredondarMoeda(
      valorPrevisto +
        multaNumero +
        jurosNumero -
        descontoNumero
    )

  /*
   * =====================================================
   * ALTERAÇÃO DA DATA
   * =====================================================
   *
   * Sempre que a data mudar:
   *
   * 1. recalculamos os dias de atraso
   * 2. recalculamos a multa
   * 3. recalculamos os juros
   *
   * Depois o usuário ainda pode alterar
   * manualmente os valores.
   */

  function alterarDataPagamento(
    novaData: string
  ) {
    setDataPagamento(
      novaData
    )

    if (!novaData) {
      setMulta('0,00')
      setJuros('0,00')
      return
    }

    const novoCalculo =
      calcularEncargosAtraso({
        valorPrevisto,

        percentualMulta,

        percentualJuros,

        vencimento,

        dataPagamento:
          novaData,
      })

    setMulta(
      formatarDecimalParaInput(
        novoCalculo.multa
      )
    )

    setJuros(
      formatarDecimalParaInput(
        novoCalculo.juros
      )
    )
  }

  return (
    <form
      action={action}
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
          Informe quando o pagamento foi recebido.
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
          max={dataHoje}
          value={dataPagamento}
          onChange={(evento) =>
            alterarDataPagamento(
              evento.target.value
            )
          }
          className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          A data não pode ser posterior a{' '}
          {formatarData(
            dataHoje
          )}
          .
        </p>
      </div>

      {/* ==================================================
          RESULTADO DO CÁLCULO AUTOMÁTICO
          ================================================== */}

      <div
        className={
          encargosAtuais
            .diasAtraso > 0
            ? 'rounded-xl border border-amber-200 bg-amber-50 p-5'
            : 'rounded-xl border border-emerald-200 bg-emerald-50 p-5'
        }
      >
        <div className="flex items-start gap-3">
          <Info
            size={20}
            className={
              encargosAtuais
                .diasAtraso > 0
                ? 'mt-0.5 shrink-0 text-amber-700'
                : 'mt-0.5 shrink-0 text-emerald-700'
            }
          />

          <div>
            <p
              className={
                encargosAtuais
                  .diasAtraso > 0
                  ? 'font-semibold text-amber-900'
                  : 'font-semibold text-emerald-900'
              }
            >
              {encargosAtuais
                .diasAtraso > 0
                ? `${encargosAtuais.diasAtraso} dia(s) de atraso`
                : 'Pagamento sem atraso'}
            </p>

            <p
              className={
                encargosAtuais
                  .diasAtraso > 0
                  ? 'mt-1 text-sm leading-6 text-amber-800'
                  : 'mt-1 text-sm leading-6 text-emerald-800'
              }
            >
              {encargosAtuais
                .diasAtraso > 0
                ? 'A multa e os juros foram calculados automaticamente com base nas regras do contrato.'
                : 'Nenhuma multa ou juros é aplicada para pagamento realizado até o vencimento.'}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          REGRAS DO CONTRATO
          ================================================== */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <p className="font-semibold text-blue-900">
          Regras do contrato
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Multa
            </p>

            <p className="mt-1 font-semibold text-blue-900">
              {Number(
                percentualMulta ??
                  0
              ).toLocaleString(
                'pt-BR',
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
              %
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Juros
            </p>

            <p className="mt-1 font-semibold text-blue-900">
              {Number(
                percentualJuros ??
                  0
              ).toLocaleString(
                'pt-BR',
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
              % ao mês
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          COMPOSIÇÃO
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Composição da cobrança
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Multa e juros são sugeridos automaticamente,
          mas podem ser ajustados manualmente se houver
          algum acordo específico.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* ==================================================
            MULTA
            ================================================== */}

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
            value={multa}
            onChange={(evento) =>
              setMulta(
                evento.target.value
              )
            }
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />

          <p className="mt-2 text-xs text-slate-500">
            Automático:{' '}
            {formatarMoeda.format(
              encargosAtuais.multa
            )}
          </p>
        </div>

        {/* ==================================================
            JUROS
            ================================================== */}

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
            value={juros}
            onChange={(evento) =>
              setJuros(
                evento.target.value
              )
            }
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />

          <p className="mt-2 text-xs text-slate-500">
            Automático:{' '}
            {formatarMoeda.format(
              encargosAtuais.juros
            )}
          </p>
        </div>

        {/* ==================================================
            DESCONTO
            ================================================== */}

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
            value={desconto}
            onChange={(evento) =>
              setDesconto(
                evento.target.value
              )
            }
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />

          <p className="mt-2 text-xs text-slate-500">
            Valor informado manualmente.
          </p>
        </div>
      </div>

      {/* ==================================================
          RESUMO FINANCEIRO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-2">
          <CircleDollarSign
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-slate-900">
            Resumo financeiro
          </h2>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <LinhaFinanceira
            titulo="Valor previsto"
            valor={
              valorPrevisto
            }
          />

          <LinhaFinanceira
            titulo="+ Multa"
            valor={
              multaNumero
            }
          />

          <LinhaFinanceira
            titulo="+ Juros"
            valor={
              jurosNumero
            }
          />

          <LinhaFinanceira
            titulo="- Desconto"
            valor={
              descontoNumero
            }
          />

          <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
            <span className="font-semibold text-slate-900">
              Total a receber
            </span>

            <span className="text-2xl font-bold text-slate-900">
              {formatarMoeda.format(
                total
              )}
            </span>
          </div>
        </div>
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
          value={
            formatarDecimalParaInput(
              total
            )
          }
          readOnly
          className="w-full max-w-md rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          O valor pago é atualizado automaticamente
          conforme multa, juros e desconto.
        </p>
      </div>

      {/* ==================================================
          BOTÃO
          ================================================== */}

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <BotaoConfirmar />
      </div>
    </form>
  )
}

/*
 * =====================================================
 * LINHA FINANCEIRA
 * =====================================================
 */

function LinhaFinanceira({
  titulo,
  valor,
}: {
  titulo: string
  valor: number
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-600">
        {titulo}
      </span>

      <span className="font-medium text-slate-900">
        {formatarMoeda.format(
          valor
        )}
      </span>
    </div>
  )
}

/*
 * =====================================================
 * BOTÃO COM STATUS DE ENVIO
 * =====================================================
 */

function BotaoConfirmar() {
  const {
    pending,
  } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <CreditCard
        size={18}
      />

      {pending
        ? 'Registrando...'
        : 'Confirmar pagamento'}
    </button>
  )
}