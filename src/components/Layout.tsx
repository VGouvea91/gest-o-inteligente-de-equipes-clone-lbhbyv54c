import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/ThemeProvider'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Bell,
  Target,
  AlertTriangle,
  TrendingUp,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/use-notifications'
import { getAvatarUrl } from '@/lib/avatar'

export default function Layout() {
  const { user, signOut, isAdmin } = useAuth()
  const location = useLocation()
  const { unresolvedCount, recentAlerts } = useNotifications()
  const { theme, setTheme } = useTheme()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const isDarkMode =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
  }, [theme])

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, adminOnly: false },
    { name: 'Equipe', path: '/team', icon: Users, adminOnly: true },
    { name: 'Tarefas', path: '/tasks', icon: CheckSquare, adminOnly: false },
    { name: 'Objetivos', path: '/objectives', icon: Target, adminOnly: true },
    { name: 'Alertas IA', path: '/alerts', icon: AlertTriangle, adminOnly: false },
    { name: 'Performance', path: '/performance', icon: TrendingUp, adminOnly: false },
    { name: 'Gestor-IA', path: '/chat', icon: MessageSquare, adminOnly: false },
    { name: 'Configurações', path: '/settings', icon: Settings, adminOnly: true },
  ]

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin)

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">G</span>
          </div>
          Gestão Inteligente
        </h2>
      </div>
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-secondary cursor-pointer group"
        >
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={getAvatarUrl(user)} />
            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate group-hover:text-secondary-foreground transition-colors">
              {user?.name}
            </span>
            <span className="text-xs text-muted-foreground truncate group-hover:text-secondary-foreground/80 transition-colors">
              {user?.email}
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider mt-0.5',
                isAdmin ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isAdmin ? 'Administrador' : 'Funcionário'}
            </span>
          </div>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col md:pl-64 min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/95 backdrop-blur px-4 shadow-sm md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold md:hidden">Gestão</h1>
            <div className="hidden md:block flex-1" />
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="relative">
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="sr-only">Alternar tema</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unresolvedCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                        {unresolvedCount > 99 ? '99+' : unresolvedCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notificações</span>
                    {unresolvedCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {unresolvedCount} ativo(s)
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {recentAlerts.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum alerta no momento
                    </div>
                  ) : (
                    recentAlerts.map((alert) => (
                      <DropdownMenuItem key={alert.id} asChild>
                        <Link to="/alerts" className="flex items-start gap-3 py-2 cursor-pointer">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full mt-1.5 shrink-0',
                              alert.severity === 'critical'
                                ? 'bg-rose-500'
                                : alert.severity === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500',
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.type} · {alert.severity}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/alerts" className="cursor-pointer justify-center text-primary">
                      Ver todos os alertas
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getAvatarUrl(user)} />
                      <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/performance" className="cursor-pointer">
                      Minha Performance
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-transparent animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
