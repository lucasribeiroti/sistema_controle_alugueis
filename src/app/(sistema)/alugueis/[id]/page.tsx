import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileText,
  UserRound,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{
    id: string
  }>
}

type AluguelDetalhes = {
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
  observacoes: string | null

  contratos: {
    id: string
    numero_contrato: string | null

    valor_mensal: number | string | null
    dia_vencimento: number | null

    locatarios: {
      id: string
      nome: string
      cpf_cnpj: string | null
      telefone: string | null
      email: string | null
    } | null

    imoveis: {
      id: string
      descricao: string
      endereco: string
    } | null
  } | null
}

const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatarData(data: string | null) {
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

  const [ano, mes] = competencia.split('-')

  if (!ano || !mes) {
    return competencia
  }

  return `${mes}/${ano}`
}

function formatarValor(
  valor: number | string | null
) {
  if (valor === null) {
    return 'Não informado'
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return 'Não informado'
  }

  return formatarMoeda.format(numero)
}

export default async function AluguelDetalhesPage({
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
   * BUSCA A MENSALIDADE
   * =====================================================
   */

  const { data: aluguel, error } = await supabase
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
      observacoes,
      contratos (
        id,
        numero_contrato,
        valor_mensal,
        dia_vencimento,
        locatarios (
          id,
          nome,
          cpf_cnpj,
          telefone,
          email
        ),
        imoveis (
          id,
          descricao,
          endereco
        )
      )
    `)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  /*
   * =====================================================
   * NÃO ENCONTRADO
   * =====================================================
   */

  if (error || !aluguel) {
    console.log(
      'ERRO AO CARREGAR MENSALIDADE'
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

  const aluguelTipado =
    aluguel as unknown as AluguelDetalhes

  const mensalidadePaga =
    aluguelTipado.situacao === 'PAGO'

  const mensalidadeCancelada =
    aluguelTipado.situacao === 'CANCELADO'

  /*
   * =====================================================
   * CÁLCULO DO TOTAL
   * =====================================================
   */

  const valorPrevisto = Number(
    aluguelTipado.valor_previsto
  )

  const multa = Number(
    aluguelTipado.multa ?? 0
  )

  const juros = Number(
    aluguelTipado.juros ?? 0
  )

  const desconto = Number(
    aluguelTipado.desconto ?? 0
  )

  const totalCalculado =
    valorPrevisto +
    multa +
    juros -
    desconto

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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                Mensalidade{' '}
                {formatarCompetencia(
                  aluguelTipado.competencia
                )}
              </h1>

              <Situacao
                situacao={aluguelTipado.situacao}
              />
            </div>

            <p className="mt-2 text-slate-500">
              Detalhes da cobrança mensal do contrato.
            </p>
          </div>

          {!mensalidadePaga &&
            !mensalidadeCancelada && (
              <Link
                href={`/alugueis/${aluguelTipado.id}/pagamento`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700"
              >
                <CreditCard size={18} />
                Registrar pagamento
              </Link>
            )}
        </div>
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
            aluguelTipado.competencia
          )}
        />

        <Resumo
          icone={
            <CalendarDays size={20} />
          }
          titulo="Vencimento"
          valor={formatarData(
            aluguelTipado.vencimento
          )}
        />

        <Resumo
          icone={
            <CircleDollarSign size={20} />
          }
          titulo="Valor previsto"
          valor={formatarValor(
            aluguelTipado.valor_previsto
          )}
        />

        <Resumo
          icone={<CreditCard size={20} />}
          titulo="Valor pago"
          valor={
            aluguelTipado.valor_pago !== null
              ? formatarValor(
                  aluguelTipado.valor_pago
                )
              : 'Ainda não pago'
          }
        />
      </div>

      {/* ==================================================
          DADOS DA MENSALIDADE
          ================================================== */}

      <Secao titulo="Dados da mensalidade">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Competência"
            valor={formatarCompetencia(
              aluguelTipado.competencia
            )}
          />

          <Campo
            titulo="Vencimento"
            valor={formatarData(
              aluguelTipado.vencimento
            )}
          />

          <Campo
            titulo="Situação"
            valor={traduzirSituacao(
              aluguelTipado.situacao
            )}
          />

          <Campo
            titulo="Valor previsto"
            valor={formatarValor(
              aluguelTipado.valor_previsto
            )}
          />

          <Campo
            titulo="Data do pagamento"
            valor={formatarData(
              aluguelTipado.data_pagamento
            )}
          />

          <Campo
            titulo="Valor pago"
            valor={
              aluguelTipado.valor_pago !== null
                ? formatarValor(
                    aluguelTipado.valor_pago
                  )
                : null
            }
          />
        </div>
      </Secao>

      {/* ==================================================
          COMPOSIÇÃO FINANCEIRA
          ================================================== */}

      <Secao titulo="Composição financeira">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <CardFinanceiro
            titulo="Aluguel"
            valor={formatarValor(
              aluguelTipado.valor_previsto
            )}
          />

          <CardFinanceiro
            titulo="Multa"
            valor={formatarMoeda.format(
              multa
            )}
          />

          <CardFinanceiro
            titulo="Juros"
            valor={formatarMoeda.format(
              juros
            )}
          />

          <CardFinanceiro
            titulo="Desconto"
            valor={formatarMoeda.format(
              desconto
            )}
          />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total calculado
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Valor previsto + multa + juros - desconto
              </p>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {formatarMoeda.format(
                totalCalculado
              )}
            </p>
          </div>
        </div>
      </Secao>

      {/* ==================================================
          CONTRATO
          ================================================== */}

      <Secao titulo="Contrato">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Número do contrato"
            valor={
              aluguelTipado.contratos
                ?.numero_contrato
            }
          />

          <Campo
            titulo="Valor mensal do contrato"
            valor={
              aluguelTipado.contratos
                ?.valor_mensal !== null &&
              aluguelTipado.contratos
                ?.valor_mensal !== undefined
                ? formatarValor(
                    aluguelTipado.contratos
                      .valor_mensal
                  )
                : null
            }
          />

          <Campo
            titulo="Dia normal do vencimento"
            valor={
              aluguelTipado.contratos
                ?.dia_vencimento
                ? `Dia ${aluguelTipado.contratos.dia_vencimento}`
                : null
            }
          />
        </div>

        {aluguelTipado.contratos?.id && (
          <div className="mt-6">
            <Link
              href={`/contratos/${aluguelTipado.contratos.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              <FileText size={16} />
              Ver contrato
            </Link>
          </div>
        )}
      </Secao>

      {/* ==================================================
          LOCATÁRIO
          ================================================== */}

      <Secao titulo="Locatário">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Nome"
            valor={
              aluguelTipado.contratos
                ?.locatarios?.nome
            }
          />

          <Campo
            titulo="CPF / CNPJ"
            valor={
              aluguelTipado.contratos
                ?.locatarios?.cpf_cnpj
            }
          />

          <Campo
            titulo="Telefone"
            valor={
              aluguelTipado.contratos
                ?.locatarios?.telefone
            }
          />

          <Campo
            titulo="E-mail"
            valor={
              aluguelTipado.contratos
                ?.locatarios?.email
            }
          />
        </div>

        {aluguelTipado.contratos
          ?.locatarios?.id && (
          <div className="mt-6">
            <Link
              href={`/locatarios/${aluguelTipado.contratos.locatarios.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              <UserRound size={16} />
              Ver cadastro do locatário
            </Link>
          </div>
        )}
      </Secao>

      {/* ==================================================
          IMÓVEL
          ================================================== */}

      <Secao titulo="Imóvel">
        <div className="grid gap-8 md:grid-cols-2">
          <Campo
            titulo="Descrição"
            valor={
              aluguelTipado.contratos
                ?.imoveis?.descricao
            }
          />

          <Campo
            titulo="Endereço"
            valor={
              aluguelTipado.contratos
                ?.imoveis?.endereco
            }
          />
        </div>

        {aluguelTipado.contratos
          ?.imoveis?.id && (
          <div className="mt-6">
            <Link
              href={`/imoveis/${aluguelTipado.contratos.imoveis.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              <Building2 size={16} />
              Ver cadastro do imóvel
            </Link>
          </div>
        )}
      </Secao>

      {/* ==================================================
          OBSERVAÇÕES
          ================================================== */}

      <Secao titulo="Observações">
        <Campo
          titulo="Observações da mensalidade"
          valor={aluguelTipado.observacoes}
        />
      </Secao>

      {/* ==================================================
          PAGAMENTO CONFIRMADO
          ================================================== */}

      {mensalidadePaga && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CreditCard
              size={22}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="font-semibold text-emerald-900">
                Pagamento registrado
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Esta mensalidade foi paga em{' '}
                <strong>
                  {formatarData(
                    aluguelTipado.data_pagamento
                  )}
                </strong>
                {' '}no valor de{' '}
                <strong>
                  {formatarValor(
                    aluguelTipado.valor_pago
                  )}
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Secao({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <h2 className="mb-6 text-lg font-semibold text-slate-900">
        {titulo}
      </h2>

      {children}
    </div>
  )
}

function Campo({
  titulo,
  valor,
}: {
  titulo: string
  valor: string | null | undefined
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 text-base text-slate-900">
        {valor || 'Não informado'}
      </p>
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

function CardFinanceiro({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 text-lg font-semibold text-slate-900">
        {valor}
      </p>
    </div>
  )
}

function traduzirSituacao(
  situacao: string
) {
  if (situacao === 'PAGO') {
    return 'Pago'
  }

  if (situacao === 'ATRASADO') {
    return 'Atrasado'
  }

  if (situacao === 'CANCELADO') {
    return 'Cancelado'
  }

  return 'Aberto'
}

function Situacao({
  situacao,
}: {
  situacao: string
}) {
  if (situacao === 'PAGO') {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Pago
      </span>
    )
  }

  if (situacao === 'ATRASADO') {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Atrasado
      </span>
    )
  }

  if (situacao === 'CANCELADO') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Cancelado
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      Aberto
    </span>
  )
}