import { redirect } from 'next/navigation'
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

type ContratoOpcao = {
  id: string
  numero_contrato: string | null
}

type LocatarioOpcao = {
  id: string
  nome: string
}

type ImovelOpcao = {
  id: string
  descricao: string
}

export default async function RelatoriosPage() {
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
   * OPÇÕES DOS FILTROS
   * =====================================================
   */

  const [
    contratosResultado,
    locatariosResultado,
    imoveisResultado,
  ] = await Promise.all([
    supabase
      .from('contratos')
      .select(`
        id,
        numero_contrato
      `)
      .eq(
        'usuario_id',
        user.id
      )
      .order(
        'numero_contrato',
        {
          ascending: true,
        }
      ),

    supabase
      .from('locatarios')
      .select(`
        id,
        nome
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
      ),

    supabase
      .from('imoveis')
      .select(`
        id,
        descricao
      `)
      .eq(
        'usuario_id',
        user.id
      )
      .order(
        'descricao',
        {
          ascending: true,
        }
      ),
  ])

  const contratos =
    (
      contratosResultado
        .data as ContratoOpcao[] | null
    ) ?? []

  const locatarios =
    (
      locatariosResultado
        .data as LocatarioOpcao[] | null
    ) ?? []

  const imoveis =
    (
      imoveisResultado
        .data as ImovelOpcao[] | null
    ) ?? []

  return (
    <div className="space-y-8">
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <FileSpreadsheet
              size={23}
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Relatórios
            </h1>

            <p className="mt-1 text-slate-500">
              Selecione os parâmetros e exporte
              os dados diretamente para Excel.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          FORMULÁRIO
          ================================================== */}

      <form
        action="/api/relatorios/excel"
        method="GET"
        className="rounded-xl border border-slate-200 bg-white"
      >
        {/* ================================================
            TÍTULO
            ================================================ */}

        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
          <Filter
            size={19}
            className="text-blue-600"
          />

          <div>
            <h2 className="font-semibold text-slate-900">
              Parâmetros do relatório
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Deixe os campos vazios quando não quiser
              aplicar determinado filtro.
            </p>
          </div>
        </div>

        <div className="space-y-8 p-6">
          {/* ==============================================
              COMPETÊNCIA
              ============================================== */}

          <Secao
            titulo="Competência"
            descricao="Escolha um período de competências."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                label="Competência inicial"
              >
                <input
                  type="month"
                  name="competencia_de"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Competência final"
              >
                <input
                  type="month"
                  name="competencia_ate"
                  className={classeCampo}
                />
              </Campo>
            </div>
          </Secao>

          {/* ==============================================
              VENCIMENTO
              ============================================== */}

          <Secao
            titulo="Vencimento"
            descricao="Filtre pelas datas de vencimento das mensalidades."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                label="Vencimento inicial"
              >
                <input
                  type="date"
                  name="vencimento_de"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Vencimento final"
              >
                <input
                  type="date"
                  name="vencimento_ate"
                  className={classeCampo}
                />
              </Campo>
            </div>
          </Secao>

          {/* ==============================================
              PAGAMENTO
              ============================================== */}

          <Secao
            titulo="Data do pagamento"
            descricao="Permite extrair somente pagamentos realizados em determinado período."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                label="Pagamento inicial"
              >
                <input
                  type="date"
                  name="pagamento_de"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Pagamento final"
              >
                <input
                  type="date"
                  name="pagamento_ate"
                  className={classeCampo}
                />
              </Campo>
            </div>
          </Secao>

          {/* ==============================================
              CADASTROS
              ============================================== */}

          <Secao
            titulo="Contrato, locatário e imóvel"
            descricao="Você pode usar os filtros individualmente ou combiná-los."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <Campo
                label="Contrato"
              >
                <select
                  name="contrato_id"
                  className={classeCampo}
                  defaultValue=""
                >
                  <option value="">
                    Todos os contratos
                  </option>

                  {contratos.map(
                    (contrato) => (
                      <option
                        key={
                          contrato.id
                        }
                        value={
                          contrato.id
                        }
                      >
                        {contrato.numero_contrato ||
                          'Sem número'}
                      </option>
                    )
                  )}
                </select>
              </Campo>

              <Campo
                label="Locatário"
              >
                <select
                  name="locatario_id"
                  className={classeCampo}
                  defaultValue=""
                >
                  <option value="">
                    Todos os locatários
                  </option>

                  {locatarios.map(
                    (locatario) => (
                      <option
                        key={
                          locatario.id
                        }
                        value={
                          locatario.id
                        }
                      >
                        {locatario.nome}
                      </option>
                    )
                  )}
                </select>
              </Campo>

              <Campo
                label="Imóvel"
              >
                <select
                  name="imovel_id"
                  className={classeCampo}
                  defaultValue=""
                >
                  <option value="">
                    Todos os imóveis
                  </option>

                  {imoveis.map(
                    (imovel) => (
                      <option
                        key={
                          imovel.id
                        }
                        value={
                          imovel.id
                        }
                      >
                        {imovel.descricao}
                      </option>
                    )
                  )}
                </select>
              </Campo>
            </div>
          </Secao>

          {/* ==============================================
              VALORES
              ============================================== */}

          <Secao
            titulo="Valores"
            descricao="Use valores mínimos e máximos apenas quando quiser limitar o relatório."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Campo
                label="Valor mínimo"
              >
                <input
                  type="number"
                  name="valor_min"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Valor máximo"
              >
                <input
                  type="number"
                  name="valor_max"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Multa mínima"
              >
                <input
                  type="number"
                  name="multa_min"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Juros mínimo"
              >
                <input
                  type="number"
                  name="juros_min"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={classeCampo}
                />
              </Campo>

              <Campo
                label="Desconto mínimo"
              >
                <input
                  type="number"
                  name="desconto_min"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={classeCampo}
                />
              </Campo>
            </div>
          </Secao>

          {/* ==============================================
              SITUAÇÃO
              ============================================== */}

          <Secao
            titulo="Situação"
            descricao="Você pode selecionar várias situações. Se não marcar nenhuma, todas serão exportadas."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <CheckboxSituacao
                valor="ABERTO"
                texto="Aberto"
              />

              <CheckboxSituacao
                valor="ATRASADO"
                texto="Atrasado"
              />

              <CheckboxSituacao
                valor="PAGO"
                texto="Pago"
              />

              <CheckboxSituacao
                valor="PAGO_ATRASADO"
                texto="Pago em atraso"
              />

              <CheckboxSituacao
                valor="PAGO_ANTECIPADO_MESMO_MES"
                texto="Pago antecipado no mesmo mês"
              />

              <CheckboxSituacao
                valor="PAGO_ANTECIPADO_MES_ANTERIOR"
                texto="Pago antecipado em mês anterior"
              />

              <CheckboxSituacao
                valor="CANCELADO"
                texto="Cancelado"
              />
            </div>
          </Secao>

          {/* ==============================================
              BOTÃO
              ============================================== */}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <div className="flex items-start gap-2 text-sm text-slate-500">
              <CalendarDays
                size={17}
                className="mt-0.5 shrink-0"
              />

              <p>
                Multas e juros de mensalidades ainda
                atrasadas serão calculados até a data
                em que o Excel for gerado.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
              <Download
                size={18}
              />

              Exportar Excel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

/*
 * =====================================================
 * ESTILO DOS CAMPOS
 * =====================================================
 */

const classeCampo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

/*
 * =====================================================
 * SEÇÃO
 * =====================================================
 */

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">
          {titulo}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {descricao}
        </p>
      </div>

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
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}
    </label>
  )
}

/*
 * =====================================================
 * CHECKBOX
 * =====================================================
 */

function CheckboxSituacao({
  valor,
  texto,
}: {
  valor: string
  texto: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50">
      <input
        type="checkbox"
        name="situacao"
        value={valor}
        className="h-4 w-4 rounded border-slate-300"
      />

      <span className="text-sm font-medium text-slate-700">
        {texto}
      </span>
    </label>
  )
}