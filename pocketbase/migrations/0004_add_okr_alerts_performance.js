migrate(
  (app) => {
    // 1. Add role field to users (global role)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'manager', 'member'],
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    // 2. Add estimate and spent fields to tasks
    const tasksCol = app.findCollectionByNameOrId('tasks')
    if (!tasksCol.fields.getByName('estimate')) {
      tasksCol.fields.add(new NumberField({ name: 'estimate', min: 0 }))
    }
    if (!tasksCol.fields.getByName('spent')) {
      tasksCol.fields.add(new NumberField({ name: 'spent', min: 0 }))
    }
    app.save(tasksCol)

    // 3. Create objectives collection
    const teamsId = app.findCollectionByNameOrId('teams').id
    const objectives = new Collection({
      name: 'objectives',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'team',
          type: 'relation',
          required: true,
          collectionId: teamsId,
          maxSelect: 1,
        },
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'completed', 'archived'],
          maxSelect: 1,
        },
        { name: 'progress', type: 'number', min: 0, max: 100 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_objectives_team ON objectives (team)',
        'CREATE INDEX idx_objectives_status ON objectives (status)',
      ],
    })
    app.save(objectives)

    // 4. Create key_results collection
    const objectivesId = app.findCollectionByNameOrId('objectives').id
    const keyResults = new Collection({
      name: 'key_results',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'objective',
          type: 'relation',
          required: true,
          collectionId: objectivesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'target', type: 'number', required: true },
        { name: 'current', type: 'number', min: 0 },
        { name: 'unit', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['on_track', 'at_risk', 'off_track', 'completed'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_key_results_objective ON key_results (objective)'],
    })
    app.save(keyResults)

    // 5. Add key_result relation to tasks
    const tasksCol2 = app.findCollectionByNameOrId('tasks')
    if (!tasksCol2.fields.getByName('key_result')) {
      tasksCol2.fields.add(
        new RelationField({
          name: 'key_result',
          collectionId: app.findCollectionByNameOrId('key_results').id,
          maxSelect: 1,
        }),
      )
    }
    app.save(tasksCol2)

    // 6. Create comments collection
    const comments = new Collection({
      name: 'comments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && author = @request.auth.id",
      deleteRule: "@request.auth.id != '' && author = @request.auth.id",
      fields: [
        {
          name: 'task',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('tasks').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'author',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'body', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_comments_task ON comments (task)'],
    })
    app.save(comments)

    // 7. Create activities collection
    const activities = new Collection({
      name: 'activities',
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
        {
          name: 'task',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('tasks').id,
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_activities_user ON activities (user)',
        'CREATE INDEX idx_activities_task ON activities (task)',
      ],
    })
    app.save(activities)

    // 8. Create ai_alerts collection
    const aiAlerts = new Collection({
      name: 'ai_alerts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: [
            'bottleneck',
            'delay',
            'okr_deviation',
            'velocity_drop',
            'focus_loss',
            'overload',
          ],
          maxSelect: 1,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['info', 'warning', 'critical'],
          maxSelect: 1,
        },
        { name: 'message', type: 'text', required: true },
        {
          name: 'team',
          type: 'relation',
          required: true,
          collectionId: teamsId,
          maxSelect: 1,
        },
        { name: 'context', type: 'json' },
        { name: 'resolved', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ai_alerts_team ON ai_alerts (team)',
        'CREATE INDEX idx_ai_alerts_severity ON ai_alerts (severity)',
        'CREATE INDEX idx_ai_alerts_resolved ON ai_alerts (resolved)',
      ],
    })
    app.save(aiAlerts)

    // 9. Create ai_recommendations collection
    const aiRecommendations = new Collection({
      name: 'ai_recommendations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'alert',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('ai_alerts').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'suggestion', type: 'text', required: true },
        {
          name: 'priority',
          type: 'select',
          values: ['low', 'medium', 'high'],
          maxSelect: 1,
        },
        {
          name: 'action_type',
          type: 'select',
          values: ['reassign', 'adjust_deadline', 'focus_kr', 'review', 'other'],
          maxSelect: 1,
        },
        { name: 'acted_on', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_ai_recs_alert ON ai_recommendations (alert)'],
    })
    app.save(aiRecommendations)

    // 10. Create performance_snapshots collection
    const performanceSnapshots = new Collection({
      name: 'performance_snapshots',
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
        {
          name: 'team',
          type: 'relation',
          collectionId: teamsId,
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'tasks_done', type: 'number', min: 0 },
        { name: 'tasks_active', type: 'number', min: 0 },
        { name: 'velocity', type: 'number', min: 0 },
        { name: 'focus_score', type: 'number', min: 0, max: 100 },
        { name: 'overdue_tasks', type: 'number', min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_perf_user_date ON performance_snapshots (user, date)',
        'CREATE INDEX idx_perf_team ON performance_snapshots (team)',
      ],
    })
    app.save(performanceSnapshots)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('performance_snapshots'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ai_recommendations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ai_alerts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('activities'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('comments'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('key_results'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('objectives'))
    } catch (_) {}

    try {
      const tasksCol = app.findCollectionByNameOrId('tasks')
      tasksCol.fields.removeByName('key_result')
      tasksCol.fields.removeByName('estimate')
      tasksCol.fields.removeByName('spent')
      app.save(tasksCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.fields.removeByName('role')
      app.save(usersCol)
    } catch (_) {}
  },
)
