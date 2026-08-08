import { redirect } from 'next/navigation'

import Sidebar from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function SistemaLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div>
            <p className="text-sm text-slate-500">
              Sistema de Gestão
            </p>

            <p className="font-medium text-slate-900">
              Controle de Aluguéis
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">
              Usuário conectado
            </p>

            <p className="text-sm font-medium text-slate-800">
              {user.email}
            </p>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}