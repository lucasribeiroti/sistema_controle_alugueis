'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  FileText,
  Gauge,
  House,
  LogOut,
  ReceiptText,
  Users,
  ChartNoAxesCombined,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

const menu = [
  {
    nome: 'Dashboard',
    href: '/dashboard',
    icone: Gauge,
  },
  {
    nome: 'Locatários',
    href: '/locatarios',
    icone: Users,
  },
  {
    nome: 'Imóveis',
    href: '/imoveis',
    icone: House,
  },
  {
    nome: 'Contratos',
    href: '/contratos',
    icone: FileText,
  },
  {
    nome: 'Aluguéis',
    href: '/alugueis',
    icone: ReceiptText,
  },
  {
    nome: 'Relatórios',
    href: '/relatorios',
    icone: ChartNoAxesCombined,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function sair() {
    const supabase = createClient()

    await supabase.auth.signOut()

    router.replace('/login')
    router.refresh()
  }

  return (
    <aside className="flex min-h-screen w-64 flex-col bg-slate-950 text-white">
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <Building2 size={22} />
        </div>

        <div>
          <p className="font-bold">Controle</p>
          <p className="text-sm text-slate-400">de Aluguéis</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menu.map((item) => {
          const Icone = item.icone
          const ativo = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                ativo
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icone size={19} />

              {item.nome}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          type="button"
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={19} />
          Sair
        </button>
      </div>
    </aside>
  )
}