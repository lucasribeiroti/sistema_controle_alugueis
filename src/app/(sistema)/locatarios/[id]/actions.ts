'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function alterarStatusLocatario(
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
   * BUSCA O STATUS ATUAL
   * =====================================================
   *
   * Não confiamos no status enviado pela tela.
   * Buscamos novamente no banco antes de alterar.
   */

  const {
    data: locatario,
    error: erroBusca,
  } = await supabase
    .from('locatarios')
    .select(`
      id,
      ativo
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
    !locatario
  ) {
    console.error(
      'ERRO AO BUSCAR LOCATÁRIO'
    )

    console.error(
      erroBusca
    )

    throw new Error(
      'Locatário não encontrado.'
    )
  }

  /*
   * =====================================================
   * INATIVAR
   * =====================================================
   */

  if (
    locatario.ativo
  ) {
    const {
      error,
    } = await supabase.rpc(
      'inativar_locatario_e_encerrar_contratos',
      {
        p_locatario_id:
          id,
      }
    )

    if (error) {
      console.error(
        'ERRO AO INATIVAR LOCATÁRIO'
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
        'Não foi possível inativar o locatário.'
      )
    }
  }

  /*
   * =====================================================
   * REATIVAR
   * =====================================================
   *
   * Reativar o cadastro NÃO reabre:
   *
   * contratos encerrados
   * mensalidades canceladas
   * imóveis antigos
   *
   * O histórico permanece intacto.
   */

  else {
    const {
      error,
    } = await supabase
      .from('locatarios')
      .update({
        ativo: true,
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
        'ERRO AO REATIVAR LOCATÁRIO'
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
        'Não foi possível reativar o locatário.'
      )
    }
  }

  /*
   * =====================================================
   * ATUALIZA CACHE
   * =====================================================
   */

  revalidatePath(
    '/locatarios'
  )

  revalidatePath(
    `/locatarios/${id}`
  )

  revalidatePath(
    '/contratos'
  )

  revalidatePath(
    '/imoveis'
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
}