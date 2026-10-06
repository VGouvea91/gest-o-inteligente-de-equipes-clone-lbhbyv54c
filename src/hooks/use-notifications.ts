import { useEffect, useState, useRef } from 'react'
import { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

/**
 * Hook de notificacoes para o gestor.
 * Subscreve ai_alerts via realtime e mantem:
 * - Contagem de alertas nao resolvidos (badge)
 * - 5 alertas mais recentes (dropdown)
 * - Toast automatico quando um novo alerta e criado
 */
export function useNotifications() {
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [recentAlerts, setRecentAlerts] = useState<RecordModel[]>([])
  const knownIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)

  const loadData = async () => {
    try {
      // Contagem de nao-resolvidos (so precisamos do total)
      const countResult = await pb
        .collection('ai_alerts')
        .getList(1, 1, { filter: 'resolved = false' })

      // 5 alertas mais recentes para o dropdown
      const recentResult = await pb.collection('ai_alerts').getList(1, 5, { sort: '-created' })

      const alerts = recentResult.items

      // Disparar toast para alertas novos (apos a carga inicial)
      if (!isFirstLoad.current) {
        for (const alert of alerts) {
          if (!knownIds.current.has(alert.id) && !alert.resolved) {
            toast({
              title: alert.severity === 'critical' ? '🚨 Alerta Critico' : '⚠️ Novo Alerta da IA',
              description: alert.message,
              variant: alert.severity === 'critical' ? 'destructive' : 'default',
            })
          }
        }
      }

      // Registrar IDs conhecidos
      for (const a of alerts) {
        knownIds.current.add(a.id)
      }
      isFirstLoad.current = false

      setUnresolvedCount(countResult.totalItems)
      setRecentAlerts(alerts)
    } catch (err) {
      console.error('useNotifications: falha ao carregar alertas', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('ai_alerts', () => loadData())

  return { unresolvedCount, recentAlerts }
}
