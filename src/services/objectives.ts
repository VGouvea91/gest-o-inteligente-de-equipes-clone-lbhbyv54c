import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getObjectives = () =>
  pb.collection('objectives').getFullList({ expand: 'team,owner', sort: '-created' })

export const getObjective = (id: string) =>
  pb.collection('objectives').getOne(id, { expand: 'team,owner' })

export const createObjective = (data: {
  title: string
  description?: string
  team: string
  owner: string
  start_date?: string
  end_date?: string
  status?: string
}) => pb.collection('objectives').create(data)

export const updateObjective = (id: string, data: Partial<RecordModel>) =>
  pb.collection('objectives').update(id, data)

export const deleteObjective = (id: string) => pb.collection('objectives').delete(id)

export const getKeyResults = (objectiveId: string) =>
  pb
    .collection('key_results')
    .getFullList({ filter: pb.filter('objective = {:id}', { id: objectiveId }), sort: 'created' })

export const getAllKeyResults = () =>
  pb.collection('key_results').getFullList({ expand: 'objective', sort: '-created' })

export const createKeyResult = (data: {
  objective: string
  description: string
  target: number
  current?: number
  unit?: string
  status?: string
}) => pb.collection('key_results').create(data)

export const updateKeyResult = (id: string, data: Partial<RecordModel>) =>
  pb.collection('key_results').update(id, data)

export const deleteKeyResult = (id: string) => pb.collection('key_results').delete(id)
