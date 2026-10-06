import type { RecordModel } from 'pocketbase'

export function getAvatarUrl(
  user: RecordModel | null,
  size: 'thumbnail' | 'medium' | 'large' = 'thumbnail',
): string {
  if (!user) return ''
  if (user.avatar) {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`
  }
  return `https://img.usecurling.com/ppl/${size}?seed=${user.id}`
}
