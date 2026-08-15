import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  Plus,
} from 'lucide-react'

import {
  createClient,
} from '@/lib/supabase/server'

type LocatarioLista = {
  id: string
  nome: string
  tipo_pessoa: string
  cpf_cnpj: string | null
  telefone: string | null
  email: string | null
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
 *
 * 12156825625
 *
 * ->
 *
 * 121.568.256-25
 */

function formatarCpf(
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    ).slice(
      0,
      11
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
 *
 * 15659987655554
 *
 * ->
 *
 * 15.659.987/6555-54
 */

function formatarCnpj(
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    ).slice(
      0,
      14
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
 * CPF OU CNPJ
 * =====================================================
 */

function formatarCpfCnpj(
  valor: string | null,
  tipoPessoa: string
) {
  if (!valor) {
    return 'Não informado'
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
 *
 * 32984819297
 *
 * ->
 *
 * (32) 98481-9297
 */

function formatarTelefone(
  valor: string | null
) {
  if (!valor) {
    return 'Não informado'
  }

  const numeros =
    somenteNumeros(
      valor
    ).slice(
      0,
      11
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
 * TIPO DE PESSOA
 * =====================================================
 */

function traduzirTipoPessoa(
  tipoPessoa: string
) {
  if (
    tipoPessoa === 'PJ'
  ) {
    return 'Pessoa Jurídica'
  }

  return 'Pessoa Física'
}

/*
 * =====================================================
 * PÁGINA
 * =====================================================
 */

export default async function LocatariosPage() {
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
   * BUSCA LOCATÁRIOS
   * =====================================================
   */

  const {
    data: locatarios,
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
      ativo
    `)
    .eq(
      'usuario_id',
      user.id
    )
    .order(
      'nome',
      {
        ascending: true,
      }
    )

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

  if (error) {
    console.error(
      'ERRO AO CARREGAR LOCATÁRIOS'
    )

    console.error(
      'message:',
      error.message
    )

    console.error(
      'code:',
      error.code
    )

    console.error(
      'details:',
      error.details
    )

    console.error(
      'hint:',
      error.hint
    )
  }

  /*
   * =====================================================
   * TIPAGEM
   * =====================================================
   */

  const lista =
    (
      locatarios as
        LocatarioLista[] | null
    ) ?? []

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Locatários
          </h1>

          <p className="mt-2 text-slate-500">
            Gerencie as pessoas e empresas que alugam seus imóveis.
          </p>
        </div>

        <Link
          href="/locatarios/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus
            size={18}
          />

          Novo locatário
        </Link>
      </div>

      {/* ==================================================
          ERRO
          ================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar os locatários.
        </div>
      )}

      {/* ==================================================
          SEM LOCATÁRIOS
          ================================================== */}

      {!error &&
        lista.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-semibold text-slate-800">
              Nenhum locatário cadastrado.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Cadastre o primeiro locatário para começar.
            </p>
          </div>
        )}

      {/* ==================================================
          TABELA
          ================================================== */}

      {!error &&
        lista.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              {/* ============================================
                  CABEÇALHO
                  ============================================ */}

              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <Cabecalho>
                    Nome
                  </Cabecalho>

                  <Cabecalho>
                    Tipo
                  </Cabecalho>

                  <Cabecalho>
                    CPF / CNPJ
                  </Cabecalho>

                  <Cabecalho>
                    Telefone
                  </Cabecalho>

                  <Cabecalho>
                    E-mail
                  </Cabecalho>

                  <Cabecalho>
                    Status
                  </Cabecalho>
                </tr>
              </thead>

              {/* ============================================
                  DADOS
                  ============================================ */}

              <tbody className="divide-y divide-slate-100">
                {lista.map(
                  (
                    locatario
                  ) => (
                    <tr
                      key={
                        locatario.id
                      }
                      className="transition hover:bg-slate-50"
                    >
                      {/* NOME */}

                      <td className="px-6 py-4">
                        <Link
                          href={`/locatarios/${locatario.id}`}
                          className="font-medium text-slate-900 transition hover:text-blue-600 hover:underline"
                        >
                          {locatario.nome}
                        </Link>
                      </td>

                      {/* TIPO */}

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {traduzirTipoPessoa(
                          locatario.tipo_pessoa
                        )}
                      </td>

                      {/* CPF / CNPJ */}

                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatarCpfCnpj(
                          locatario.cpf_cnpj,
                          locatario.tipo_pessoa
                        )}
                      </td>

                      {/* TELEFONE */}

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatarTelefone(
                          locatario.telefone
                        )}
                      </td>

                      {/* E-MAIL */}

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {locatario.email ||
                          'Não informado'}
                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-4">
                        <Status
                          ativo={
                            locatario.ativo
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

/*
 * =====================================================
 * CABEÇALHO
 * =====================================================
 */

function Cabecalho({
  children,
}: {
  children:
    React.ReactNode
}) {
  return (
    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  )
}

/*
 * =====================================================
 * STATUS
 * =====================================================
 */

function Status({
  ativo,
}: {
  ativo: boolean
}) {
  if (ativo) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Ativo
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Inativo
    </span>
  )
}