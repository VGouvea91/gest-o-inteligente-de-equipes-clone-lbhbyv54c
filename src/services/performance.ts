import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getSnapshots = (userId: string) =>
  pb.collection('performance_snapshots').getFullList({
    filter: pb.filter('user = {:id}', { id: userId }),
    sort: 'date',
  })

export const getTeamSnapshots = (teamId: string) =>
  pb.collection('performance_snapshots').getFullList({
    filter: pb.filter('team = {:id}', { id: teamId }),
    expand: 'user',
    sort: 'date',
  })

export const getLatestSnapshots = () =>
  pb
    .collection('performance_snapshots')
    .getFullList({ expand: 'user,team', sort: '-date', perPage: 50 })
