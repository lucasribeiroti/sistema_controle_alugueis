'use client'

import {
  useActionState,
  useState,
} from 'react'

import Link from 'next/link'

import {
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react'

import {
  atualizarLocatario,
  type CampoErroEditarLocatario,
  type EstadoEditarLocatario,
} from './actions'

type TipoPessoa =
  | 'PF'
  | 'PJ'

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
}

const estadoInicial:
  EstadoEditarLocatario = {
    sucesso: false,
    mensagem: '',
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
    ).slice(
      0,
      11
    )

  if (
    numeros.length <= 3
  ) {
    return numeros
  }

  if (
    numeros.length <= 6
  ) {
    return (
      numeros.slice(
        0,
        3
      ) +
      '.' +
      numeros.slice(3)
    )
  }

  if (
    numeros.length <= 9
  ) {
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
      numeros.slice(6)
    )
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
    ).slice(
      0,
      14
    )

  if (
    numeros.length <= 2
  ) {
    return numeros
  }

  if (
    numeros.length <= 5
  ) {
    return (
      numeros.slice(
        0,
        2
      ) +
      '.' +
      numeros.slice(2)
    )
  }

  if (
    numeros.length <= 8
  ) {
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
      numeros.slice(5)
    )
  }

  if (
    numeros.length <= 12
  ) {
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
      numeros.slice(8)
    )
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
 * TELEFONE
 * =====================================================
 */

function formatarTelefone(
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
    numeros.length === 0
  ) {
    return ''
  }

  if (
    numeros.length <= 2
  ) {
    return `(${numeros}`
  }

  if (
    numeros.length <= 7
  ) {
    return (
      '(' +
      numeros.slice(
        0,
        2
      ) +
      ') ' +
      numeros.slice(2)
    )
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
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    ).slice(
      0,
      8
    )

  if (
    numeros.length <= 5
  ) {
    return numeros
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
 * FORMULÁRIO
 * =====================================================
 */

export default function FormularioEditarLocatario({
  locatario,
}: {
  locatario:
    Locatario
}) {
  /*
   * =====================================================
   * TIPO INICIAL
   * =====================================================
   */

  const tipoInicial:
    TipoPessoa =
      locatario.tipo_pessoa ===
      'PJ'
        ? 'PJ'
        : 'PF'

  /*
   * =====================================================
   * CAMPOS CONTROLADOS
   * =====================================================
   *
   * Todos estão em estado local.
   *
   * Assim, se a Server Action retornar erro,
   * absolutamente nada do formulário é apagado.
   */

  const [
    nome,
    setNome,
  ] =
    useState(
      locatario.nome
    )

  const [
    tipoPessoa,
    setTipoPessoa,
  ] =
    useState<TipoPessoa>(
      tipoInicial
    )

  const [
    cpfCnpj,
    setCpfCnpj,
  ] =
    useState(
      tipoInicial === 'PF'
        ? formatarCpf(
            locatario.cpf_cnpj ??
              ''
          )
        : formatarCnpj(
            locatario.cpf_cnpj ??
              ''
          )
    )

  const [
    telefone,
    setTelefone,
  ] =
    useState(
      formatarTelefone(
        locatario.telefone ??
          ''
      )
    )

  const [
    email,
    setEmail,
  ] =
    useState(
      locatario.email ??
        ''
    )

  const [
    endereco,
    setEndereco,
  ] =
    useState(
      locatario.endereco ??
        ''
    )

  const [
    cep,
    setCep,
  ] =
    useState(
      formatarCep(
        locatario.cep ??
          ''
      )
    )

  const [
    cidade,
    setCidade,
  ] =
    useState(
      locatario.cidade ??
        ''
    )

  const [
    estadoSelecionado,
    setEstadoSelecionado,
  ] =
    useState(
      locatario.estado ??
        ''
    )

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      locatario.observacoes ??
        ''
    )

  /*
   * =====================================================
   * SERVER ACTION
   * =====================================================
   */

  const atualizarLocatarioComId =
    atualizarLocatario.bind(
      null,
      locatario.id
    )

  const [
    estado,
    formAction,
    pendente,
  ] =
    useActionState(
      atualizarLocatarioComId,
      estadoInicial
    )

  /*
   * =====================================================
   * ALTERAR TIPO
   * =====================================================
   */

  function alterarTipoPessoa(
    novoTipo:
      TipoPessoa
  ) {
    setTipoPessoa(
      novoTipo
    )

    /*
     * CPF e CNPJ são documentos diferentes.
     */

    setCpfCnpj('')
  }

  /*
   * =====================================================
   * ALTERAR CPF / CNPJ
   * =====================================================
   */

  function alterarCpfCnpj(
    valor: string
  ) {
    if (
      tipoPessoa === 'PF'
    ) {
      setCpfCnpj(
        formatarCpf(
          valor
        )
      )

      return
    }

    setCpfCnpj(
      formatarCnpj(
        valor
      )
    )
  }

  return (
    <form
      action={
        formAction
      }
      className="space-y-6"
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
                Não foi possível salvar
              </p>

              <p className="mt-1 text-sm">
                {estado.mensagem}
              </p>
            </div>
          </div>
        )}

      {/* ==================================================
          NOME
          ================================================== */}

      <Campo
        label="Nome / Razão social"
      >
        <input
          type="text"
          name="nome"
          required
          value={
            nome
          }
          onChange={(
            event
          ) =>
            setNome(
              event.target.value
            )
          }
          placeholder="Digite o nome do locatário"
          aria-invalid={
            estado.campo ===
            'nome'
          }
          className={classeCampo(
            estado.campo ===
              'nome'
          )}
        />

        <MensagemCampo
          estado={
            estado
          }
          campo="nome"
        />
      </Campo>

      {/* ==================================================
          TIPO
          ================================================== */}

      <Campo
        label="Tipo de pessoa"
      >
        <select
          name="tipo_pessoa"
          value={
            tipoPessoa
          }
          onChange={(
            event
          ) =>
            alterarTipoPessoa(
              event.target
                .value as TipoPessoa
            )
          }
          aria-invalid={
            estado.campo ===
            'tipo_pessoa'
          }
          className={classeCampo(
            estado.campo ===
              'tipo_pessoa'
          )}
        >
          <option value="PF">
            Pessoa física
          </option>

          <option value="PJ">
            Pessoa jurídica
          </option>
        </select>

        <MensagemCampo
          estado={
            estado
          }
          campo="tipo_pessoa"
        />
      </Campo>

      {/* ==================================================
          CPF / CNPJ + TELEFONE
          ================================================== */}

      <div className="grid gap-6 md:grid-cols-2">
        <Campo
          label={
            tipoPessoa === 'PF'
              ? 'CPF'
              : 'CNPJ'
          }
        >
          <input
            type="text"
            name="cpf_cnpj"
            value={
              cpfCnpj
            }
            onChange={(
              event
            ) =>
              alterarCpfCnpj(
                event.target.value
              )
            }
            inputMode="numeric"
            required
            maxLength={
              tipoPessoa === 'PF'
                ? 14
                : 18
            }
            placeholder={
              tipoPessoa === 'PF'
                ? '000.000.000-00'
                : '00.000.000/0000-00'
            }
            aria-invalid={
              estado.campo ===
              'cpf_cnpj'
            }
            className={classeCampo(
              estado.campo ===
                'cpf_cnpj'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="cpf_cnpj"
            textoPadrao={
              tipoPessoa === 'PF'
                ? 'Digite os 11 números do CPF.'
                : 'Digite os 14 números do CNPJ.'
            }
          />
        </Campo>

        <Campo
          label="Telefone"
        >
          <input
            type="text"
            name="telefone"
            value={
              telefone
            }
            onChange={(
              event
            ) =>
              setTelefone(
                formatarTelefone(
                  event.target.value
                )
              )
            }
            inputMode="numeric"
            autoComplete="tel"
            maxLength={15}
            placeholder="(00) 00000-0000"
            aria-invalid={
              estado.campo ===
              'telefone'
            }
            className={classeCampo(
              estado.campo ===
                'telefone'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="telefone"
            textoPadrao="Digite DDD + número do celular."
          />
        </Campo>
      </div>

      {/* ==================================================
          E-MAIL
          ================================================== */}

      <Campo
        label="E-mail"
      >
        <input
          type="email"
          name="email"
          value={
            email
          }
          onChange={(
            event
          ) =>
            setEmail(
              event.target.value
            )
          }
          placeholder="email@exemplo.com"
          className={classeCampo(
            false
          )}
        />
      </Campo>

      {/* ==================================================
          ENDEREÇO
          ================================================== */}

      <Campo
        label="Endereço"
      >
        <input
          type="text"
          name="endereco"
          value={
            endereco
          }
          onChange={(
            event
          ) =>
            setEndereco(
              event.target.value
            )
          }
          placeholder="Rua, número e bairro"
          className={classeCampo(
            false
          )}
        />
      </Campo>

      {/* ==================================================
          CEP + CIDADE + ESTADO
          ================================================== */}

      <div className="grid gap-6 md:grid-cols-[220px_1fr_180px]">
        <Campo
          label="CEP"
        >
          <input
            type="text"
            name="cep"
            value={
              cep
            }
            onChange={(
              event
            ) =>
              setCep(
                formatarCep(
                  event.target.value
                )
              )
            }
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            placeholder="00000-000"
            aria-invalid={
              estado.campo ===
              'cep'
            }
            className={classeCampo(
              estado.campo ===
                'cep'
            )}
          />

          <MensagemCampo
            estado={
              estado
            }
            campo="cep"
            textoPadrao="Digite os 8 números do CEP."
          />
        </Campo>

        <Campo
          label="Cidade"
        >
          <input
            type="text"
            name="cidade"
            value={
              cidade
            }
            onChange={(
              event
            ) =>
              setCidade(
                event.target.value
              )
            }
            placeholder="Digite a cidade"
            className={classeCampo(
              false
            )}
          />
        </Campo>

        <Campo
          label="Estado"
        >
          <select
            name="estado"
            value={
              estadoSelecionado
            }
            onChange={(
              event
            ) =>
              setEstadoSelecionado(
                event.target.value
              )
            }
            aria-invalid={
              estado.campo ===
              'estado'
            }
            className={classeCampo(
              estado.campo ===
                'estado'
            )}
          >
            <option value="">
              Selecione
            </option>

            <option value="AC">AC</option>
            <option value="AL">AL</option>
            <option value="AP">AP</option>
            <option value="AM">AM</option>
            <option value="BA">BA</option>
            <option value="CE">CE</option>
            <option value="DF">DF</option>
            <option value="ES">ES</option>
            <option value="GO">GO</option>
            <option value="MA">MA</option>
            <option value="MT">MT</option>
            <option value="MS">MS</option>
            <option value="MG">MG</option>
            <option value="PA">PA</option>
            <option value="PB">PB</option>
            <option value="PR">PR</option>
            <option value="PE">PE</option>
            <option value="PI">PI</option>
            <option value="RJ">RJ</option>
            <option value="RN">RN</option>
            <option value="RS">RS</option>
            <option value="RO">RO</option>
            <option value="RR">RR</option>
            <option value="SC">SC</option>
            <option value="SP">SP</option>
            <option value="SE">SE</option>
            <option value="TO">TO</option>
          </select>

          <MensagemCampo
            estado={
              estado
            }
            campo="estado"
          />
        </Campo>
      </div>

      {/* ==================================================
          OBSERVAÇÕES
          ================================================== */}

      <Campo
        label="Observações"
      >
        <textarea
          name="observacoes"
          rows={4}
          value={
            observacoes
          }
          onChange={(
            event
          ) =>
            setObservacoes(
              event.target.value
            )
          }
          placeholder="Informações adicionais sobre o locatário..."
          className={`${classeCampo(
            false
          )} resize-y`}
        />
      </Campo>

      {/* ==================================================
          BOTÕES
          ================================================== */}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
        <Link
          href={`/locatarios/${locatario.id}`}
          className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>

        <button
          type="submit"
          disabled={
            pendente
          }
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />

              Salvando...
            </>
          ) : (
            <>
              <Save
                size={17}
              />

              Salvar alterações
            </>
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
}: {
  label: string
  children:
    React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
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
    EstadoEditarLocatario

  campo:
    CampoErroEditarLocatario

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
        className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600"
      >
        <AlertCircle
          size={13}
          className="mt-0.5 shrink-0"
        />

        {estado.mensagem}
      </p>
    )
  }

  if (!textoPadrao) {
    return null
  }

  return (
    <p className="mt-1.5 text-xs text-slate-500">
      {textoPadrao}
    </p>
  )
}

/*
 * =====================================================
 * ESTILO
 * =====================================================
 */

function classeCampo(
  erro: boolean
) {
  if (erro) {
    return 'w-full rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
  }

  return 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
}