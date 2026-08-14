'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function atualizarImovel(
  id: string,
  formData: FormData
) {
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

  const observacoes = String(
    formData.get('observacoes') || ''
  ).trim()

  const situacaoFormulario = String(
    formData.get('situacao') || ''
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

  // Busca o estado atual do imóvel
  const { data: imovelAtual, error: erroBusca } = await supabase
    .from('imoveis')
    .select('id, situacao')
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (erroBusca || !imovelAtual) {
    throw new Error('Imóvel não encontrado.')
  }

  let situacaoFinal = imovelAtual.situacao

  // Se estiver alugado, o formulário não poderá mudar a situação.
  if (imovelAtual.situacao !== 'ALUGADO') {
    if (
      situacaoFormulario !== 'DISPONIVEL' &&
      situacaoFormulario !== 'INATIVO'
    ) {
      throw new Error('Situação do imóvel inválida.')
    }

    situacaoFinal = situacaoFormulario
  }

  const { error } = await supabase
    .from('imoveis')
    .update({
      descricao,
      endereco,
      codigo_iptu: codigoIptu || null,
      uc_energia: ucEnergia || null,
      uc_agua: ucAgua || null,
      valor_aluguel_padrao: valorAluguel,
      situacao: situacaoFinal,
      observacoes: observacoes || null,
    })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) {
    console.log('ERRO AO ATUALIZAR IMÓVEL')
    console.log('message:', error.message)
    console.log('code:', error.code)
    console.log('details:', error.details)
    console.log('hint:', error.hint)

    throw new Error(
      'Não foi possível atualizar o imóvel.'
    )
  }

  revalidatePath('/imoveis')
  revalidatePath(`/imoveis/${id}`)

  redirect(`/imoveis/${id}`)
}