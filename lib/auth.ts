import "server-only";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/server";
import { admin } from "./supabase/admin";

/** Garante que quem está acessando é um recrutador cadastrado. */
export async function exigirRecrutador() {
  const sb = await supabaseServidor();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await admin().from("recrutadores").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) redirect("/login?erro=acesso");
  return user;
}
