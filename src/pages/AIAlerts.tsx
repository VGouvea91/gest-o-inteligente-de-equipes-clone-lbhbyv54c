import { useEffect, useState } from 'react'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAlerts,
  resolveAlert,
  getRecommendations,
  actOnRecommendation,
} from '@/services/ai-alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Focus,
  Zap,
  CheckCircle2,
  Bell,
  Lightbulb,
  XCircle,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  bottleneck: { label: 'Gargalo de Carga', icon: Zap, color: 'text-amber-500' },
  delay: { label: 'Atraso Crítico', icon: Clock, color: 'text-rose-500' },
  okr_deviation: { label: 'Desvio de OKR', icon: AlertTriangle, color: 'text-orange-500' },
  velocity_drop: { label: 'Queda de Velocity', icon: TrendingDown, color: 'text-red-500' },
  focus_loss: { label: 'Foco Disperso', icon: Focus, color: 'text-blue-500' },
  overload: { label: 'Sobrecarga Individual', icon: AlertTriangle, color: 'text-purple-500' },
}

const severityConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; bg: string }
> = {
  info: {
    label: 'Info',
    variant: 'secondary',
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900',
  },
  warning: {
    label: 'Atenção',
    variant: 'outline',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900',
  },
  critical: {
    label: 'Crítico',
    variant: 'destructive',
    bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-900',
  },
}

export default function AIAlerts() {
  const [alerts, setAlerts] = useState<RecordModel[]>([])
  const [recommendationsMap, setRecommendationsMap] = useState<Record<string, RecordModel[]>>({})
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const loadData = async () => {
    try {
      const alertList = await getAlerts()
      setAlerts(alertList)

      const recMap: Record<string, RecordModel[]> = {}
      for (const alert of alertList) {
        recMap[alert.id] = await getRecommendations(alert.id)
      }
      setRecommendationsMap(recMap)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('ai_alerts', () => loadData())
  useRealtime('ai_recommendations', () => loadData())

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(alertId)
      toast({ title: 'Alerta resolvido!' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao resolver', variant: 'destructive' })
    }
  }

  const handleActOnRec = async (recId: string) => {
    try {
      await actOnRecommendation(recId)
      toast({ title: 'Recomendação marcada como executada!' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleAnalyzeNow = async () => {
    setIsAnalyzing(true)
    try {
      // Buscar teamId do primeiro alerta ou do primeiro membro
      let teamId = alerts[0]?.team
      if (!teamId) {
        const members = await pb.collection('members').getFullList()
        teamId = members[0]?.team
      }
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
        loadData()
      } else {
        toast({ title: 'Falha na análise', description: res.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Erro na análise', variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const unresolvedCount = alerts.filter((a) => !a.resolved).length
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas da IA</h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento contínuo e alertas proativos sobre a saúde da equipe.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Button
            onClick={handleAnalyzeNow}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isAnalyzing ? 'Analisando...' : 'Analisar Agora'}
          </Button>
          <Card className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{unresolvedCount}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Críticos</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {alerts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-muted-foreground">
              Nenhum alerta no momento. A IA está monitorando a equipe continuamente.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {alerts.map((alert) => {
          const typeCfg = typeConfig[alert.type] || typeConfig.bottleneck
          const sevCfg = severityConfig[alert.severity] || severityConfig.info
          const Icon = typeCfg.icon
          const recs = recommendationsMap[alert.id] || []
          const isSelected = selectedAlert === alert.id

          return (
            <Card
              key={alert.id}
              className={cn(
                'border-l-4 transition-all',
                alert.resolved ? 'opacity-60' : '',
                sevCfg.bg,
              )}
              style={{
                borderLeftColor:
                  alert.severity === 'critical'
                    ? '#e11d48'
                    : alert.severity === 'warning'
                      ? '#f59e0b'
                      : '#3b82f6',
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-6 w-6', typeCfg.color)} />
                    <div>
                      <CardTitle className="text-base">{typeCfg.label}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sevCfg.variant}>{sevCfg.label}</Badge>
                    {alert.resolved && (
                      <Badge variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Resolvido
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              {recs.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-2 mt-2">
                    {recs.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/60 border"
                      >
                        <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{rec.suggestion}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {rec.action_type === 'reassign'
                                ? 'Redistribuir'
                                : rec.action_type === 'adjust_deadline'
                                  ? 'Ajustar Prazo'
                                  : rec.action_type === 'focus_kr'
                                    ? 'Focar KR'
                                    : rec.action_type === 'review'
                                      ? 'Revisar'
                                      : 'Outro'}
                            </Badge>
                            {rec.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                Prioridade Alta
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!rec.acted_on ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActOnRec(rec.id)}
                          >
                            Executar
                          </Button>
                        ) : (
                          <Badge variant="secondary">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Feito
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {!alert.resolved && (
                <CardContent className="pt-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                    className="text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como resolvido
                  </Button>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
