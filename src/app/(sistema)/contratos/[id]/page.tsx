import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CircleCheck,
  Pencil,
  UserRound,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { encerrarContrato } from './actions'

type Props = {
  params: Promise<{
    id: string
  }>
}

type ContratoDetalhes = {
  id: string
  numero_contrato: string | null
  tipo_contrato: string | null

  data_inicio: string | null
  data_fim: string | null

  valor_mensal: number | string | null
  dia_vencimento: number | null

  indice_reajuste: string | null
  regra_reajuste: string | null
  data_proximo_reajuste: string | null

  percentual_multa: number | string | null
  percentual_juros: number | string | null

  status: string
  arquivo_contrato: string | null
  observacoes: string | null

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
    codigo_iptu: string | null
    uc_energia: string | null
    uc_agua: string | null
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

  return `${dia}/${mes}/${ano}`
}

function formatarPercentual(
  valor: number | string | null
) {
  if (valor === null) {
    return 'Não informado'
  }

  const numero = Number(valor)

  if (Number.isNaN(numero)) {
    return 'Não informado'
  }

  return `${numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

export default async function ContratoDetalhesPage({
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
      indice_reajuste,
      regra_reajuste,
      data_proximo_reajuste,
      percentual_multa,
      percentual_juros,
      status,
      arquivo_contrato,
      observacoes,
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
        endereco,
        codigo_iptu,
        uc_energia,
        uc_agua
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
    console.log('ERRO AO CARREGAR CONTRATO')

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
    contrato as unknown as ContratoDetalhes

  const contratoAtivo =
    contratoTipado.status === 'ATIVO'

  /*
   * Vincula o ID do contrato à ação de encerramento.
   */
  const encerrarContratoComId =
    encerrarContrato.bind(
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
          href="/contratos"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para contratos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {contratoTipado.numero_contrato ||
                  'Contrato sem número'}
              </h1>

              <Status status={contratoTipado.status} />
            </div>

            <p className="mt-2 text-slate-500">
              Informações completas do contrato de aluguel.
            </p>
          </div>

          {contratoAtivo && (
            <Link
              href={`/contratos/${contratoTipado.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Pencil size={18} />
              Editar contrato
            </Link>
          )}
        </div>
      </div>

      {/* ==================================================
          RESUMO
          ================================================== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Resumo
          icone={<UserRound size={20} />}
          titulo="Locatário"
          valor={
            contratoTipado.locatarios?.nome ||
            'Não informado'
          }
        />

        <Resumo
          icone={<Building2 size={20} />}
          titulo="Imóvel"
          valor={
            contratoTipado.imoveis?.descricao ||
            'Não informado'
          }
        />

        <Resumo
          icone={<CircleDollarSign size={20} />}
          titulo="Valor mensal"
          valor={
            contratoTipado.valor_mensal !== null
              ? formatarMoeda.format(
                  Number(contratoTipado.valor_mensal)
                )
              : 'Não informado'
          }
        />

        <Resumo
          icone={<CalendarDays size={20} />}
          titulo="Vencimento"
          valor={
            contratoTipado.dia_vencimento
              ? `Dia ${contratoTipado.dia_vencimento}`
              : 'Não informado'
          }
        />
      </div>

      {/* ==================================================
          DADOS DO CONTRATO
          ================================================== */}
      <Secao titulo="Dados do contrato">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Número do contrato"
            valor={contratoTipado.numero_contrato}
          />

          <Campo
            titulo="Tipo"
            valor={
              contratoTipado.tipo_contrato === 'ANTIGO'
                ? 'Contrato antigo'
                : 'Contrato novo'
            }
          />

          <Campo
            titulo="Status"
            valor={traduzirStatus(
              contratoTipado.status
            )}
          />

          <Campo
            titulo="Data de início"
            valor={formatarData(
              contratoTipado.data_inicio
            )}
          />

          <Campo
            titulo="Data de término"
            valor={formatarData(
              contratoTipado.data_fim
            )}
          />

          <Campo
            titulo="Dia do vencimento"
            valor={
              contratoTipado.dia_vencimento
                ? `Dia ${contratoTipado.dia_vencimento}`
                : null
            }
          />

          <Campo
            titulo="Valor mensal"
            valor={
              contratoTipado.valor_mensal !== null
                ? formatarMoeda.format(
                    Number(
                      contratoTipado.valor_mensal
                    )
                  )
                : null
            }
          />
        </div>
      </Secao>

      {/* ==================================================
          LOCATÁRIO
          ================================================== */}
      <Secao titulo="Locatário">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Nome"
            valor={
              contratoTipado.locatarios?.nome
            }
          />

          <Campo
            titulo="CPF / CNPJ"
            valor={
              contratoTipado.locatarios?.cpf_cnpj
            }
          />

          <Campo
            titulo="Telefone"
            valor={
              contratoTipado.locatarios?.telefone
            }
          />

          <Campo
            titulo="E-mail"
            valor={
              contratoTipado.locatarios?.email
            }
          />
        </div>

        {contratoTipado.locatarios?.id && (
          <div className="mt-6">
            <Link
              href={`/locatarios/${contratoTipado.locatarios.id}`}
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              Ver cadastro do locatário
            </Link>
          </div>
        )}
      </Secao>

      {/* ==================================================
          IMÓVEL
          ================================================== */}
      <Secao titulo="Imóvel">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Descrição"
            valor={
              contratoTipado.imoveis?.descricao
            }
          />

          <Campo
            titulo="Código do IPTU"
            valor={
              contratoTipado.imoveis?.codigo_iptu
            }
          />

          <Campo
            titulo="UC da energia"
            valor={
              contratoTipado.imoveis?.uc_energia
            }
          />

          <Campo
            titulo="UC da água"
            valor={
              contratoTipado.imoveis?.uc_agua
            }
          />

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Endereço"
              valor={
                contratoTipado.imoveis?.endereco
              }
            />
          </div>
        </div>

        {contratoTipado.imoveis?.id && (
          <div className="mt-6">
            <Link
              href={`/imoveis/${contratoTipado.imoveis.id}`}
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              Ver cadastro do imóvel
            </Link>
          </div>
        )}
      </Secao>

      {/* ==================================================
          REAJUSTE
          ================================================== */}
      <Secao titulo="Reajuste">
        <div className="grid gap-8 md:grid-cols-3">
          <Campo
            titulo="Índice"
            valor={
              contratoTipado.indice_reajuste
            }
          />

          <Campo
            titulo="Regra"
            valor={
              contratoTipado.regra_reajuste
            }
          />

          <Campo
            titulo="Próximo reajuste"
            valor={formatarData(
              contratoTipado.data_proximo_reajuste
            )}
          />
        </div>
      </Secao>

      {/* ==================================================
          MULTA E JUROS
          ================================================== */}
      <Secao titulo="Multa e juros">
        <div className="grid gap-8 md:grid-cols-2">
          <Campo
            titulo="Multa por atraso"
            valor={formatarPercentual(
              contratoTipado.percentual_multa
            )}
          />

          <Campo
            titulo="Juros por atraso"
            valor={formatarPercentual(
              contratoTipado.percentual_juros
            )}
          />
        </div>
      </Secao>

      {/* ==================================================
          OBSERVAÇÕES
          ================================================== */}
      <Secao titulo="Observações">
        <Campo
          titulo="Observações do contrato"
          valor={contratoTipado.observacoes}
        />
      </Secao>

      {/* ==================================================
          DOCUMENTO
          ================================================== */}
      <Secao titulo="Documento do contrato">
        {contratoTipado.arquivo_contrato ? (
          <p className="text-sm text-slate-700">
            Documento vinculado ao contrato.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Nenhum arquivo de contrato anexado.
          </p>
        )}
      </Secao>

      {/* ==================================================
          ENCERRAR CONTRATO
          ================================================== */}
      {contratoAtivo && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-red-900">
              Encerrar contrato
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-800">
              Ao encerrar este contrato, o status será
              alterado para Encerrado e o imóvel vinculado
              voltará a ficar disponível para uma nova
              locação.
            </p>

            <form
              action={encerrarContratoComId}
              className="mt-6"
            >
              <div className="max-w-sm">
                <label
                  htmlFor="data_encerramento"
                  className="mb-2 block text-sm font-semibold text-red-900"
                >
                  Data de encerramento
                </label>

                <input
                  id="data_encerramento"
                  type="date"
                  name="data_encerramento"
                  required
                  min={
                    contratoTipado.data_inicio ||
                    undefined
                  }
                  className="w-full rounded-lg border border-red-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-500"
                />

                <p className="mt-2 text-xs text-red-700">
                  Informe a data em que o contrato foi
                  efetivamente encerrado.
                </p>
              </div>

              <button
                type="submit"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
              >
                <CircleCheck size={18} />
                Confirmar encerramento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          CONTRATO ENCERRADO
          ================================================== */}
      {contratoTipado.status === 'ENCERRADO' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CircleCheck
              size={22}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="font-semibold text-emerald-900">
                Contrato encerrado
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                Este contrato foi encerrado em{' '}
                <strong>
                  {formatarData(
                    contratoTipado.data_fim
                  )}
                </strong>
                . O imóvel vinculado foi liberado para
                novas locações.
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

function traduzirStatus(status: string) {
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