import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function LocatariosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteção da página
  if (!user) {
    redirect("/login");
  }

  const { data: locatarios, error } = await supabase
    .from("locatarios")
    .select(`
      id,
      nome,
      tipo_pessoa,
      cpf_cnpj,
      telefone,
      email,
      ativo,
      criado_em
    `)
    .eq("usuario_id", user.id)
    .order("nome", { ascending: true });

  if (error) {
    console.log("ERRO SUPABASE LOCATARIOS:");
    console.log("message:", error.message);
    console.log("code:", error.code);
    console.log("details:", error.details);
    console.log("hint:", error.hint);
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Locatários
          </h1>

          <p className="mt-2 text-slate-500">
            Gerencie as pessoas e empresas que alugam seus imóveis.
          </p>
        </div>

        <Link
          href="/locatarios/novo"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo locatário
        </Link>
      </div>

      {/* Erro */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Não foi possível carregar os locatários.
        </div>
      ) : !locatarios || locatarios.length === 0 ? (
        /* Estado vazio */
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Users size={26} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Nenhum locatário cadastrado
          </h2>

          <p className="mt-2 max-w-md text-sm text-slate-500">
            Cadastre seu primeiro locatário para começar a criar contratos e
            controlar seus aluguéis.
          </p>

          <Link
            href="/locatarios/novo"
            className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Cadastrar locatário
          </Link>
        </div>
      ) : (
        /* Tabela */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nome
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tipo
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    CPF / CNPJ
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Telefone
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    E-mail
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {locatarios.map((locatario) => (
                  <tr
                    key={locatario.id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* Nome clicável */}
                    <td className="px-6 py-4 font-medium">
                      <Link
                        href={`/locatarios/${locatario.id}`}
                        className="text-slate-900 transition hover:text-blue-600 hover:underline"
                      >
                        {locatario.nome}
                      </Link>
                    </td>

                    {/* PF / PJ */}
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {locatario.tipo_pessoa === "PJ"
                        ? "Pessoa Jurídica"
                        : "Pessoa Física"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {locatario.cpf_cnpj || "-"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {locatario.telefone || "-"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {locatario.email || "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          locatario.ativo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {locatario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}