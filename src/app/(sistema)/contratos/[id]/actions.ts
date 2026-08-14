'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

function dataValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const data = new Date(`${valor}T00:00:00Z`)

  if (Number.isNaN(data.getTime())) {
    return false
  }

  return data.toISOString().slice(0, 10) === valor
}

export async function encerrarContrato(
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

  /*
   * =====================================================
   * DATA DE ENCERRAMENTO
   * =====================================================
   */

  const dataEncerramento = String(
    formData.get('data_encerramento') || ''
  ).trim()

  if (!dataEncerramento) {
    throw new Error(
      'Informe a data de encerramento do contrato.'
    )
  }

  if (!dataValida(dataEncerramento)) {
    throw new Error(
      'Data de encerramento inválida.'
    )
  }

  /*
   * =====================================================
   * BUSCA O CONTRATO ATUAL
   * =====================================================
   */

  const {
    data: contrato,
    error: erroContrato,
  } = await supabase
    .from('contratos')
    .select(`
      id,
      status,
      data_inicio,
      data_fim,
      imovel_id
    `)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .single()

  if (erroContrato || !contrato) {
    console.log(
      'ERRO AO BUSCAR CONTRATO PARA ENCERRAMENTO'
    )

    if (erroContrato) {
      console.log('message:', erroContrato.message)
      console.log('code:', erroContrato.code)
      console.log('details:', erroContrato.details)
      console.log('hint:', erroContrato.hint)
    }

    throw new Error(
      'Contrato não encontrado.'
    )
  }

  /*
   * =====================================================
   * SOMENTE CONTRATOS ATIVOS PODEM SER ENCERRADOS
   * =====================================================
   */

  if (contrato.status !== 'ATIVO') {
    throw new Error(
      'Somente contratos ativos podem ser encerrados.'
    )
  }

  /*
   * =====================================================
   * VALIDA DATA
   * =====================================================
   */

  if (
    contrato.data_inicio &&
    dataEncerramento < contrato.data_inicio
  ) {
    throw new Error(
      'A data de encerramento não pode ser anterior ao início do contrato.'
    )
  }

  /*
   * Guardamos a data final anterior.
   *
   * Se alguma etapa seguinte falhar,
   * poderemos restaurar o contrato.
   */

  const dataFimAnterior =
    contrato.data_fim ?? null

  /*
   * =====================================================
   * ENCERRA O CONTRATO
   * =====================================================
   */

  const {
    data: contratoEncerrado,
    error: erroEncerramento,
  } = await supabase
    .from('contratos')
    .update({
      status: 'ENCERRADO',
      data_fim: dataEncerramento,
    })
    .eq('id', contrato.id)
    .eq('usuario_id', user.id)
    .eq('status', 'ATIVO')
    .select('id')
    .single()

  if (
    erroEncerramento ||
    !contratoEncerrado
  ) {
    console.log(
      'ERRO AO ENCERRAR CONTRATO'
    )

    if (erroEncerramento) {
      console.log(
        'message:',
        erroEncerramento.message
      )

      console.log(
        'code:',
        erroEncerramento.code
      )

      console.log(
        'details:',
        erroEncerramento.details
      )

      console.log(
        'hint:',
        erroEncerramento.hint
      )
    }

    throw new Error(
      'Não foi possível encerrar o contrato.'
    )
  }

  /*
   * =====================================================
   * LIBERA O IMÓVEL
   * =====================================================
   */

  const {
    data: imoveisLiberados,
    error: erroLiberarImovel,
  } = await supabase
    .from('imoveis')
    .update({
      situacao: 'DISPONIVEL',
    })
    .eq('id', contrato.imovel_id)
    .eq('usuario_id', user.id)
    .eq('situacao', 'ALUGADO')
    .select('id')

  /*
   * =====================================================
   * SE NÃO CONSEGUIR LIBERAR O IMÓVEL
   * =====================================================
   *
   * Tentamos restaurar o contrato para ATIVO.
   *
   * Isso evita deixar:
   *
   * contrato ENCERRADO
   * +
   * imóvel ainda ALUGADO
   */

  if (
    erroLiberarImovel ||
    !imoveisLiberados ||
    imoveisLiberados.length !== 1
  ) {
    console.log(
      'ERRO AO LIBERAR IMÓVEL'
    )

    if (erroLiberarImovel) {
      console.log(
        'message:',
        erroLiberarImovel.message
      )

      console.log(
        'code:',
        erroLiberarImovel.code
      )

      console.log(
        'details:',
        erroLiberarImovel.details
      )

      console.log(
        'hint:',
        erroLiberarImovel.hint
      )
    }

    /*
     * ROLLBACK MANUAL
     */

    const {
      error: erroRestaurarContrato,
    } = await supabase
      .from('contratos')
      .update({
        status: 'ATIVO',
        data_fim: dataFimAnterior,
      })
      .eq('id', contrato.id)
      .eq('usuario_id', user.id)
      .eq('status', 'ENCERRADO')

    if (erroRestaurarContrato) {
      console.log(
        'ERRO AO RESTAURAR CONTRATO'
      )

      console.log(
        'message:',
        erroRestaurarContrato.message
      )

      console.log(
        'code:',
        erroRestaurarContrato.code
      )

      console.log(
        'details:',
        erroRestaurarContrato.details
      )

      console.log(
        'hint:',
        erroRestaurarContrato.hint
      )
    }

    throw new Error(
      'Não foi possível liberar o imóvel. O encerramento foi cancelado.'
    )
  }

  /*
   * =====================================================
   * ATUALIZA AS TELAS
   * =====================================================
   */

  revalidatePath('/contratos')
  revalidatePath(`/contratos/${id}`)

  revalidatePath('/imoveis')
  revalidatePath(
    `/imoveis/${contrato.imovel_id}`
  )

  redirect(`/contratos/${id}`)
}