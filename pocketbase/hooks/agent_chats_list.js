routerAdd(
  'GET',
  '/backend/v1/chats',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    const limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
    return e.json(200, $ai.agent('gestor-ia').listConversations({ user_id: userId, limit }))
  },
  $apis.requireAuth(),
)
