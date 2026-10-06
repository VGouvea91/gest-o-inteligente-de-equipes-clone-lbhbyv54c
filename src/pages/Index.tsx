import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare, Clock, Users, Activity } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { Sparkles, Loader2, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const stagger = (i: number) => ({ animationDelay: `${i * 100}ms` })

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-rose-500',
  offline: 'bg-slate-300 dark:bg-slate-600',
}

export default function Index() {
  const [tasks, setTasks] = useState<RecordModel[]>([])
  const [members, setMembers] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { isAdmin } = useAuth()

  const loadData = async () => {
    try {
      const t = await pb.collection('tasks').getFullList()
      setTasks(t)
      const m = await pb.collection('members').getFullList({ expand: 'user' })
      setMembers(m)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('tasks', () => loadData())
  useRealtime('members', () => loadData())

  if (loading) return <DashboardSkeleton />

  const handleAnalyzeNow = async () => {
    setIsAnalyzing(true)
    try {
      const teamId = members[0]?.team
      if (!teamId) {
        toast({ title: 'Nenhuma equipe encontrada', variant: 'destructive' })
        return
      }
      const res = await pb.send('/backend/v1/analyze-team', {
        method: 'POST',
        body: JSON.stringify({ teamId }),
      })
      if (res.success) {
        toast({
          title: `Análise concluída! ${res.alertas_gerados} alerta(s) gerado(s).`,
          description: res.resumo,
        })
      } else {
        toast({ title: 'Falha na análise', description: res.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Erro na análise', variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const activeTasks = tasks.filter((t) => t.status !== 'done').length
  const upcomingDeadlines = tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.due_date &&
      new Date(t.due_date) < new Date(Date.now() + 48 * 60 * 60 * 1000),
  ).length
  const onlineMembers = members.filter((m) => m.status === 'online').length
  const availability = members.length ? Math.round((onlineMembers / members.length) * 100) : 0
  const productivityScore = tasks.length
    ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
    : 0

  const stats = [
    {
      title: 'Tarefas Ativas',
      value: activeTasks,
      subtitle: `${tasks.length} totais`,
      icon: CheckSquare,
      color: '',
    },
    {
      title: 'Disponibilidade',
      value: `${availability}%`,
      subtitle: `${onlineMembers} online agora`,
      icon: Users,
      color: '',
    },
    {
      title: 'Prazos Próximos (48h)',
      value: upcomingDeadlines,
      subtitle: 'Requer atenção',
      icon: Clock,
      color: '',
    },
    {
      title: 'Score Produtividade AI',
      value: `${productivityScore}/100`,
      subtitle: 'Gerado pelo Gestor-IA',
      icon: Activity,
      color: 'text-primary',
    },
  ]

  const chartData = [
    { name: 'Seg', concluido: 4, novo: 2 },
    { name: 'Ter', concluido: 3, novo: 5 },
    { name: 'Qua', concluido: 7, novo: 1 },
    { name: 'Qui', concluido: 2, novo: 4 },
    { name: 'Sex', concluido: 6, novo: 3 },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do desempenho da sua equipe.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={handleAnalyzeNow}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 py-2 h-auto gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm whitespace-nowrap">
              {isAnalyzing ? 'Analisando...' : 'Analisar Agora'}
            </span>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card
            key={stat.title}
            className="animate-fade-in-up transition-all duration-300 hover:shadow-elevation hover:-translate-y-0.5"
            style={stagger(i)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={cn('h-4 w-4 text-muted-foreground', stat.color)} />
            </CardHeader>
            <CardContent>
              <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 animate-fade-in-up" style={stagger(4)}>
          <CardHeader>
            <CardTitle>Conclusão Semanal</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            <ChartContainer
              config={{
                concluido: { color: 'hsl(var(--primary))' },
                novo: { color: 'hsl(var(--muted-foreground))' },
              }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="concluido"
                    stroke="var(--color-concluido)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="novo"
                    stroke="var(--color-novo)"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 animate-fade-in-up" style={stagger(5)}>
          <CardHeader>
            <CardTitle>Presença da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.slice(0, 5).map((m) => {
                const u = m.expand?.user
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage
                            src={`https://img.usecurling.com/ppl/thumbnail?seed=${u?.id}`}
                          />
                          <AvatarFallback>{u?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
                            statusColors[m.status as keyof typeof statusColors] ||
                              statusColors.offline,
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{u?.name || u?.email}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{m.status}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tasks.filter((t) => t.assignee === u?.id && t.status !== 'done').length}{' '}
                      tasks
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de análise com blur de fundo */}
      <Dialog open={isAnalyzing}>
        <DialogContent
          className="max-w-md gap-6 border-none bg-transparent p-0 shadow-none [&>button:last-child]:hidden"
          overlayClassName="dialog-blur-overlay"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="rounded-xl border bg-card p-6 shadow-xl">
            <DialogHeader className="items-center text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50">
                <Brain className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <DialogTitle className="text-xl">Analisando equipe</DialogTitle>
              <DialogDescription>
                O Gestor-IA está processando os dados de tarefas, objetivos e performance da sua
                equipe...
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Isso pode levar alguns segundos.</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
