'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function criarLocatario(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const nome = String(formData.get('nome') || '').trim()
  const tipoPessoa = String(formData.get('tipo_pessoa') || '').trim()
  const cpfCnpj = String(formData.get('cpf_cnpj') || '').trim()
  const telefone = String(formData.get('telefone') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const endereco = String(formData.get('endereco') || '').trim()
  const observacoes = String(formData.get('observacoes') || '').trim()

  if (!nome) {
    throw new Error('O nome do locatário é obrigatório.')
  }

  const { error } = await supabase
    .from('locatarios')
    .insert({
      usuario_id: user.id,
      nome,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpfCnpj || null,
      telefone: telefone || null,
      email: email || null,
      endereco: endereco || null,
      observacoes: observacoes || null,
      ativo: true,
    })

  if (error) {
    console.log('ERRO AO CADASTRAR LOCATÁRIO')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)

    throw new Error('Não foi possível cadastrar o locatário.')
  }

  revalidatePath('/locatarios')
  redirect('/locatarios')
}