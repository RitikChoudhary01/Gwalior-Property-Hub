"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { Logo } from "./shared/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Plus, User, Home, Building2, Info, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { initials, formatRelative } from "@/lib/format";

const NAV_LINKS = [
  { label: "Buy", href: "/properties" },
  { label: "Projects", href: "/projects" },
  { label: "Sell", href: "/list-property" },
  { label: "For Builders", href: "/partner" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const loadNotifications = useAppStore((s) => s.loadNotifications);
  const markAllRead = useAppStore((s) => s.markAllRead);

  // poll notifications every 60s while signed in
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => loadNotifications(), 60000);
    return () => clearInterval(t);
  }, [user, loadNotifications]);

  const isActive = (href: string) => route.path === href || route.path.startsWith(`${href}/`);

  async function handleLogout() {
    await logout();
    toast.success("Signed out", { description: "See you soon." });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#/"
          aria-label="Vasati — home"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <Logo />
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={`#${link.href}`}
              data-active={isActive(link.href)}
              onClick={(e) => {
                e.preventDefault();
                navigate(link.href);
              }}
              className={cn(
                "link-sweep text-sm font-medium transition-colors",
                isActive(link.href) ? "text-primary" : "text-foreground/75 hover:text-foreground"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unreadCount} unread)`}>
                    <Bell className="size-[1.15rem]" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[22rem] p-0">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllRead().catch(() => toast.error("Could not mark as read"))}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="vasati-scroll max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 12).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (n.link?.startsWith("#")) navigate(n.link.slice(1));
                          }}
                          className={cn(
                            "flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left last:border-0 transition-colors hover:bg-muted/70",
                            !n.isRead && "bg-accent/50"
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-foreground">{n.title}</span>
                            {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                          </span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                          <span className="text-[11px] text-muted-foreground/70">{formatRelative(n.createdAt)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2.5">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{user.name.split(" ")[0]}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-[11px] font-medium text-primary">{ROLE_LABELS[user.role]}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2">
                    <LayoutDashboard className="size-4" aria-hidden="true" /> Dashboard
                  </DropdownMenuItem>
                  {(user.role === "SELLER" || user.role === "BUILDER") && (
                    <DropdownMenuItem onClick={() => navigate("/list-property")} className="gap-2">
                      <Plus className="size-4" aria-hidden="true" /> Add new listing
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-rose-600 focus:text-rose-600">
                    <LogOut className="size-4" aria-hidden="true" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={() => navigate("/login")}
              >
                Sign in
              </Button>
              <Button onClick={() => navigate("/list-property")} className="gap-1.5">
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">List your</span> property
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="px-1">
                <Logo />
              </SheetTitle>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={`#${link.href}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.href);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(link.href) ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    {link.href === "/properties" && <Home className="size-4" aria-hidden="true" />}
                    {link.href === "/projects" && <Building2 className="size-4" aria-hidden="true" />}
                    {link.href === "/about" && <Info className="size-4" aria-hidden="true" />}
                    {link.href === "/contact" && <Mail className="size-4" aria-hidden="true" />}
                    {link.label}
                  </a>
                ))}
                <div className="my-3 h-px bg-border" />
                {user ? (
                  <>
                    <a
                      href="#/dashboard"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/dashboard");
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
                    >
                      <LayoutDashboard className="size-4" aria-hidden="true" /> Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-muted"
                    >
                      <LogOut className="size-4" aria-hidden="true" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href="#/login"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/login");
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
                    >
                      <User className="size-4" aria-hidden="true" /> Sign in
                    </a>
                    <Button className="mt-2" onClick={() => navigate("/register")}>
                      Create account
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
