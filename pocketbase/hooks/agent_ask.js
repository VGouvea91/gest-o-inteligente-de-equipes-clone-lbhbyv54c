routerAdd(
  'POST',
  '/backend/v1/ask-stream',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')
      if (!body.message?.trim()) return e.badRequestError('message is required')

      const conv = $ai.agent('gestor-ia').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
      })

      const iter = $ai.agent('gestor-ia').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: body.message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      return $response.stream(e, iter)
    } catch (err) {
      if (err.name === 'SkipAiConfigError')
        return e.json(503, { error: 'AI temporarily unavailable' })
      if (err.name === 'SkipAiAgentsError') {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'agent request failed' : err.message })
      }
      if (err.name === 'SkipAiError') {
        const status = err.status || 502
        return e.json(status, { error: status >= 500 ? 'AI temporarily unavailable' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
