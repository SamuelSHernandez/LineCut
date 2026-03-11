import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/buyer");

  const navLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/restaurants", label: "Restaurants" },
    { href: "/admin/menu-items", label: "Menu" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/disputes", label: "Disputes" },
    { href: "/admin/reports", label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-butcher-paper">
      <nav className="flex items-center gap-6 px-6 md:px-12 py-4 border-b border-dashed border-[#ddd4c4]">
        <span className="font-[family-name:var(--font-display)] text-[20px] tracking-[2px] text-ketchup">
          LINECUT ADMIN
        </span>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <main className="px-6 md:px-12 py-8 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
