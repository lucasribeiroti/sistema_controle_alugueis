'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type CampoErroLocatario =
  | 'nome'
  | 'tipo_pessoa'
  | 'cpf_cnpj'
  | 'telefone'
  | 'cep'
  | 'estado'
  | 'geral'

export type EstadoCriarLocatario = {
  sucesso: boolean
  mensagem: string
  campo?: CampoErroLocatario
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
 * CRIAR LOCATÁRIO
 * =====================================================
 */

export async function criarLocatario(
  _estadoAnterior: EstadoCriarLocatario,
  formData: FormData
): Promise<EstadoCriarLocatario> {
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
    return {
      sucesso: false,
      campo: 'nome',
      mensagem:
        'O nome do locatário é obrigatório.',
    }
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
    return {
      sucesso: false,
      campo:
        'tipo_pessoa',
      mensagem:
        'O tipo de pessoa informado é inválido.',
    }
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
    return {
      sucesso: false,
      campo: 'cpf_cnpj',
      mensagem:
        'O CPF deve possuir exatamente 11 dígitos.',
    }
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
    return {
      sucesso: false,
      campo: 'cpf_cnpj',
      mensagem:
        'O CNPJ deve possuir exatamente 14 dígitos.',
    }
  }

  /*
   * =====================================================
   * TELEFONE
   * =====================================================
   */

  if (
    telefone.length !== 11
  ) {
    return {
      sucesso: false,
      campo: 'telefone',
      mensagem:
        'O telefone deve possuir exatamente 11 dígitos, incluindo o DDD.',
    }
  }

  /*
   * =====================================================
   * CEP
   * =====================================================
   */

  const cep =
    cepRecebido || null

  if (
    cep &&
    cep.length !== 8
  ) {
    return {
      sucesso: false,
      campo: 'cep',
      mensagem:
        'O CEP deve possuir exatamente 8 dígitos.',
    }
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
    return {
      sucesso: false,
      campo: 'estado',
      mensagem:
        'O estado informado é inválido.',
    }
  }

  /*
   * =====================================================
   * CADASTRO
   * =====================================================
   */

  const {
    error,
  } = await supabase
    .from('locatarios')
    .insert({
      usuario_id:
        user.id,

      nome,

      tipo_pessoa:
        tipoPessoa,

      cpf_cnpj:
        cpfCnpj,

      telefone,

      email,

      endereco,

      cep,

      cidade,

      estado,

      observacoes,

      ativo: true,
    })

  /*
   * =====================================================
   * ERROS DO BANCO
   * =====================================================
   */

  if (error) {
    console.error(
      'ERRO AO CADASTRAR LOCATÁRIO'
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

    /*
     * CPF / CNPJ duplicado.
     */

    if (
      error.code ===
      '23505'
    ) {
      return {
        sucesso: false,
        campo: 'cpf_cnpj',
        mensagem:
          'Já existe um locatário cadastrado com este CPF ou CNPJ.',
      }
    }

    /*
     * Qualquer outro erro conhecido pelo usuário
     * recebe uma mensagem amigável.
     */

    return {
      sucesso: false,
      campo: 'geral',
      mensagem:
        'Não foi possível cadastrar o locatário. Verifique os dados e tente novamente.',
    }
  }

  /*
   * =====================================================
   * SUCESSO
   * =====================================================
   */

  revalidatePath(
    '/locatarios'
  )

  redirect(
    '/locatarios'
  )
}