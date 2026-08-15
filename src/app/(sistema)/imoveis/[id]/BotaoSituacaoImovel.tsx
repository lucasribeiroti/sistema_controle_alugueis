'use client'

import {
  CircleCheck,
  CircleX,
} from 'lucide-react'

import {
  useFormStatus,
} from 'react-dom'

type Props = {
  situacao: string

  alterarSituacaoAction:
    (
      formData: FormData
    ) => Promise<void>
}

/*
 * =====================================================
 * CONFIRMAÇÃO
 * =====================================================
 */

const mensagemConfirmacao =
  'Tem certeza que deseja inativar este imóvel? Se ele possuir algum contrato ativo, o contrato será automaticamente encerrado. As mensalidades futuras serão canceladas e eventuais mensalidades vencidas permanecerão como "Não paga", com multa e juros continuando a ser calculados. O locatário continuará ativo.'

/*
 * =====================================================
 * COMPONENTE
 * =====================================================
 */

export default function BotaoSituacaoImovel({
  situacao,
  alterarSituacaoAction,
}: Props) {
  const estaInativo =
    situacao ===
    'INATIVO'

  return (
    <form
      action={
        alterarSituacaoAction
      }
      onSubmit={(
        event
      ) => {
        /*
         * Para disponibilizar novamente
         * não precisamos de confirmação.
         */

        if (
          estaInativo
        ) {
          return
        }

        const confirmou =
          window.confirm(
            mensagemConfirmacao
          )

        if (
          !confirmou
        ) {
          event.preventDefault()
        }
      }}
    >
      <Botao
        estaInativo={
          estaInativo
        }
      />
    </form>
  )
}

/*
 * =====================================================
 * BOTÃO
 * =====================================================
 */

function Botao({
  estaInativo,
}: {
  estaInativo: boolean
}) {
  const {
    pending,
  } =
    useFormStatus()

  return (
    <button
      type="submit"
      disabled={
        pending
      }
      className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
        estaInativo
          ? 'bg-emerald-600 hover:bg-emerald-700'
          : 'bg-red-600 hover:bg-red-700'
      }`}
    >
      {estaInativo ? (
        <CircleCheck
          size={18}
        />
      ) : (
        <CircleX
          size={18}
        />
      )}

      {pending
        ? 'Processando...'
        : estaInativo
          ? 'Disponibilizar'
          : 'Inativar'}
    </button>
  )
}