import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getAlerts = () =>
  pb.collection('ai_alerts').getFullList({ expand: 'team', sort: '-created' })

export const getUnresolvedAlerts = () =>
  pb
    .collection('ai_alerts')
    .getFullList({ filter: pb.filter('resolved = false'), sort: '-created' })

export const getAlert = (id: string) => pb.collection('ai_alerts').getOne(id)

export const resolveAlert = (id: string) =>
  pb.collection('ai_alerts').update(id, { resolved: true })

export const createAlert = (data: {
  type: string
  severity: string
  message: string
  team: string
  context?: any
}) => pb.collection('ai_alerts').create(data)

export const getRecommendations = (alertId: string) =>
  pb
    .collection('ai_recommendations')
    .getFullList({ filter: pb.filter('alert = {:id}', { id: alertId }), sort: '-created' })

export const getAllRecommendations = () =>
  pb.collection('ai_recommendations').getFullList({ expand: 'alert', sort: '-created' })

export const actOnRecommendation = (id: string) =>
  pb.collection('ai_recommendations').update(id, { acted_on: true })
