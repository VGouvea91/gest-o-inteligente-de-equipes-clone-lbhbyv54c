import { useEffect, useState } from 'react'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'
import { getLatestSnapshots } from '@/services/performance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Activity, TrendingUp, Target, Zap, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Performance() {
  const [snapshots, setSnapshots] = useState<RecordModel[]>([])
  const [members, setMembers] = useState<RecordModel[]>([])

  const loadData = async () => {
    try {
      const [snaps, mems] = await Promise.all([
        getLatestSnapshots(),
        pb.collection('members').getFullList({ expand: 'user' }),
      ])
      setSnapshots(snaps)
      setMembers(mems)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('performance_snapshots', () => loadData())

  // Group snapshots by user
  const userSnapshots: Record<string, RecordModel[]> = {}
  for (const snap of snapshots) {
    const userId = snap.user
    if (!userSnapshots[userId]) userSnapshots[userId] = []
    userSnapshots[userId].push(snap)
  }

  // Get latest snapshot per user
  const latestPerUser = Object.entries(userSnapshots).map(([userId, snaps]) => {
    const sorted = snaps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return { userId, snapshot: sorted[0], all: sorted.reverse() }
  })

  // Build chart data from all snapshots (by date)
  const chartDates = [...new Set(snapshots.map((s) => s.date))].sort()
  const velocityData = chartDates.map((date) => {
    const daySnaps = snapshots.filter((s) => s.date === date)
    return {
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      velocity: daySnaps.reduce((acc, s) => acc + (s.velocity || 0), 0) / (daySnaps.length || 1),
      focus: daySnaps.reduce((acc, s) => acc + (s.focus_score || 0), 0) / (daySnaps.length || 1),
      tasks: daySnaps.reduce((acc, s) => acc + (s.tasks_done || 0), 0),
    }
  })

  const avgVelocity = velocityData.length
    ? (velocityData.reduce((acc, d) => acc + d.velocity, 0) / velocityData.length).toFixed(1)
    : '0'
  const avgFocus = velocityData.length
    ? Math.round(velocityData.reduce((acc, d) => acc + d.focus, 0) / velocityData.length)
    : 0
  const totalTasksDone = snapshots.reduce((acc, s) => acc + (s.tasks_done || 0), 0)
  const totalOverdue = snapshots.reduce((acc, s) => acc + (s.overdue_tasks || 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance da Equipe</h1>
        <p className="text-muted-foreground mt-1">
          Indicadores de produtividade, performance e evolução de cada colaborador.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Velocity Média</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgVelocity}</div>
            <p className="text-xs text-muted-foreground">tarefas/dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Foco Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgFocus}/100</div>
            <Progress value={avgFocus} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasksDone}</div>
            <p className="text-xs text-muted-foreground">últimos 5 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500 dark:text-rose-400">
              {totalOverdue}
            </div>
            <p className="text-xs text-muted-foreground">requer atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Velocity ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ChartContainer
              config={{ velocity: { color: 'hsl(var(--primary))' } }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="velocity"
                    stroke="var(--color-velocity)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score de Foco ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ChartContainer
              config={{ focus: { color: 'hsl(217, 91%, 60%)' } }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="focus"
                    stroke="var(--color-focus)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-member breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {latestPerUser.map(({ userId, snapshot }) => {
              const member = members.find((m) => m.expand?.user?.id === userId)
              const user = member?.expand?.user
              const userHistory = userSnapshots[userId] || []
              const trend =
                userHistory.length >= 2
                  ? userHistory[userHistory.length - 1].velocity - userHistory[0].velocity
                  : 0

              return (
                <div
                  key={userId}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?seed=${userId}`} />
                    <AvatarFallback>{user?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">
                      {member?.role === 'admin' ? 'Administrador' : 'Membro'}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Velocity</p>
                      <p className="text-lg font-bold">{snapshot.velocity?.toFixed(1) || '0'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Foco</p>
                      <p className="text-lg font-bold">{snapshot.focus_score || 0}/100</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {snapshot.tasks_done || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Atrasadas</p>
                      <p className="text-lg font-bold text-rose-500">
                        {snapshot.overdue_tasks || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Tendência</p>
                      <p
                        className={
                          trend >= 0
                            ? 'text-lg font-bold text-emerald-600 dark:text-emerald-400'
                            : 'text-lg font-bold text-rose-500 dark:text-rose-400'
                        }
                      >
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {latestPerUser.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de performance disponível ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
