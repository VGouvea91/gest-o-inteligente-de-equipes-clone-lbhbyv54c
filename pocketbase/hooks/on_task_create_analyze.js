// Event hook: quando uma tarefa e criada, verifica sobrecarga do assignee
// e se a tarefa ja nasce atrasada (due_date < hoje)
onRecordAfterCreateSuccess((e) => {
  const task = e.record
  const assigneeId = task.getString('assignee')
  const teamId = task.getString('team')
  const dueDateStr = task.getString('due_date')

  if (!assigneeId || !teamId) return e.next()

  try {
    const now = new Date()

    // --- 1. Tarefa criada ja atrasada ---
    if (dueDateStr && new Date(dueDateStr) < now && task.getString('status') !== 'done') {
      let alreadyAlerted = false
      try {
        $app.findFirstRecordByFilter(
          'ai_alerts',
          'team = {:teamId} && resolved = false && type = "delay" && context ~ {:taskId}',
          { teamId, taskId: task.id },
        )
      } catch (_) {}

      if (!alreadyAlerted) {
        const alertCol = $app.findCollectionByNameOrId('ai_alerts')
        const alert = new Record(alertCol)
        alert.set('type', 'delay')
        alert.set('severity', 'warning')
        alert.set(
          'message',
          'Tarefa "' +
            task.getString('title') +
            '" foi criada com prazo vencido (' +
            dueDateStr +
            ').',
        )
        alert.set('team', teamId)
        alert.set('resolved', false)
        alert.set(
          'context',
          JSON.stringify({
            task_id: task.id,
            task_title: task.getString('title'),
            assignee: assigneeId,
            due_date: dueDateStr,
            source: 'automatic',
          }),
        )
        $app.save(alert)

        const recCol = $app.findCollectionByNameOrId('ai_recommendations')
        const rec = new Record(recCol)
        rec.set('alert', alert.id)
        rec.set(
          'suggestion',
          'Ajustar o prazo da tarefa para uma data viavel ou prioriza-la imediatamente.',
        )
        rec.set('priority', 'medium')
        rec.set('action_type', 'adjust_deadline')
        rec.set('acted_on', false)
        $app.save(rec)
      }
    }

    // --- 2. Sobrecarga do assignee ---
    let activeCount = 0
    try {
      const activeTasks = $app.findRecordsByFilter(
        'tasks',
        'assignee = {:assigneeId} && status != "done"',
        '',
        500,
        0,
        { assigneeId },
      )
      activeCount = activeTasks.length
    } catch (_) {}

    const OVERLOAD_THRESHOLD = 7

    if (activeCount > OVERLOAD_THRESHOLD) {
      let alreadyAlerted = false
      try {
        $app.findFirstRecordByFilter(
          'ai_alerts',
          'team = {:teamId} && resolved = false && type = "overload" && context ~ {:assigneeId}',
          { teamId, assigneeId },
        )
      } catch (_) {}

      if (!alreadyAlerted) {
        let userName = 'Membro'
        try {
          const user = $app.findRecordById('users', assigneeId)
          userName = user.getString('name') || user.getString('email')
        } catch (_) {}

        const alertCol = $app.findCollectionByNameOrId('ai_alerts')
        const alert = new Record(alertCol)
        alert.set('type', 'overload')
        alert.set('severity', 'critical')
        alert.set(
          'message',
          userName +
            ' esta com ' +
            activeCount +
            ' tarefas ativas - acima do limite de ' +
            OVERLOAD_THRESHOLD +
            '. Risco de gargalo.',
        )
        alert.set('team', teamId)
        alert.set('resolved', false)
        alert.set(
          'context',
          JSON.stringify({
            member: assigneeId,
            member_name: userName,
            active_tasks: activeCount,
            threshold: OVERLOAD_THRESHOLD,
            source: 'automatic',
          }),
        )
        $app.save(alert)

        const recCol = $app.findCollectionByNameOrId('ai_recommendations')
        const rec = new Record(recCol)
        rec.set('alert', alert.id)
        rec.set(
          'suggestion',
          'Redistribuir tarefas de baixa prioridade de ' +
            userName +
            ' para outros membros com menor carga.',
        )
        rec.set('priority', 'high')
        rec.set('action_type', 'reassign')
        rec.set('acted_on', false)
        $app.save(rec)
      }
    }
  } catch (err) {
    $app.logger().error('on_task_create_analyze failed', 'error', err.message, 'taskId', task.id)
  }

  return e.next()
}, 'tasks')
