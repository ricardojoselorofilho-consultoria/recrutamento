import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Cookie = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista: Cookie[]) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    }
  );
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return resposta;
}

export const config = { matcher: ["/painel/:path*", "/login"] };
