import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getComments = (taskId: string) =>
  pb.collection('comments').getFullList({
    filter: pb.filter('task = {:id}', { id: taskId }),
    expand: 'author',
    sort: 'created',
  })

export const createComment = (data: { task: string; author: string; body: string }) =>
  pb.collection('comments').create(data)

export const deleteComment = (id: string) => pb.collection('comments').delete(id)
