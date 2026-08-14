'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function criarImovel(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const descricao = String(
    formData.get('descricao') || ''
  ).trim()

  const endereco = String(
    formData.get('endereco') || ''
  ).trim()

  const codigoIptu = String(
    formData.get('codigo_iptu') || ''
  ).trim()

  const ucEnergia = String(
    formData.get('uc_energia') || ''
  ).trim()

  const ucAgua = String(
    formData.get('uc_agua') || ''
  ).trim()

  const situacao = String(
    formData.get('situacao') || 'DISPONIVEL'
  ).trim()

  const observacoes = String(
    formData.get('observacoes') || ''
  ).trim()

  const valorDigitado = String(
    formData.get('valor_aluguel_padrao') || ''
  ).trim()

  if (!descricao) {
    throw new Error('A descrição do imóvel é obrigatória.')
  }

  if (!endereco) {
    throw new Error('O endereço do imóvel é obrigatório.')
  }

  if (
    situacao !== 'DISPONIVEL' &&
    situacao !== 'INATIVO'
  ) {
    throw new Error('Situação do imóvel inválida.')
  }

  let valorAluguel: number | null = null

  if (valorDigitado) {
    const valorNormalizado = valorDigitado.includes(',')
      ? valorDigitado
          .replace(/\./g, '')
          .replace(',', '.')
      : valorDigitado

    valorAluguel = Number(valorNormalizado)

    if (
      Number.isNaN(valorAluguel) ||
      valorAluguel < 0
    ) {
      throw new Error('Valor do aluguel inválido.')
    }
  }

  const { error } = await supabase
    .from('imoveis')
    .insert({
      usuario_id: user.id,
      descricao,
      endereco,
      codigo_iptu: codigoIptu || null,
      uc_energia: ucEnergia || null,
      uc_agua: ucAgua || null,
      valor_aluguel_padrao: valorAluguel,
      situacao,
      observacoes: observacoes || null,
    })

  if (error) {
    console.log('ERRO AO CADASTRAR IMÓVEL')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)

    throw new Error(
      'Não foi possível cadastrar o imóvel.'
    )
  }

  revalidatePath('/imoveis')
  redirect('/imoveis')
}