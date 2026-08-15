'use client'

import {
  useActionState,
} from 'react'

import Link from 'next/link'

import {
  AlertCircle,
  CalendarClock,
  CircleDollarSign,
  Loader2,
} from 'lucide-react'

import {
  criarContrato,
  type CampoErroContrato,
  type EstadoCriarContrato,
} from './actions'

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

type Props = {
  locatarios:
    LocatarioOpcao[]

  imoveis:
    ImovelOpcao[]

  podeCriarContrato:
    boolean
}

const estadoInicial:
  EstadoCriarContrato = {
    sucesso: false,
    mensagem: '',
  }

export default function FormularioNovoContrato({
  locatarios,
  imoveis,
  podeCriarContrato,
}: Props) {
  const [
    estado,
    formAction,
    pendente,
  ] =
    useActionState(
      criarContrato,
      estadoInicial
    )

  return (
    <form
      action={
        formAction
      }
      className="space-y-8"
    >
      {/* ==================================================
          ERRO GERAL
          ================================================== */}

      {estado.campo ===
        'geral' &&
        estado.mensagem && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Não foi possível salvar o contrato
              </p>

              <p className="mt-1 text-sm">
                {estado.mensagem}
              </p>
            </div>
          </div>
        )}

      {/* ==================================================
          DADOS PRINCIPAIS
          ================================================== */}

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Dados do contrato
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Informe os dados principais da locação.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* NÚMERO */}

        <Campo
          label="Número do contrato"
        >
          <input
            id="numero_contrato"
            type="text"
            name="numero_contrato"
            required
            placeholder="Ex.: CONT-2026-001"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'numero_contrato'
            }
            className={classeCampo(
              estado.campo ===
                'numero_contrato'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="numero_contrato"
          />
        </Campo>

        {/* TIPO */}

        <Campo
          label="Tipo do contrato"
        >
          <select
            id="tipo_contrato"
            name="tipo_contrato"
            defaultValue="NOVO"
            required
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'tipo_contrato'
            }
            className={classeCampo(
              estado.campo ===
                'tipo_contrato'
            )}
          >
            <option value="NOVO">
              Contrato novo
            </option>

            <option value="ANTIGO">
              Contrato antigo
            </option>
          </select>

          <MensagemCampo
            estado={
              estado
            }
            campo="tipo_contrato"
          />
        </Campo>
      </div>

      {/* ==================================================
          LOCATÁRIO
          ================================================== */}

      <Campo
        label="Locatário"
      >
        <select
          id="locatario_id"
          name="locatario_id"
          defaultValue=""
          required
          disabled={
            !podeCriarContrato
          }
          aria-invalid={
            estado.campo ===
            'locatario_id'
          }
          className={classeCampo(
            estado.campo ===
              'locatario_id'
          )}
        >
          <option
            value=""
            disabled
          >
            Selecione um locatário
          </option>

          {locatarios.map(
            (
              locatario
            ) => (
              <option
                key={
                  locatario.id
                }
                value={
                  locatario.id
                }
              >
                {locatario.nome}

                {locatario.cpf_cnpj
                  ? ` - ${locatario.cpf_cnpj}`
                  : ''}
              </option>
            )
          )}
        </select>

        <MensagemCampo
          estado={
            estado
          }
          campo="locatario_id"
        />
      </Campo>

      {/* ==================================================
          IMÓVEL
          ================================================== */}

      <Campo
        label="Imóvel"
      >
        <select
          id="imovel_id"
          name="imovel_id"
          defaultValue=""
          required
          disabled={
            !podeCriarContrato
          }
          aria-invalid={
            estado.campo ===
            'imovel_id'
          }
          className={classeCampo(
            estado.campo ===
              'imovel_id'
          )}
        >
          <option
            value=""
            disabled
          >
            Selecione um imóvel
          </option>

          {imoveis.map(
            (
              imovel
            ) => (
              <option
                key={
                  imovel.id
                }
                value={
                  imovel.id
                }
              >
                {imovel.descricao}
                {' - '}
                {imovel.endereco}
              </option>
            )
          )}
        </select>

        <MensagemCampo
          estado={
            estado
          }
          campo="imovel_id"
          textoPadrao="Apenas imóveis disponíveis aparecem nesta lista."
        />
      </Campo>

      {/* ==================================================
          PERÍODO
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Período do contrato
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Defina o início e, se houver, o término previsto do contrato.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* INÍCIO */}

        <Campo
          label="Data de início"
        >
          <input
            id="data_inicio"
            type="date"
            name="data_inicio"
            required
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'data_inicio'
            }
            className={classeCampo(
              estado.campo ===
                'data_inicio'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="data_inicio"
          />
        </Campo>

        {/* TÉRMINO */}

        <Campo
          label="Data de término"
        >
          <input
            id="data_fim"
            type="date"
            name="data_fim"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'data_fim'
            }
            className={classeCampo(
              estado.campo ===
                'data_fim'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="data_fim"
            textoPadrao="Pode ficar em branco para contratos sem data final definida."
          />
        </Campo>
      </div>

      {/* ==================================================
          MENSALIDADE
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Mensalidade
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure o valor mensal e o dia normal de vencimento.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* VALOR */}

        <Campo
          label="Valor mensal"
        >
          <input
            id="valor_mensal"
            type="text"
            inputMode="decimal"
            name="valor_mensal"
            required
            placeholder="Ex.: 1500,00"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'valor_mensal'
            }
            className={classeCampo(
              estado.campo ===
                'valor_mensal'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="valor_mensal"
          />
        </Campo>

        {/* DIA DO VENCIMENTO */}

        <Campo
          label="Dia normal do vencimento"
        >
          <input
            id="dia_vencimento"
            type="number"
            name="dia_vencimento"
            min="1"
            max="31"
            required
            placeholder="Ex.: 10"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'dia_vencimento'
            }
            className={classeCampo(
              estado.campo ===
                'dia_vencimento'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="dia_vencimento"
            textoPadrao="As mensalidades seguintes respeitarão este dia."
          />
        </Campo>
      </div>

      {/* ==================================================
          PRIMEIRA MENSALIDADE
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CalendarClock
              size={20}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Primeira mensalidade
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Use estes campos somente quando houver uma condição especial para a primeira cobrança.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* PRIMEIRO VENCIMENTO */}

          <Campo
            label="Vencimento da primeira mensalidade"
            destaque
          >
            <input
              id="data_primeiro_vencimento"
              type="date"
              name="data_primeiro_vencimento"
              disabled={
                !podeCriarContrato
              }
              aria-invalid={
                estado.campo ===
                'data_primeiro_vencimento'
              }
              className={classeCampo(
                estado.campo ===
                  'data_primeiro_vencimento'
              )}
            />

            <MensagemCampo
              estado={
                estado
              }
              campo="data_primeiro_vencimento"
              textoPadrao="Opcional. Pode ser a própria data de início ou outra data combinada antes do primeiro vencimento normal."
            />
          </Campo>

          {/* VALOR PRIMEIRA */}

          <Campo
            label="Valor da primeira mensalidade"
            destaque
          >
            <div className="relative">
              <CircleDollarSign
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                id="valor_primeira_mensalidade"
                type="text"
                inputMode="decimal"
                name="valor_primeira_mensalidade"
                placeholder="Ex.: 900,00"
                disabled={
                  !podeCriarContrato
                }
                aria-invalid={
                  estado.campo ===
                  'valor_primeira_mensalidade'
                }
                className={classeCampoComIcone(
                  estado.campo ===
                    'valor_primeira_mensalidade'
                )}
              />
            </div>

            <MensagemCampo
              estado={
                estado
              }
              campo="valor_primeira_mensalidade"
              textoPadrao="Opcional. Se ficar vazio, será usado o valor mensal normal do contrato."
            />
          </Campo>
        </div>

        <div className="mt-5 rounded-lg border border-blue-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">
            Como funciona?
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Se estes campos ficarem vazios, o sistema calculará automaticamente o primeiro vencimento usando a data de início e o dia normal do vencimento.
          </p>

          <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <strong>
              Exemplo:
            </strong>

            <br />
            Início: 13/08/2026
            <br />
            Dia normal: 10
            <br />
            Primeira mensalidade especial: vazia
            <br />

            <strong>
              Resultado: primeiro vencimento em 10/09/2026
            </strong>
          </div>
        </div>
      </div>

      {/* ==================================================
          REAJUSTE
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Reajuste
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Preencha somente se o contrato possuir regras de reajuste.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Campo
          label="Índice de reajuste"
        >
          <input
            id="indice_reajuste"
            type="text"
            name="indice_reajuste"
            placeholder="Ex.: IPCA"
            disabled={
              !podeCriarContrato
            }
            className={classeCampo(
              false
            )}
          />
        </Campo>

        <Campo
          label="Regra de reajuste"
        >
          <input
            id="regra_reajuste"
            type="text"
            name="regra_reajuste"
            placeholder="Ex.: Anual"
            disabled={
              !podeCriarContrato
            }
            className={classeCampo(
              false
            )}
          />
        </Campo>

        <Campo
          label="Próximo reajuste"
        >
          <input
            id="data_proximo_reajuste"
            type="date"
            name="data_proximo_reajuste"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'data_proximo_reajuste'
            }
            className={classeCampo(
              estado.campo ===
                'data_proximo_reajuste'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="data_proximo_reajuste"
          />
        </Campo>
      </div>

      {/* ==================================================
          MULTA E JUROS
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Multa e juros
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure os percentuais previstos em caso de atraso.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Campo
          label="Multa por atraso (%)"
        >
          <input
            id="percentual_multa"
            type="text"
            inputMode="decimal"
            name="percentual_multa"
            placeholder="Ex.: 2,00"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'percentual_multa'
            }
            className={classeCampo(
              estado.campo ===
                'percentual_multa'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="percentual_multa"
          />
        </Campo>

        <Campo
          label="Juros por atraso (%)"
        >
          <input
            id="percentual_juros"
            type="text"
            inputMode="decimal"
            name="percentual_juros"
            placeholder="Ex.: 1,00"
            disabled={
              !podeCriarContrato
            }
            aria-invalid={
              estado.campo ===
              'percentual_juros'
            }
            className={classeCampo(
              estado.campo ===
                'percentual_juros'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="percentual_juros"
          />
        </Campo>
      </div>

      {/* ==================================================
          OBSERVAÇÕES
          ================================================== */}

      <div className="border-t border-slate-200 pt-8">
        <Campo
          label="Observações"
        >
          <textarea
            id="observacoes"
            name="observacoes"
            rows={5}
            placeholder="Informações adicionais sobre o contrato..."
            disabled={
              !podeCriarContrato
            }
            className={`${classeCampo(
              false
            )} resize-none`}
          />
        </Campo>
      </div>

      {/* ==================================================
          BOTÕES
          ================================================== */}

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
        <Link
          href="/contratos"
          className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>

        <button
          type="submit"
          disabled={
            !podeCriarContrato ||
            pendente
          }
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pendente ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Salvando...
            </>
          ) : (
            'Salvar contrato'
          )}
        </button>
      </div>
    </form>
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
  destaque = false,
}: {
  label: string
  children:
    React.ReactNode
  destaque?: boolean
}) {
  return (
    <div>
      <label
        className={`mb-2 block text-sm ${
          destaque
            ? 'font-semibold text-slate-800'
            : 'font-medium text-slate-700'
        }`}
      >
        {label}
      </label>

      {children}
    </div>
  )
}

/*
 * =====================================================
 * MENSAGEM DO CAMPO
 * =====================================================
 */

function MensagemCampo({
  estado,
  campo,
  textoPadrao,
}: {
  estado:
    EstadoCriarContrato

  campo:
    CampoErroContrato

  textoPadrao?: string
}) {
  if (
    estado.campo ===
      campo &&
    estado.mensagem
  ) {
    return (
      <p
        role="alert"
        className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-5 text-red-600"
      >
        <AlertCircle
          size={13}
          className="mt-0.5 shrink-0"
        />

        {estado.mensagem}
      </p>
    )
  }

  if (
    !textoPadrao
  ) {
    return null
  }

  return (
    <p className="mt-2 text-xs leading-5 text-slate-500">
      {textoPadrao}
    </p>
  )
}

/*
 * =====================================================
 * ESTILO DOS CAMPOS
 * =====================================================
 */

function classeCampo(
  erro: boolean
) {
  if (
    erro
  ) {
    return 'w-full rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100'
  }

  return 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100'
}

function classeCampoComIcone(
  erro: boolean
) {
  if (
    erro
  ) {
    return 'w-full rounded-lg border border-red-400 bg-red-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100'
  }

  return 'w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100'
}