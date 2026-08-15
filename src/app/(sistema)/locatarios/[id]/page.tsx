import Link from 'next/link'

import {
  ArrowLeft,
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
  alterarStatusLocatario,
} from './actions'

import BotaoStatusLocatario from './BotaoStatusLocatario'

type Props = {
  params: Promise<{
    id: string
  }>
}

type Locatario = {
  id: string
  nome: string
  tipo_pessoa: string
  cpf_cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cep: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  ativo: boolean
}

/*
 * =====================================================
 * SOMENTE NÚMEROS
 * =====================================================
 */

function somenteNumeros(
  valor: string
) {
  return valor.replace(
    /\D/g,
    ''
  )
}

/*
 * =====================================================
 * CPF
 * =====================================================
 */

function formatarCpf(
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    )

  if (
    numeros.length !== 11
  ) {
    return valor
  }

  return (
    numeros.slice(
      0,
      3
    ) +
    '.' +
    numeros.slice(
      3,
      6
    ) +
    '.' +
    numeros.slice(
      6,
      9
    ) +
    '-' +
    numeros.slice(
      9,
      11
    )
  )
}

/*
 * =====================================================
 * CNPJ
 * =====================================================
 */

function formatarCnpj(
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    )

  if (
    numeros.length !== 14
  ) {
    return valor
  }

  return (
    numeros.slice(
      0,
      2
    ) +
    '.' +
    numeros.slice(
      2,
      5
    ) +
    '.' +
    numeros.slice(
      5,
      8
    ) +
    '/' +
    numeros.slice(
      8,
      12
    ) +
    '-' +
    numeros.slice(
      12,
      14
    )
  )
}

/*
 * =====================================================
 * CPF / CNPJ
 * =====================================================
 */

function formatarCpfCnpj(
  valor: string | null,
  tipoPessoa: string
) {
  if (!valor) {
    return null
  }

  if (
    tipoPessoa === 'PJ'
  ) {
    return formatarCnpj(
      valor
    )
  }

  return formatarCpf(
    valor
  )
}

/*
 * =====================================================
 * TELEFONE
 * =====================================================
 */

function formatarTelefone(
  valor: string | null
) {
  if (!valor) {
    return null
  }

  const numeros =
    somenteNumeros(
      valor
    )

  if (
    numeros.length !== 11
  ) {
    return valor
  }

  return (
    '(' +
    numeros.slice(
      0,
      2
    ) +
    ') ' +
    numeros.slice(
      2,
      7
    ) +
    '-' +
    numeros.slice(
      7,
      11
    )
  )
}

/*
 * =====================================================
 * CEP
 * =====================================================
 */

function formatarCep(
  valor: string | null
) {
  if (!valor) {
    return null
  }

  const numeros =
    somenteNumeros(
      valor
    )

  if (
    numeros.length !== 8
  ) {
    return valor
  }

  return (
    numeros.slice(
      0,
      5
    ) +
    '-' +
    numeros.slice(
      5,
      8
    )
  )
}

/*
 * =====================================================
 * PÁGINA
 * =====================================================
 */

export default async function LocatarioDetalhesPage({
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
   * BUSCA
   * =====================================================
   */

  const {
    data: locatario,
    error,
  } = await supabase
    .from('locatarios')
    .select(`
      id,
      nome,
      tipo_pessoa,
      cpf_cnpj,
      telefone,
      email,
      endereco,
      cep,
      cidade,
      estado,
      observacoes,
      ativo
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
    !locatario
  ) {
    notFound()
  }

  const locatarioTipado =
    locatario as Locatario

  /*
   * =====================================================
   * SERVER ACTION COM ID
   * =====================================================
   */

  const alterarStatusComId =
    alterarStatusLocatario.bind(
      null,
      locatarioTipado.id
    )

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div>
        <Link
          href="/locatarios"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft
            size={16}
          />

          Voltar para locatários
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {locatarioTipado.nome}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  locatarioTipado.ativo
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {locatarioTipado.ativo
                  ? 'Ativo'
                  : 'Inativo'}
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              Informações do locatário.
            </p>
          </div>

          {/* ==============================================
              AÇÕES
              ============================================== */}

          <div className="flex flex-wrap gap-3">
            <BotaoStatusLocatario
              ativo={
                locatarioTipado.ativo
              }
              alterarStatusAction={
                alterarStatusComId
              }
            />

            <Link
              href={`/locatarios/${locatarioTipado.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Pencil
                size={18}
              />

              Editar
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
            titulo="Nome / Razão social"
            valor={
              locatarioTipado.nome
            }
          />

          <Campo
            titulo="Tipo de pessoa"
            valor={
              locatarioTipado.tipo_pessoa ===
              'PF'
                ? 'Pessoa Física'
                : 'Pessoa Jurídica'
            }
          />

          <Campo
            titulo={
              locatarioTipado.tipo_pessoa ===
              'PF'
                ? 'CPF'
                : 'CNPJ'
            }
            valor={
              formatarCpfCnpj(
                locatarioTipado.cpf_cnpj,
                locatarioTipado.tipo_pessoa
              )
            }
          />

          <Campo
            titulo="Telefone"
            valor={
              formatarTelefone(
                locatarioTipado.telefone
              )
            }
          />

          <Campo
            titulo="E-mail"
            valor={
              locatarioTipado.email
            }
          />

          <Campo
            titulo="Status"
            valor={
              locatarioTipado.ativo
                ? 'Ativo'
                : 'Inativo'
            }
          />

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Endereço"
              valor={
                locatarioTipado.endereco
              }
            />
          </div>

          <Campo
            titulo="CEP"
            valor={
              formatarCep(
                locatarioTipado.cep
              )
            }
          />

          <Campo
            titulo="Cidade"
            valor={
              locatarioTipado.cidade
            }
          />

          <Campo
            titulo="Estado"
            valor={
              locatarioTipado.estado
            }
          />

          <div className="md:col-span-2 lg:col-span-3">
            <Campo
              titulo="Observações"
              valor={
                locatarioTipado.observacoes
              }
            />
          </div>
        </div>
      </div>
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