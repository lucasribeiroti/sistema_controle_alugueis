import Link from 'next/link'

import {
  ArrowLeft,
  House,
  Pencil,
} from 'lucide-react'

import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import {
  alterarSituacaoImovel,
} from './actions'

import BotaoSituacaoImovel from './BotaoSituacaoImovel'

type Props = {
  params: Promise<{
    id: string
  }>
}

const formatarMoeda =
  new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  )

export default async function ImovelDetalhesPage({
  params,
}: Props) {
  /*
   * =====================================================
   * ID
   * =====================================================
   */

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
   * BUSCA
   * =====================================================
   */

  const {
    data: imovel,
    error,
  } = await supabase
    .from('imoveis')
    .select(`
      id,
      descricao,
      endereco,
      codigo_iptu,
      uc_energia,
      uc_agua,
      valor_aluguel_padrao,
      situacao,
      observacoes
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

  if (
    error ||
    !imovel
  ) {
    notFound()
  }

  /*
   * =====================================================
   * SERVER ACTION
   * =====================================================
   */

  const alterarSituacaoComId =
    alterarSituacaoImovel.bind(
      null,
      imovel.id
    )

  const imovelAlugado =
    imovel.situacao ===
    'ALUGADO'

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div>
        <Link
          href="/imoveis"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft
            size={16}
          />

          Voltar para imóveis
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {imovel.descricao}
              </h1>

              <Situacao
                situacao={
                  imovel.situacao
                }
              />
            </div>

            <p className="mt-2 text-slate-500">
              Informações do imóvel.
            </p>
          </div>

          {/* ==============================================
              AÇÕES
              ============================================== */}

          <div className="flex flex-wrap gap-3">
            <BotaoSituacaoImovel
              situacao={
                imovel.situacao
              }
              alterarSituacaoAction={
                alterarSituacaoComId
              }
            />

            <Link
              href={`/imoveis/${imovel.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Pencil
                size={18}
              />

              Editar imóvel
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================
          INFORMAÇÕES
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Campo
            titulo="Descrição"
            valor={
              imovel.descricao
            }
          />

          <Campo
            titulo="Situação"
            valor={
              traduzirSituacao(
                imovel.situacao
              )
            }
          />

          <Campo
            titulo="Valor padrão do aluguel"
            valor={
              imovel.valor_aluguel_padrao !==
              null
                ? formatarMoeda.format(
                    Number(
                      imovel.valor_aluguel_padrao
                    )
                  )
                : null
            }
          />

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Endereço"
              valor={
                imovel.endereco
              }
            />
          </div>

          <Campo
            titulo="Código do IPTU"
            valor={
              imovel.codigo_iptu
            }
          />

          <Campo
            titulo="UC da energia"
            valor={
              imovel.uc_energia
            }
          />

          <Campo
            titulo="UC da água"
            valor={
              imovel.uc_agua
            }
          />

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Observações"
              valor={
                imovel.observacoes
              }
            />
          </div>
        </div>
      </div>

      {/* ==================================================
          AVISO PARA IMÓVEL ALUGADO
          ================================================== */}

      {imovelAlugado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <House
              size={20}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="font-semibold text-amber-900">
                Imóvel vinculado a um contrato ativo
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Se este imóvel for inativado, o
                contrato ativo será encerrado
                automaticamente. As mensalidades
                futuras serão canceladas e eventuais
                valores vencidos permanecerão como
                dívida, identificados como
                &quot;Não paga&quot;.
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                O locatário permanecerá ativo no
                sistema.
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
 * TRADUZ SITUAÇÃO
 * =====================================================
 */

function traduzirSituacao(
  situacao: string
) {
  if (
    situacao ===
    'ALUGADO'
  ) {
    return 'Alugado'
  }

  if (
    situacao ===
    'INATIVO'
  ) {
    return 'Inativo'
  }

  return 'Disponível'
}

/*
 * =====================================================
 * BADGE DE SITUAÇÃO
 * =====================================================
 */

function Situacao({
  situacao,
}: {
  situacao: string
}) {
  if (
    situacao ===
    'ALUGADO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        Alugado
      </span>
    )
  }

  if (
    situacao ===
    'INATIVO'
  ) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Inativo
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      Disponível
    </span>
  )
}