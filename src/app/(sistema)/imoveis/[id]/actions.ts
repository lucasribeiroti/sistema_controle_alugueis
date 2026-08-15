'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function alterarSituacaoImovel(
  id: string,
  _formData: FormData
) {
  const supabase =
    await createClient()

  /*
   * =====================================================
   * AUTENTICAÇÃO
   * =====================================================
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * =====================================================
   * BUSCA SITUAÇÃO ATUAL
   * =====================================================
   */

  const {
    data: imovel,
    error: erroBusca,
  } = await supabase
    .from('imoveis')
    .select(`
      id,
      situacao
    `)
    .eq(
      'id',
      id
    )
    .eq(
      'usuario_id',
      user.id
    )
    .single()

  if (
    erroBusca ||
    !imovel
  ) {
    console.error(
      'ERRO AO BUSCAR IMÓVEL'
    )

    console.error(
      erroBusca
    )

    throw new Error(
      'Imóvel não encontrado.'
    )
  }

  /*
   * =====================================================
   * REATIVAÇÃO
   * =====================================================
   *
   * Um imóvel INATIVO volta apenas para
   * DISPONIVEL.
   *
   * Contratos antigos não são reabertos.
   * Mensalidades canceladas não são restauradas.
   */

  if (
    imovel.situacao ===
    'INATIVO'
  ) {
    const {
      error,
    } = await supabase
      .from('imoveis')
      .update({
        situacao:
          'DISPONIVEL',

        atualizado_em:
          new Date().toISOString(),
      })
      .eq(
        'id',
        id
      )
      .eq(
        'usuario_id',
        user.id
      )

    if (error) {
      console.error(
        'ERRO AO DISPONIBILIZAR IMÓVEL'
      )

      console.error(
        'message:',
        error.message
      )

      console.error(
        'code:',
        error.code
      )

      console.error(
        'details:',
        error.details
      )

      console.error(
        'hint:',
        error.hint
      )

      throw new Error(
        'Não foi possível disponibilizar o imóvel.'
      )
    }
  }

  /*
   * =====================================================
   * INATIVAÇÃO
   * =====================================================
   *
   * Pode ser:
   *
   * DISPONIVEL
   *
   * ou
   *
   * ALUGADO
   *
   * Se estiver ALUGADO, a função também encerra
   * o contrato e trata as mensalidades.
   */

  else {
    const {
      error,
    } = await supabase.rpc(
      'inativar_imovel_e_encerrar_contratos',
      {
        p_imovel_id:
          id,
      }
    )

    if (error) {
      console.error(
        'ERRO AO INATIVAR IMÓVEL'
      )

      console.error(
        'message:',
        error.message
      )

      console.error(
        'code:',
        error.code
      )

      console.error(
        'details:',
        error.details
      )

      console.error(
        'hint:',
        error.hint
      )

      throw new Error(
        'Não foi possível inativar o imóvel.'
      )
    }
  }

  /*
   * =====================================================
   * CACHE
   * =====================================================
   */

  revalidatePath(
    '/imoveis'
  )

  revalidatePath(
    `/imoveis/${id}`
  )

  revalidatePath(
    '/contratos'
  )

  revalidatePath(
    '/alugueis'
  )

  revalidatePath(
    '/dashboard'
  )

  revalidatePath(
    '/relatorios'
  )

  revalidatePath(
    '/locatarios'
  )
}