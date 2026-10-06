migrate(
  (app) => {
    // Set admin role on seeded user
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'felipe.lemos@adapta.org')
      if (!admin.get('role')) {
        admin.set('role', 'admin')
        app.save(admin)
      }
    } catch (_) {}

    // Get team
    let teamId
    try {
      const team = app.findFirstRecordByData('teams', 'name', 'Equipe Alpha')
      teamId = team.id
    } catch (_) {
      return
    }

    // Get admin user id
    let adminId
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'felipe.lemos@adapta.org')
      adminId = admin.id
    } catch (_) {
      return
    }

    // Seed Objective 1
    const objectives = app.findCollectionByNameOrId('objectives')
    let obj1Id
    try {
      const existing = app.findFirstRecordByData(
        'objectives',
        'title',
        'Aumentar produtividade da equipe em 30%',
      )
      obj1Id = existing.id
    } catch (_) {
      const obj = new Record(objectives)
      obj.set('title', 'Aumentar produtividade da equipe em 30%')
      obj.set(
        'description',
        'Melhorar a eficiência geral da equipe reduzindo tempo ocioso e aumentando entregas concluídas por sprint.',
      )
      obj.set('team', teamId)
      obj.set('owner', adminId)
      obj.set('status', 'active')
      obj.set('progress', 45)
      app.save(obj)
      obj1Id = obj.id
    }

    // Seed Key Results for Objective 1
    const keyResults = app.findCollectionByNameOrId('key_results')
    const krs = [
      {
        description: 'Tarefas concluídas por sprint',
        target: 25,
        current: 18,
        unit: 'tarefas',
        status: 'on_track',
      },
      {
        description: 'Tempo médio de conclusão de tarefas',
        target: 3,
        current: 4.5,
        unit: 'dias',
        status: 'at_risk',
      },
      {
        description: 'Tarefas atrasadas por sprint',
        target: 2,
        current: 5,
        unit: 'tarefas',
        status: 'off_track',
      },
    ]

    for (const kr of krs) {
      try {
        app.findFirstRecordByData('key_results', 'description', kr.description)
      } catch (_) {
        const record = new Record(keyResults)
        record.set('objective', obj1Id)
        record.set('description', kr.description)
        record.set('target', kr.target)
        record.set('current', kr.current)
        record.set('unit', kr.unit)
        record.set('status', kr.status)
        app.save(record)
      }
    }

    // Seed Objective 2
    let obj2Id
    try {
      const existing = app.findFirstRecordByData(
        'objectives',
        'title',
        'Reduzir gargalos de carga de trabalho',
      )
      obj2Id = existing.id
    } catch (_) {
      const obj = new Record(objectives)
      obj.set('title', 'Reduzir gargalos de carga de trabalho')
      obj.set(
        'description',
        'Distribuir tarefas de forma equilibrada e identificar membros sobrecarregados.',
      )
      obj.set('team', teamId)
      obj.set('owner', adminId)
      obj.set('status', 'active')
      obj.set('progress', 20)
      app.save(obj)
      obj2Id = obj.id
    }

    const krs2 = [
      {
        description: 'Carga máxima por membro',
        target: 5,
        current: 8,
        unit: 'tarefas',
        status: 'off_track',
      },
      {
        description: 'Redistribuições de tarefas por sprint',
        target: 3,
        current: 1,
        unit: 'ações',
        status: 'on_track',
      },
    ]

    for (const kr of krs2) {
      try {
        app.findFirstRecordByData('key_results', 'description', kr.description)
      } catch (_) {
        const record = new Record(keyResults)
        record.set('objective', obj2Id)
        record.set('description', kr.description)
        record.set('target', kr.target)
        record.set('current', kr.current)
        record.set('unit', kr.unit)
        record.set('status', kr.status)
        app.save(record)
      }
    }

    // Seed sample AI alert
    const aiAlerts = app.findCollectionByNameOrId('ai_alerts')
    try {
      app.findFirstRecordByData(
        'ai_alerts',
        'message',
        'Membro Felipe Lemos está com 8 tarefas em andamento — carga 60% acima da média da equipe.',
      )
    } catch (_) {
      const alert = new Record(aiAlerts)
      alert.set('type', 'bottleneck')
      alert.set('severity', 'warning')
      alert.set(
        'message',
        'Membro Felipe Lemos está com 8 tarefas em andamento — carga 60% acima da média da equipe.',
      )
      alert.set('team', teamId)
      alert.set('resolved', false)
      alert.set(
        'context',
        JSON.stringify({
          member: 'Felipe Lemos',
          active_tasks: 8,
          team_avg: 3,
          deviation: '60%',
        }),
      )
      app.save(alert)

      // Seed recommendation for this alert
      const aiRecs = app.findCollectionByNameOrId('ai_recommendations')
      const rec = new Record(aiRecs)
      rec.set('alert', alert.id)
      rec.set(
        'suggestion',
        'Redistribuir 3 tarefas de baixa prioridade para outros membros da equipe. Tarefas sugeridas para redistribuição: "Revisar Backlog" e 2 outras.',
      )
      rec.set('priority', 'high')
      rec.set('action_type', 'reassign')
      rec.set('acted_on', false)
      app.save(rec)
    }

    // Seed sample performance snapshots
    const perfSnapshots = app.findCollectionByNameOrId('performance_snapshots')
    const today = new Date()
    const perfData = [
      { daysAgo: 0, tasks_done: 2, tasks_active: 8, velocity: 7.5, focus_score: 65, overdue: 3 },
      { daysAgo: 1, tasks_done: 3, tasks_active: 6, velocity: 8.0, focus_score: 72, overdue: 2 },
      { daysAgo: 2, tasks_done: 1, tasks_active: 7, velocity: 6.5, focus_score: 55, overdue: 4 },
      { daysAgo: 3, tasks_done: 4, tasks_active: 5, velocity: 9.0, focus_score: 80, overdue: 1 },
      { daysAgo: 4, tasks_done: 2, tasks_active: 6, velocity: 7.0, focus_score: 68, overdue: 2 },
    ]

    for (const p of perfData) {
      const date = new Date(today)
      date.setDate(date.getDate() - p.daysAgo)
      const dateStr = date.toISOString().split('T')[0]
      try {
        app.findFirstRecordByData('performance_snapshots', 'date', dateStr)
      } catch (_) {
        const snap = new Record(perfSnapshots)
        snap.set('user', adminId)
        snap.set('team', teamId)
        snap.set('date', dateStr)
        snap.set('tasks_done', p.tasks_done)
        snap.set('tasks_active', p.tasks_active)
        snap.set('velocity', p.velocity)
        snap.set('focus_score', p.focus_score)
        snap.set('overdue_tasks', p.overdue)
        app.save(snap)
      }
    }
  },
  (app) => {
    // Down: leave empty for safety on seeds
  },
)
