import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth"];

function roleHome(role?: string): string {
  switch (role) {
    case "admin":   return "/admin";
    case "teacher": return "/teacher";
    case "parent":
    case "student": return "/parent";
    default:        return "/pending";
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path.startsWith(p));

  // Not logged in
  if (!user) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in + hitting /login → go home
  if (path.startsWith("/login")) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    return NextResponse.redirect(new URL(roleHome(profile?.role), request.url));
  }

  if (isPublic) return response;

  // Get role
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const role = profile?.role as string | undefined;

  // Pending or unknown → /pending
  if (!role || role === "pending") {
    if (!path.startsWith("/pending")) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    return response;
  }

  // Root → role home
  if (path === "/") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  // Protect /admin
  if (path.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  // Protect /teacher (admins can also access)
  if (path.startsWith("/teacher") && role !== "teacher" && role !== "admin") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  // Protect /parent
  if (path.startsWith("/parent") && !["parent", "student", "admin"].includes(role)) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
