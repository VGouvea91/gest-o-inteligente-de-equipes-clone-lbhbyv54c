// Event hook: quando uma tarefa e atualizada, analisa instantaneamente:
// 1. Atraso critico (due_date < hoje && status != done)
// 2. Sobrecarga individual (assignee com > 7 tasks ativas)
// 3. Desvio de OKR (KR vinculado caiu abaixo de 60%)
// 4. Atualiza snapshot de performance do membro incrementalmente
onRecordAfterUpdateSuccess((e) => {
  const task = e.record
  const oldStatus = task.original().getString('status')
  const newStatus = task.getString('status')
  const assigneeId = task.getString('assignee')
  const teamId = task.getString('team')
  const dueDateStr = task.getString('due_date')
  const krId = task.getString('key_result')

  const statusChanged = oldStatus !== newStatus
  const assigneeChanged = task.original().getString('assignee') !== assigneeId
  const dueDateChanged = task.original().getString('due_date') !== dueDateStr

  if (!statusChanged && !assigneeChanged && !dueDateChanged) {
    return e.next()
  }

  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // --- 1. Atualizar snapshot de performance do membro ---
    if (assigneeId && statusChanged) {
      try {
        let snapshot
        try {
          snapshot = $app.findFirstRecordByFilter(
            'performance_snapshots',
            'user = {:userId} && date = {:dateStr}',
            { userId: assigneeId, dateStr: todayStr },
          )
        } catch (_) {
          const snapCol = $app.findCollectionByNameOrId('performance_snapshots')
          snapshot = new Record(snapCol)
          snapshot.set('user', assigneeId)
          snapshot.set('team', teamId)
          snapshot.set('date', todayStr)
          snapshot.set('tasks_done', 0)
          snapshot.set('tasks_active', 0)
          snapshot.set('velocity', 0)
          snapshot.set('focus_score', 0)
          snapshot.set('overdue_tasks', 0)
        }

        const memberTasks = $app.findRecordsByFilter(
          'tasks',
          'assignee = {:assigneeId}',
          '',
          500,
          0,
          { assigneeId },
        )

        let tasksDone = 0
        let tasksActive = 0
        let overdue = 0
        let tasksWithKR = 0

        for (const t of memberTasks) {
          const tStatus = t.getString('status')
          const tDue = t.getString('due_date')
          const tKR = t.getString('key_result')

          if (tStatus === 'done') {
            tasksDone++
          } else {
            tasksActive++
            if (tDue && new Date(tDue) < now) overdue++
          }
          if (tKR) tasksWithKR++
        }

        let velocity = 0
        try {
          const sevenDaysAgo = new Date(now)
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const weekAgoStr = sevenDaysAgo.toISOString()
          const recentDone = $app.findRecordsByFilter(
            'tasks',
            'assignee = {:assigneeId} && status = "done" && created >= {:weekAgoStr}',
            '',
            500,
            0,
            { assigneeId, weekAgoStr },
          )
          velocity = recentDone.length / 7
        } catch (_) {}

        const focusScore = tasksActive > 0 ? Math.round((tasksWithKR / tasksActive) * 100) : 0

        snapshot.set('tasks_done', tasksDone)
        snapshot.set('tasks_active', tasksActive)
        snapshot.set('velocity', Math.round(velocity * 10) / 10)
        snapshot.set('focus_score', Math.min(focusScore, 100))
        snapshot.set('overdue_tasks', overdue)
        $app.save(snapshot)
      } catch (err) {
        $app.logger().warn('snapshot update failed', 'error', err.message)
      }
    }

    // --- 2. Detectar atraso critico ---
    if (newStatus !== 'done' && dueDateStr && new Date(dueDateStr) < now) {
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
          'Tarefa "' + task.getString('title') + '" esta atrasada (prazo: ' + dueDateStr + ').',
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
          'Revisar o prazo da tarefa ou redistribuir para outro membro com menor carga.',
        )
        rec.set('priority', 'medium')
        rec.set('action_type', 'adjust_deadline')
        rec.set('acted_on', false)
        $app.save(rec)
      }
    }

    // --- 3. Detectar sobrecarga individual ---
    if (assigneeId && newStatus !== 'done') {
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
    }

    // --- 4. Detectar desvio de OKR ---
    if (krId && statusChanged) {
      try {
        const kr = $app.findRecordById('key_results', krId)
        const target = kr.getNumber('target') || 0
        const current = kr.getNumber('current') || 0
        const progress = target > 0 ? (current / target) * 100 : 0

        if (progress < 60 && kr.getString('status') !== 'completed') {
          let alreadyAlerted = false
          try {
            $app.findFirstRecordByFilter(
              'ai_alerts',
              'team = {:teamId} && resolved = false && type = "okr_deviation" && context ~ {:krId}',
              { teamId, krId },
            )
          } catch (_) {}

          if (!alreadyAlerted) {
            const alertCol = $app.findCollectionByNameOrId('ai_alerts')
            const alert = new Record(alertCol)
            alert.set('type', 'okr_deviation')
            alert.set('severity', 'warning')
            alert.set(
              'message',
              'Key Result "' +
                kr.getString('description') +
                '" esta em ' +
                Math.round(progress) +
                '% da meta - abaixo de 60%.',
            )
            alert.set('team', teamId)
            alert.set('resolved', false)
            alert.set(
              'context',
              JSON.stringify({
                key_result: krId,
                kr_description: kr.getString('description'),
                progress: Math.round(progress),
                target,
                current,
                source: 'automatic',
              }),
            )
            $app.save(alert)

            const recCol = $app.findCollectionByNameOrId('ai_recommendations')
            const rec = new Record(recCol)
            rec.set('alert', alert.id)
            rec.set(
              'suggestion',
              'Priorizar tarefas vinculadas a este Key Result e revisar a meta com a equipe.',
            )
            rec.set('priority', 'medium')
            rec.set('action_type', 'focus_kr')
            rec.set('acted_on', false)
            $app.save(rec)
          }
        }
      } catch (err) {
        $app.logger().warn('KR deviation check failed', 'error', err.message)
      }
    }
  } catch (err) {
    $app.logger().error('on_task_update_analyze failed', 'error', err.message, 'taskId', task.id)
  }

  return e.next()
}, 'tasks')
