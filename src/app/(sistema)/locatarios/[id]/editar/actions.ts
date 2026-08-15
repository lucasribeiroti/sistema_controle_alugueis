'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type CampoErroEditarLocatario =
  | 'nome'
  | 'tipo_pessoa'
  | 'cpf_cnpj'
  | 'telefone'
  | 'cep'
  | 'estado'
  | 'geral'

export type EstadoEditarLocatario = {
  sucesso: boolean
  mensagem: string
  campo?: CampoErroEditarLocatario
}

/*
 * =====================================================
 * SOMENTE NÚMEROS
 * =====================================================
 */

function somenteNumeros(
  valor: string
) {
  return valor.replace(
    /\D/g,
    ''
  )
}

/*
 * =====================================================
 * TEXTO OPCIONAL
 * =====================================================
 */

function limparTexto(
  valor: FormDataEntryValue | null
) {
  const texto =
    String(
      valor ?? ''
    ).trim()

  return texto || null
}

/*
 * =====================================================
 * RETORNO DE ERRO
 * =====================================================
 */

function retornarErro(
  campo: CampoErroEditarLocatario,
  mensagem: string
): EstadoEditarLocatario {
  return {
    sucesso: false,
    campo,
    mensagem,
  }
}

/*
 * =====================================================
 * ATUALIZAR LOCATÁRIO
 * =====================================================
 */

export async function atualizarLocatario(
  id: string,
  _estadoAnterior: EstadoEditarLocatario,
  formData: FormData
): Promise<EstadoEditarLocatario> {
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
   * DADOS
   * =====================================================
   */

  const nome =
    String(
      formData.get(
        'nome'
      ) ?? ''
    ).trim()

  const tipoPessoa =
    String(
      formData.get(
        'tipo_pessoa'
      ) ?? ''
    ).trim()

  const cpfCnpj =
    somenteNumeros(
      String(
        formData.get(
          'cpf_cnpj'
        ) ?? ''
      )
    )

  const telefone =
    somenteNumeros(
      String(
        formData.get(
          'telefone'
        ) ?? ''
      )
    )

  const email =
    limparTexto(
      formData.get(
        'email'
      )
    )

  const endereco =
    limparTexto(
      formData.get(
        'endereco'
      )
    )

  const cepRecebido =
    somenteNumeros(
      String(
        formData.get(
          'cep'
        ) ?? ''
      )
    )

  const cidade =
    limparTexto(
      formData.get(
        'cidade'
      )
    )

  const estadoRecebido =
    String(
      formData.get(
        'estado'
      ) ?? ''
    )
      .trim()
      .toUpperCase()

  const observacoes =
    limparTexto(
      formData.get(
        'observacoes'
      )
    )

  /*
   * =====================================================
   * NOME
   * =====================================================
   */

  if (!nome) {
    return retornarErro(
      'nome',
      'O nome do locatário é obrigatório.'
    )
  }

  /*
   * =====================================================
   * TIPO DE PESSOA
   * =====================================================
   */

  if (
    tipoPessoa !== 'PF' &&
    tipoPessoa !== 'PJ'
  ) {
    return retornarErro(
      'tipo_pessoa',
      'O tipo de pessoa informado é inválido.'
    )
  }

  /*
   * =====================================================
   * CPF
   * =====================================================
   */

  if (
    tipoPessoa === 'PF' &&
    cpfCnpj.length !== 11
  ) {
    return retornarErro(
      'cpf_cnpj',
      'O CPF deve possuir exatamente 11 dígitos.'
    )
  }

  /*
   * =====================================================
   * CNPJ
   * =====================================================
   */

  if (
    tipoPessoa === 'PJ' &&
    cpfCnpj.length !== 14
  ) {
    return retornarErro(
      'cpf_cnpj',
      'O CNPJ deve possuir exatamente 14 dígitos.'
    )
  }

  /*
   * =====================================================
   * TELEFONE
   * =====================================================
   */

  if (
    telefone &&
    telefone.length !== 11
  ) {
    return retornarErro(
      'telefone',
      'O telefone deve possuir exatamente 11 dígitos, incluindo o DDD.'
    )
  }

  /*
   * =====================================================
   * CEP
   * =====================================================
   */

  const cep =
    cepRecebido ||
    null

  if (
    cep &&
    cep.length !== 8
  ) {
    return retornarErro(
      'cep',
      'O CEP deve possuir exatamente 8 dígitos.'
    )
  }

  /*
   * =====================================================
   * ESTADO
   * =====================================================
   */

  const estadosValidos = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ]

  const estado =
    estadoRecebido ||
    null

  if (
    estado &&
    !estadosValidos.includes(
      estado
    )
  ) {
    return retornarErro(
      'estado',
      'O estado informado é inválido.'
    )
  }

  /*
   * =====================================================
   * ATUALIZAÇÃO
   * =====================================================
   */

  const {
    data,
    error,
  } = await supabase
    .from('locatarios')
    .update({
      nome,

      tipo_pessoa:
        tipoPessoa,

      /*
       * Banco recebe somente números.
       */

      cpf_cnpj:
        cpfCnpj,

      telefone:
        telefone ||
        null,

      email,

      endereco,

      cep,

      cidade,

      estado,

      observacoes,

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
    .select('id')
    .single()

  /*
   * =====================================================
   * ERRO
   * =====================================================
   */

  if (
    error ||
    !data
  ) {
    console.error(
      'ERRO AO ATUALIZAR LOCATÁRIO'
    )

    if (error) {
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
    }

    /*
     * CPF / CNPJ duplicado.
     */

    if (
      error?.code ===
      '23505'
    ) {
      return retornarErro(
        'cpf_cnpj',
        'Já existe outro locatário cadastrado com este CPF ou CNPJ.'
      )
    }

    return retornarErro(
      'geral',
      'Não foi possível atualizar o locatário. Verifique os dados e tente novamente.'
    )
  }

  /*
   * =====================================================
   * CACHE
   * =====================================================
   */

  revalidatePath(
    '/locatarios'
  )

  revalidatePath(
    `/locatarios/${id}`
  )

  revalidatePath(
    `/locatarios/${id}/editar`
  )

  /*
   * =====================================================
   * SUCESSO
   * =====================================================
   */

  redirect(
    `/locatarios/${id}`
  )
}