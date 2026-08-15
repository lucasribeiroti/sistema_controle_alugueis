import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  TriangleAlert,
  UserRound,
} from 'lucide-react'

import {
  calcularEncargosAtraso,
  obterDataHojeBrasil,
  obterSituacaoEfetiva,
  traduzirSituacaoAluguel,
  type SituacaoAluguel,
} from '@/lib/alugueis'

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

    percentual_multa:
      | number
      | string
      | null

    percentual_juros:
      | number
      | string
      | null

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

type SituacaoExibicao =
  | SituacaoAluguel
  | 'PAGO_ATRASADO'

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
 * FORMATA VALOR
 * =====================================================
 */

function formatarValor(
  valor: number | string | null
) {
  const numero =
    Number(valor ?? 0)

  if (
    !Number.isFinite(numero)
  ) {
    return formatarMoeda.format(0)
  }

  return formatarMoeda.format(
    numero
  )
}

/*
 * =====================================================
 * SITUAÇÃO PARA EXIBIÇÃO
 * =====================================================
 */

function obterSituacaoExibicao(
  aluguel: AluguelDetalhes
): SituacaoExibicao {
  const situacaoEfetiva =
    obterSituacaoEfetiva(
      aluguel.situacao,
      aluguel.vencimento
    )

  /*
   * Se foi pago depois do vencimento,
   * exibimos uma informação mais precisa.
   */

  if (
    situacaoEfetiva === 'PAGO' &&
    aluguel.data_pagamento &&
    aluguel.data_pagamento >
      aluguel.vencimento
  ) {
    return 'PAGO_ATRASADO'
  }

  return situacaoEfetiva
}

/*
 * =====================================================
 * TEXTO DA SITUAÇÃO
 * =====================================================
 */

function traduzirSituacaoExibicao(
  situacao: SituacaoExibicao
) {
  if (
    situacao ===
    'PAGO_ATRASADO'
  ) {
    return 'Pago em atraso'
  }

  return traduzirSituacaoAluguel(
    situacao
  )
}

/*
 * =====================================================
 * PÁGINA
 * =====================================================
 */

export default async function AluguelDetalhesPage({
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
   */

  const {
    data: aluguel,
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
      observacoes,
      contratos (
        id,
        numero_contrato,
        valor_mensal,
        dia_vencimento,
        percentual_multa,
        percentual_juros,
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
    !aluguel
  ) {
    console.log(
      'ERRO AO CARREGAR MENSALIDADE'
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

  const aluguelTipado =
    aluguel as unknown as
      AluguelDetalhes

  /*
   * =====================================================
   * SITUAÇÃO EFETIVA
   * =====================================================
   */

  const situacaoEfetiva =
    obterSituacaoEfetiva(
      aluguelTipado.situacao,
      aluguelTipado.vencimento
    )

  /*
   * =====================================================
   * SITUAÇÃO PARA EXIBIÇÃO
   * =====================================================
   */

  const situacaoExibicao =
    obterSituacaoExibicao(
      aluguelTipado
    )

  const mensalidadePaga =
    situacaoEfetiva ===
    'PAGO'

  const mensalidadeCancelada =
    situacaoEfetiva ===
    'CANCELADO'

  const mensalidadeAtrasada =
    situacaoEfetiva ===
    'ATRASADO'

  const pagaEmAtraso =
    situacaoExibicao ===
    'PAGO_ATRASADO'

  /*
   * =====================================================
   * VALOR PREVISTO
   * =====================================================
   */

  const valorPrevisto =
    Number(
      aluguelTipado.valor_previsto
    )

  /*
   * =====================================================
   * DATA ATUAL
   * =====================================================
   */

  const dataHoje =
    obterDataHojeBrasil()

  /*
   * =====================================================
   * MULTA E JUROS
   * =====================================================
   *
   * Se já foi pago:
   *
   * usamos os valores definitivos gravados.
   *
   * Se ainda está atrasado:
   *
   * calculamos os encargos até HOJE.
   *
   * Se está aberto e no prazo:
   *
   * multa e juros ficam zerados.
   */

  let multaExibida = 0
  let jurosExibidos = 0
  let diasAtrasoAtual = 0
  let encargosDinamicos = false

  if (
    mensalidadePaga
  ) {
    multaExibida =
      Number(
        aluguelTipado.multa ??
          0
      )

    jurosExibidos =
      Number(
        aluguelTipado.juros ??
          0
      )
  } else if (
    mensalidadeAtrasada
  ) {
    const calculo =
      calcularEncargosAtraso({
        valorPrevisto,

        percentualMulta:
          aluguelTipado
            .contratos
            ?.percentual_multa ??
          0,

        percentualJuros:
          aluguelTipado
            .contratos
            ?.percentual_juros ??
          0,

        vencimento:
          aluguelTipado.vencimento,

        dataPagamento:
          dataHoje,
      })

    multaExibida =
      calculo.multa

    jurosExibidos =
      calculo.juros

    diasAtrasoAtual =
      calculo.diasAtraso

    encargosDinamicos =
      true
  }

  /*
   * =====================================================
   * DESCONTO
   * =====================================================
   */

  const desconto =
    mensalidadePaga
      ? Number(
          aluguelTipado.desconto ??
            0
        )
      : 0

  /*
   * =====================================================
   * TOTAL
   * =====================================================
   */

  const totalCalculado =
    valorPrevisto +
    multaExibida +
    jurosExibidos -
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
          <ArrowLeft
            size={16}
          />

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
                situacao={
                  situacaoExibicao
                }
              />
            </div>

            <p className="mt-2 text-slate-500">
              Detalhes da cobrança mensal
              do contrato.
            </p>
          </div>

          {!mensalidadePaga &&
            !mensalidadeCancelada && (
              <Link
                href={`/alugueis/${aluguelTipado.id}/pagamento`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700"
              >
                <CreditCard
                  size={18}
                />

                Registrar pagamento
              </Link>
            )}
        </div>
      </div>

      {/* ==================================================
          ATRASADO
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
                Mensalidade em atraso
              </p>

              <p className="mt-1 text-sm leading-6 text-red-800">
                Esta mensalidade venceu em{' '}
                <strong>
                  {formatarData(
                    aluguelTipado.vencimento
                  )}
                </strong>{' '}
                e está com{' '}
                <strong>
                  {diasAtrasoAtual}{' '}
                  dia(s) de atraso
                </strong>
                .
              </p>

              <p className="mt-2 text-sm leading-6 text-red-800">
                A multa e os juros abaixo
                estão atualizados até{' '}
                <strong>
                  {formatarData(
                    dataHoje
                  )}
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          PAGO EM ATRASO
          ================================================== */}

      {pagaEmAtraso && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <Clock3
              size={22}
              className="mt-0.5 shrink-0 text-orange-700"
            />

            <div>
              <p className="font-semibold text-orange-900">
                Pago em atraso
              </p>

              <p className="mt-1 text-sm leading-6 text-orange-800">
                Esta mensalidade venceu em{' '}
                <strong>
                  {formatarData(
                    aluguelTipado.vencimento
                  )}
                </strong>{' '}
                e foi paga em{' '}
                <strong>
                  {formatarData(
                    aluguelTipado.data_pagamento
                  )}
                </strong>
                .
              </p>

              <p className="mt-2 text-sm leading-6 text-orange-800">
                Os valores de multa e juros
                apresentados abaixo são os
                valores definitivos registrados
                no pagamento.
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
            aluguelTipado.competencia
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
            aluguelTipado.vencimento
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
          valor={formatarValor(
            aluguelTipado.valor_previsto
          )}
        />

        <Resumo
          icone={
            <CreditCard
              size={20}
            />
          }
          titulo="Valor pago"
          valor={
            aluguelTipado
              .valor_pago !== null
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
            valor={traduzirSituacaoExibicao(
              situacaoExibicao
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
            valor={
              aluguelTipado.data_pagamento
                ? formatarData(
                    aluguelTipado.data_pagamento
                  )
                : null
            }
          />

          <Campo
            titulo="Valor pago"
            valor={
              aluguelTipado
                .valor_pago !== null
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
        {encargosDinamicos && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-900">
              Valores atualizados até hoje
            </p>

            <p className="mt-1 text-sm leading-6 text-orange-800">
              Como a mensalidade ainda não foi
              paga, multa e juros são provisórios
              e serão recalculados conforme os
              dias de atraso.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <CardFinanceiro
            titulo="Aluguel"
            valor={formatarMoeda.format(
              valorPrevisto
            )}
          />

          <CardFinanceiro
            titulo={
              encargosDinamicos
                ? 'Multa atual'
                : 'Multa'
            }
            valor={formatarMoeda.format(
              multaExibida
            )}
            destaque={
              multaExibida > 0
            }
          />

          <CardFinanceiro
            titulo={
              encargosDinamicos
                ? 'Juros atuais'
                : 'Juros'
            }
            valor={formatarMoeda.format(
              jurosExibidos
            )}
            destaque={
              jurosExibidos > 0
            }
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
                {encargosDinamicos
                  ? 'Total atualizado'
                  : 'Total calculado'}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Valor previsto + multa +
                juros - desconto
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
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Campo
            titulo="Número do contrato"
            valor={
              aluguelTipado
                .contratos
                ?.numero_contrato
            }
          />

          <Campo
            titulo="Valor mensal"
            valor={
              aluguelTipado
                .contratos
                ?.valor_mensal !==
                null &&
              aluguelTipado
                .contratos
                ?.valor_mensal !==
                undefined
                ? formatarValor(
                    aluguelTipado
                      .contratos
                      .valor_mensal
                  )
                : null
            }
          />

          <Campo
            titulo="Multa contratual"
            valor={`${Number(
              aluguelTipado
                .contratos
                ?.percentual_multa ??
                0
            ).toLocaleString(
              'pt-BR',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}%`}
          />

          <Campo
            titulo="Juros contratuais"
            valor={`${Number(
              aluguelTipado
                .contratos
                ?.percentual_juros ??
                0
            ).toLocaleString(
              'pt-BR',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}% ao mês`}
          />
        </div>

        {aluguelTipado
          .contratos
          ?.id && (
          <div className="mt-6">
            <Link
              href={`/contratos/${aluguelTipado.contratos.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              <FileText
                size={16}
              />

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
              aluguelTipado
                .contratos
                ?.locatarios
                ?.nome
            }
          />

          <Campo
            titulo="CPF / CNPJ"
            valor={
              aluguelTipado
                .contratos
                ?.locatarios
                ?.cpf_cnpj
            }
          />

          <Campo
            titulo="Telefone"
            valor={
              aluguelTipado
                .contratos
                ?.locatarios
                ?.telefone
            }
          />

          <Campo
            titulo="E-mail"
            valor={
              aluguelTipado
                .contratos
                ?.locatarios
                ?.email
            }
          />
        </div>

        {aluguelTipado
          .contratos
          ?.locatarios
          ?.id && (
          <div className="mt-6">
            <Link
              href={`/locatarios/${aluguelTipado.contratos.locatarios.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              <UserRound
                size={16}
              />

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
              aluguelTipado
                .contratos
                ?.imoveis
                ?.descricao
            }
          />

          <Campo
            titulo="Endereço"
            valor={
              aluguelTipado
                .contratos
                ?.imoveis
                ?.endereco
            }
          />
        </div>

        {aluguelTipado
          .contratos
          ?.imoveis
          ?.id && (
          <div className="mt-6">
            <Link
              href={`/imoveis/${aluguelTipado.contratos.imoveis.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              <Building2
                size={16}
              />

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
          valor={
            aluguelTipado.observacoes
          }
        />
      </Secao>

      {/* ==================================================
          PAGAMENTO REGISTRADO
          ================================================== */}

      {mensalidadePaga && (
        <div
          className={
            pagaEmAtraso
              ? 'rounded-xl border border-orange-200 bg-orange-50 p-6'
              : 'rounded-xl border border-emerald-200 bg-emerald-50 p-6'
          }
        >
          <div className="flex items-start gap-3">
            <CreditCard
              size={22}
              className={
                pagaEmAtraso
                  ? 'mt-0.5 shrink-0 text-orange-700'
                  : 'mt-0.5 shrink-0 text-emerald-700'
              }
            />

            <div>
              <p
                className={
                  pagaEmAtraso
                    ? 'font-semibold text-orange-900'
                    : 'font-semibold text-emerald-900'
                }
              >
                {pagaEmAtraso
                  ? 'Pagamento registrado com atraso'
                  : 'Pagamento registrado'}
              </p>

              <p
                className={
                  pagaEmAtraso
                    ? 'mt-1 text-sm leading-6 text-orange-800'
                    : 'mt-1 text-sm leading-6 text-emerald-800'
                }
              >
                Esta mensalidade foi paga em{' '}
                <strong>
                  {formatarData(
                    aluguelTipado.data_pagamento
                  )}
                </strong>{' '}
                no valor de{' '}
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

/*
 * =====================================================
 * SEÇÃO
 * =====================================================
 */

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

/*
 * =====================================================
 * CAMPO
 * =====================================================
 */

function Campo({
  titulo,
  valor,
}: {
  titulo: string
  valor:
    | string
    | null
    | undefined
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 text-base text-slate-900">
        {valor ||
          'Não informado'}
      </p>
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
 * CARD FINANCEIRO
 * =====================================================
 */

function CardFinanceiro({
  titulo,
  valor,
  destaque = false,
}: {
  titulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      className={
        destaque
          ? 'rounded-lg border border-orange-200 bg-orange-50 p-4'
          : 'rounded-lg border border-slate-200 bg-slate-50 p-4'
      }
    >
      <p
        className={
          destaque
            ? 'text-sm font-medium text-orange-700'
            : 'text-sm font-medium text-slate-500'
        }
      >
        {titulo}
      </p>

      <p
        className={
          destaque
            ? 'mt-1 text-lg font-semibold text-orange-900'
            : 'mt-1 text-lg font-semibold text-slate-900'
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
  situacao: SituacaoExibicao
}) {
  const texto =
    traduzirSituacaoExibicao(
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
    situacao ===
    'PAGO_ATRASADO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
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
    situacao ===
    'CANCELADO'
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