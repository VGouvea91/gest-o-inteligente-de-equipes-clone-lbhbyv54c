routerAdd(
  'POST',
  '/backend/v1/tasks/suggest-assignee',
  (e) => {
    const body = e.requestInfo().body || {}
    const { title, description, teamId } = body
    if (!title || !teamId) return e.badRequestError('title and teamId required')

    try {
      const members = $app.findRecordsByFilter('members', `team='${teamId}'`, '', 50, 0)
      let memberCtx = 'Membros disponíveis:\n'
      for (const m of members) {
        $app.expandRecord(m, ['user'])
        const u = m.expanded()?.user
        if (u) {
          memberCtx += `- ID: ${u.id}, Nome: ${u.getString('name') || u.getString('email')}, Status: ${m.getString('status')}\n`
        }
      }

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente de alocação de tarefas. Com base no título, descrição e na lista de membros (com seus IDs), responda APENAS com o ID do membro mais adequado para a tarefa. Se não houver membros, responda NONE. Não inclua nenhum outro texto.',
          },
          {
            role: 'user',
            content: `Tarefa: ${title}\nDescrição: ${description || ''}\n\n${memberCtx}`,
          },
        ],
      })

      const suggestedId = reply.choices[0].message.content.trim()
      return e.json(200, { assignee: suggestedId === 'NONE' ? null : suggestedId })
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)
