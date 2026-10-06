routerAdd(
  'POST',
  '/backend/v1/search/tasks',
  (e) => {
    const body = e.requestInfo().body || {}
    const query = (body.query || '').trim()
    if (!query) return e.badRequestError('missing query')

    try {
      const embedRes = $ai.embed({ input: query })
      const results = $vectors.search(e, 'tasks', {
        field: 'vector',
        query: embedRes.data[0].embedding,
        k: body.k || 10,
        expand: ['assignee'],
      })
      return e.json(200, results)
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)
