'use client'

import {
  CircleCheck,
  CircleX,
} from 'lucide-react'

import {
  useFormStatus,
} from 'react-dom'

type Props = {
  ativo: boolean

  alterarStatusAction:
    (
      formData: FormData
    ) => Promise<void>
}

/*
 * =====================================================
 * MENSAGEM
 * =====================================================
 */

const mensagemConfirmacao =
  'Tem certeza que deseja desativar este locatário? Se ele possuir algum contrato ativo, ele será automaticamente encerrado e o imóvel relacionado disponível para locação'

/*
 * =====================================================
 * COMPONENTE
 * =====================================================
 */

export default function BotaoStatusLocatario({
  ativo,
  alterarStatusAction,
}: Props) {
  return (
    <form
      action={
        alterarStatusAction
      }
      onSubmit={(
        event
      ) => {
        /*
         * A confirmação é necessária
         * somente para inativação.
         */

        if (!ativo) {
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
        ativo={
          ativo
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
  ativo,
}: {
  ativo: boolean
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
        ativo
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-emerald-600 hover:bg-emerald-700'
      }`}
    >
      {ativo ? (
        <CircleX
          size={18}
        />
      ) : (
        <CircleCheck
          size={18}
        />
      )}

      {pending
        ? 'Processando...'
        : ativo
          ? 'Inativar'
          : 'Reativar'}
    </button>
  )
}