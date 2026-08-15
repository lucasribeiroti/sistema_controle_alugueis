import Link from 'next/link'

import {
  ArrowLeft,
} from 'lucide-react'

import FormularioLocatario from './FormularioLocatario'

export default function NovoLocatarioPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/locatarios"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft
            size={16}
          />

          Voltar para locatários
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-slate-900">
          Novo locatário
        </h1>

        <p className="mt-2 text-slate-500">
          Cadastre uma pessoa ou empresa que aluga seus imóveis.
        </p>
      </div>

      <FormularioLocatario />
    </div>
  )
}