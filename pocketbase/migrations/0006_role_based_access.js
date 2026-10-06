// Migration 0006: Role-based access control
// 1. Adiciona campo `needs_password_setup` (bool) em users
// 2. Torna `role` required com default 'member'
// 3. Ajusta regras de acesso (RLS) baseadas em role
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar needs_password_setup
    if (!usersCol.fields.getByName('needs_password_setup')) {
      usersCol.fields.add(new BoolField({ name: 'needs_password_setup', required: false }))
    }

    // 2. Garantir que role existe e é required (já existe do template, só garantir default)
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      roleField.required = true
    }

    app.save(usersCol)

    // 3. Backfill: setar role='member' e needs_password_setup=false para usuarios existentes sem role
    const users = app.findRecordsByFilter(
      '_pb_users_auth_',
      "role = '' || role = null",
      '',
      1000,
      0,
    )
    for (const u of users) {
      if (!u.getString('role')) {
        u.set('role', 'member')
        app.save(u)
      }
    }

    // 4. Ajustar RLS da collection members — admin pode tudo, member só vê
    const membersCol = app.findCollectionByNameOrId('members')
    membersCol.listRule = "@request.auth.id != ''"
    membersCol.viewRule = "@request.auth.id != ''"
    membersCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    membersCol.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || user = @request.auth.id)"
    membersCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(membersCol)

    // 5. Ajustar RLS da collection tasks — admin cria/edita tudo, member só vê e atualiza status
    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule = "@request.auth.id != ''"
    tasksCol.viewRule = "@request.auth.id != ''"
    tasksCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    tasksCol.updateRule = "@request.auth.id != ''"
    tasksCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(tasksCol)

    // 6. Ajustar RLS da collection objectives — admin gerencia, member só vê
    const objectivesCol = app.findCollectionByNameOrId('objectives')
    objectivesCol.listRule = "@request.auth.id != ''"
    objectivesCol.viewRule = "@request.auth.id != ''"
    objectivesCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    objectivesCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    objectivesCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(objectivesCol)

    // 7. Ajustar RLS da collection key_results — admin gerencia, member só vê
    const keyResultsCol = app.findCollectionByNameOrId('key_results')
    keyResultsCol.listRule = "@request.auth.id != ''"
    keyResultsCol.viewRule = "@request.auth.id != ''"
    keyResultsCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    keyResultsCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    keyResultsCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(keyResultsCol)

    // 8. Ajustar RLS da collection teams — admin gerencia, member só vê
    const teamsCol = app.findCollectionByNameOrId('teams')
    teamsCol.listRule = "@request.auth.id != ''"
    teamsCol.viewRule = "@request.auth.id != ''"
    teamsCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    teamsCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    teamsCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(teamsCol)

    // 9. Ajustar RLS da collection ai_alerts — admin gerencia, member só vê
    const alertsCol = app.findCollectionByNameOrId('ai_alerts')
    alertsCol.listRule = "@request.auth.id != ''"
    alertsCol.viewRule = "@request.auth.id != ''"
    alertsCol.createRule = "@request.auth.id != ''"
    alertsCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    alertsCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(alertsCol)

    // 10. Ajustar RLS da collection users — admin pode listar, member só vê a si mesmo
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = '' // public (signup)
    usersCol.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.role = 'admin')"
    usersCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(usersCol)

    // 11. feedback — admin gerencia, member cria e vê
    const feedbackCol = app.findCollectionByNameOrId('feedback')
    if (feedbackCol) {
      feedbackCol.listRule = "@request.auth.id != ''"
      feedbackCol.viewRule = "@request.auth.id != ''"
      feedbackCol.createRule = "@request.auth.id != ''"
      feedbackCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      feedbackCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      app.save(feedbackCol)
    }
  },
  (app) => {
    // Down: reverter needs_password_setup e RLS
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (usersCol.fields.getByName('needs_password_setup')) {
      usersCol.fields.removeByName('needs_password_setup')
    }
    usersCol.listRule = 'id = @request.auth.id'
    usersCol.viewRule = 'id = @request.auth.id'
    usersCol.updateRule = 'id = @request.auth.id'
    usersCol.deleteRule = 'id = @request.auth.id'
    app.save(usersCol)

    const membersCol = app.findCollectionByNameOrId('members')
    membersCol.createRule = "@request.auth.id != ''"
    membersCol.updateRule = "@request.auth.id != ''"
    membersCol.deleteRule = "@request.auth.id != ''"
    app.save(membersCol)

    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.createRule = "@request.auth.id != ''"
    tasksCol.deleteRule = "@request.auth.id != ''"
    app.save(tasksCol)

    const objectivesCol = app.findCollectionByNameOrId('objectives')
    objectivesCol.createRule = "@request.auth.id != ''"
    objectivesCol.updateRule = "@request.auth.id != ''"
    objectivesCol.deleteRule = "@request.auth.id != ''"
    app.save(objectivesCol)

    const keyResultsCol = app.findCollectionByNameOrId('key_results')
    keyResultsCol.createRule = "@request.auth.id != ''"
    keyResultsCol.updateRule = "@request.auth.id != ''"
    keyResultsCol.deleteRule = "@request.auth.id != ''"
    app.save(keyResultsCol)

    const teamsCol = app.findCollectionByNameOrId('teams')
    teamsCol.createRule = "@request.auth.id != ''"
    teamsCol.updateRule = "@request.auth.id != '' && owner = @request.auth.id"
    teamsCol.deleteRule = "@request.auth.id != '' && owner = @request.auth.id"
    app.save(teamsCol)

    const alertsCol = app.findCollectionByNameOrId('ai_alerts')
    alertsCol.updateRule = "@request.auth.id != ''"
    alertsCol.deleteRule = "@request.auth.id != ''"
    app.save(alertsCol)
  },
)
