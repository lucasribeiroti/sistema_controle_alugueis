'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function alterarStatusLocatario(
  id: string,
  ativoAtual: boolean
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const novoStatus = !ativoAtual

  const { data, error } = await supabase
    .from('locatarios')
    .update({
      ativo: novoStatus,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id, ativo')
    .single()

  if (error) {
    console.log('ERRO AO ALTERAR STATUS DO LOCATÁRIO')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)

    throw new Error(
      'Não foi possível alterar o status do locatário.'
    )
  }

  if (!data) {
    throw new Error('Locatário não encontrado.')
  }

  revalidatePath('/locatarios')
  revalidatePath(`/locatarios/${id}`)
}