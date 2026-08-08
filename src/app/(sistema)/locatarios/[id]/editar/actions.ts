'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function atualizarLocatario(
  id: string,
  formData: FormData
) {
  const supabase = await createClient()

  // Verifica o usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Dados recebidos do formulário
  const nome = String(formData.get('nome') || '').trim()
  const tipoPessoa = String(formData.get('tipo_pessoa') || '').trim()
  const cpfCnpj = String(formData.get('cpf_cnpj') || '').trim()
  const telefone = String(formData.get('telefone') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const endereco = String(formData.get('endereco') || '').trim()
  const observacoes = String(formData.get('observacoes') || '').trim()

  // Validações
  if (!nome) {
    throw new Error('O nome do locatário é obrigatório.')
  }

  if (tipoPessoa !== 'PF' && tipoPessoa !== 'PJ') {
    throw new Error('Tipo de pessoa inválido.')
  }

  // Atualiza somente um registro pertencente ao usuário logado
  const { error } = await supabase
    .from('locatarios')
    .update({
      nome,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpfCnpj || null,
      telefone: telefone || null,
      email: email || null,
      endereco: endereco || null,
      observacoes: observacoes || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) {
    console.error('ERRO AO ATUALIZAR LOCATÁRIO')
    console.error('message:', error.message)
    console.error('code:', error.code)
    console.error('details:', error.details)
    console.error('hint:', error.hint)

    throw new Error('Não foi possível atualizar o locatário.')
  }

  // Limpa o cache das páginas que exibem esse registro
  revalidatePath('/locatarios')
  revalidatePath(`/locatarios/${id}`)

  // Volta para os detalhes
  redirect(`/locatarios/${id}`)
}