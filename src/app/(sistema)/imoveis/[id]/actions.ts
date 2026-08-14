'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function alterarSituacaoImovel(
  id: string,
  situacaoAtual: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Imóvel alugado só poderá ter a situação
  // alterada pelo módulo de contratos.
  if (situacaoAtual === 'ALUGADO') {
    throw new Error(
      'Um imóvel alugado não pode ter sua situação alterada manualmente.'
    )
  }

  const novaSituacao =
    situacaoAtual === 'DISPONIVEL'
      ? 'INATIVO'
      : 'DISPONIVEL'

  const { data, error } = await supabase
    .from('imoveis')
    .update({
      situacao: novaSituacao,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id, situacao')
    .single()

  if (error) {
    console.log('ERRO AO ALTERAR SITUAÇÃO DO IMÓVEL')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)

    throw new Error(
      'Não foi possível alterar a situação do imóvel.'
    )
  }

  if (!data) {
    throw new Error('Imóvel não encontrado.')
  }

  revalidatePath('/imoveis')
  revalidatePath(`/imoveis/${id}`)
}