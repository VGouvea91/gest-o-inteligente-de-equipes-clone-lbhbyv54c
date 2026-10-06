migrate(
  (app) => {
    const teams = new Collection({
      name: 'teams',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_teams_owner ON teams (owner)'],
    })
    app.save(teams)

    const members = new Collection({
      name: 'members',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'team', type: 'relation', required: true, collectionId: teams.id, maxSelect: 1 },
        { name: 'role', type: 'select', required: true, values: ['admin', 'member'], maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          values: ['online', 'away', 'busy', 'offline'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_members_user_team ON members (user, team)'],
    })
    app.save(members)

    const tasks = new Collection({
      name: 'tasks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'team', type: 'relation', required: true, collectionId: teams.id, maxSelect: 1 },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['todo', 'doing', 'done'],
          maxSelect: 1,
        },
        {
          name: 'priority',
          type: 'select',
          required: true,
          values: ['low', 'medium', 'high'],
          maxSelect: 1,
        },
        { name: 'assignee', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'due_date', type: 'date' },
        { name: 'vector', type: 'vector', dimensions: 1536, distance: 'cosine' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tasks_team_status ON tasks (team, status)'],
    })
    app.save(tasks)

    const feedback = new Collection({
      name: 'feedback',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'sender', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        {
          name: 'receiver',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'sentiment', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(feedback)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('feedback'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('tasks'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('members'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('teams'))
    } catch (_) {}
  },
)
