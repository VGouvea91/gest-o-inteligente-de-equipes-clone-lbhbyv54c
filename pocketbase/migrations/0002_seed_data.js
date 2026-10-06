migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminId

    try {
      const existing = app.findAuthRecordByEmail('_pb_users_auth_', 'felipe.lemos@adapta.org')
      adminId = existing.id
    } catch (_) {
      const record = new Record(users)
      record.setEmail('felipe.lemos@adapta.org')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Felipe Lemos')
      app.save(record)
      adminId = record.id
    }

    const teams = app.findCollectionByNameOrId('teams')
    let teamId
    try {
      const existingTeam = app.findFirstRecordByData('teams', 'name', 'Equipe Alpha')
      teamId = existingTeam.id
    } catch (_) {
      const team = new Record(teams)
      team.set('name', 'Equipe Alpha')
      team.set('owner', adminId)
      app.save(team)
      teamId = team.id
    }

    const members = app.findCollectionByNameOrId('members')
    try {
      app.findFirstRecordByFilter('members', `user='${adminId}' && team='${teamId}'`)
    } catch (_) {
      const member = new Record(members)
      member.set('user', adminId)
      member.set('team', teamId)
      member.set('role', 'admin')
      member.set('status', 'online')
      app.save(member)
    }

    const tasks = app.findCollectionByNameOrId('tasks')
    const seedTasks = [
      { title: 'Implementar Autenticação', status: 'done', priority: 'high' },
      { title: 'Desenvolver Dashboard', status: 'doing', priority: 'medium' },
      { title: 'Revisar Backlog', status: 'todo', priority: 'low' },
    ]

    for (const t of seedTasks) {
      try {
        app.findFirstRecordByData('tasks', 'title', t.title)
      } catch (_) {
        const task = new Record(tasks)
        task.set('team', teamId)
        task.set('title', t.title)
        task.set('status', t.status)
        task.set('priority', t.priority)
        task.set('assignee', adminId)
        app.save(task)
      }
    }
  },
  (app) => {
    // down migration left empty for safety on seeds
  },
)
