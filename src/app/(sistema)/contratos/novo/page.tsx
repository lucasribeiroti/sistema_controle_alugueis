import Link from 'next/link'

import {
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'

import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import FormularioNovoContrato from './FormularioNovoContrato'

type LocatarioOpcao = {
  id: string
  nome: string
  cpf_cnpj: string | null
}

type ImovelOpcao = {
  id: string
  descricao: string
  endereco: string
  valor_aluguel_padrao:
    | number
    | string
    | null
}

export default async function NovoContratoPage() {
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

  if (
    !user
  ) {
    redirect(
      '/login'
    )
  }

  /*
   * =====================================================
   * LOCATÁRIOS ATIVOS
   * =====================================================
   */

  const {
    data:
      locatarios,
    error:
      erroLocatarios,
  } =
    await supabase
      .from(
        'locatarios'
      )
      .select(`
        id,
        nome,
        cpf_cnpj
      `)
      .eq(
        'usuario_id',
        user.id
      )
      .eq(
        'ativo',
        true
      )
      .order(
        'nome',
        {
          ascending: true,
        }
      )

  /*
   * =====================================================
   * IMÓVEIS DISPONÍVEIS
   * =====================================================
   */

  const {
    data:
      imoveis,
    error:
      erroImoveis,
  } =
    await supabase
      .from(
        'imoveis'
      )
      .select(`
        id,
        descricao,
        endereco,
        valor_aluguel_padrao
      `)
      .eq(
        'usuario_id',
        user.id
      )
      .eq(
        'situacao',
        'DISPONIVEL'
      )
      .order(
        'descricao',
        {
          ascending: true,
        }
      )

  /*
   * =====================================================
   * LOGS
   * =====================================================
   */

  if (
    erroLocatarios
  ) {
    console.error(
      'ERRO AO CARREGAR LOCATÁRIOS'
    )

    console.error(
      erroLocatarios
    )
  }

  if (
    erroImoveis
  ) {
    console.error(
      'ERRO AO CARREGAR IMÓVEIS'
    )

    console.error(
      erroImoveis
    )
  }

  /*
   * =====================================================
   * LISTAS
   * =====================================================
   */

  const listaLocatarios =
    (
      locatarios as
        LocatarioOpcao[] | null
    ) ?? []

  const listaImoveis =
    (
      imoveis as
        ImovelOpcao[] | null
    ) ?? []

  const possuiLocatarios =
    !erroLocatarios &&
    listaLocatarios.length >
      0

  const possuiImoveis =
    !erroImoveis &&
    listaImoveis.length >
      0

  const podeCriarContrato =
    possuiLocatarios &&
    possuiImoveis

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
          <ArrowLeft
            size={16}
          />

          Voltar para contratos
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Novo contrato
        </h1>

        <p className="mt-2 text-slate-500">
          Vincule um locatário ativo a um imóvel disponível.
        </p>
      </div>

      {/* ==================================================
          AVISOS
          ================================================== */}

      {!possuiLocatarios && (
        <Aviso
          titulo="Nenhum locatário ativo disponível"
          descricao="Cadastre ou reative um locatário antes de criar um contrato."
          link="/locatarios"
          textoLink="Ir para locatários"
        />
      )}

      {!possuiImoveis && (
        <Aviso
          titulo="Nenhum imóvel disponível"
          descricao="Cadastre ou disponibilize um imóvel antes de criar um contrato."
          link="/imoveis"
          textoLink="Ir para imóveis"
        />
      )}

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <FormularioNovoContrato
          locatarios={
            listaLocatarios
          }
          imoveis={
            listaImoveis
          }
          podeCriarContrato={
            podeCriarContrato
          }
        />
      </div>
    </div>
  )
}

/*
 * =====================================================
 * AVISO
 * =====================================================
 */

function Aviso({
  titulo,
  descricao,
  link,
  textoLink,
}: {
  titulo: string
  descricao: string
  link: string
  textoLink: string
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          className="mt-0.5 shrink-0 text-amber-700"
        />

        <div>
          <p className="font-semibold text-amber-900">
            {titulo}
          </p>

          <p className="mt-1 text-sm text-amber-800">
            {descricao}
          </p>

          <Link
            href={
              link
            }
            className="mt-3 inline-block text-sm font-semibold text-amber-900 underline"
          >
            {textoLink}
          </Link>
        </div>
      </div>
    </div>
  )
}