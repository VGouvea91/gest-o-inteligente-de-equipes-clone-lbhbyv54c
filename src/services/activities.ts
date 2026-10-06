import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getActivities = (userId?: string) => {
  if (userId) {
    return pb.collection('activities').getFullList({
      filter: pb.filter('user = {:id}', { id: userId }),
      expand: 'user,task',
      sort: '-created',
      perPage: 50,
    })
  }
  return pb
    .collection('activities')
    .getFullList({ expand: 'user,task', sort: '-created', perPage: 50 })
}

export const createActivity = (data: {
  user: string
  task?: string
  action: string
  metadata?: any
}) => pb.collection('activities').create(data)
