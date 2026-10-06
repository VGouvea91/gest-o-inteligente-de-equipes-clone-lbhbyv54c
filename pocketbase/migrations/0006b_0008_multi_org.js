// Migration 0008: Multi-organizacoes
// 1. Cria collection organizations (name, slug, owner, plan)
// 2. Cria collection org_memberships (user, organization, role, status)
// 3. Adiciona campo organization em users e todas as collections de dados
// 4. Backfill: cria org padrao a partir do team existente, vincula todos os dados
migrate(
  (app) => {
    var usersId = '_pb_users_auth_'

    // ============================================================
    // 1. Criar collection organizations
    // ============================================================
    var orgCol
    try {
      orgCol = app.findCollectionByNameOrId('organizations')
    } catch (e) {
      orgCol = new Collection({
        name: 'organizations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'slug', type: 'text' },
          {
            name: 'owner',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
          },
          {
            name: 'plan',
            type: 'select',
            values: ['free', 'pro', 'enterprise'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_org_owner ON organizations (owner)',
          'CREATE UNIQUE INDEX idx_org_slug ON organizations (slug)',
        ],
      })
      app.save(orgCol)
    }
    var orgColId = orgCol.id

    // ============================================================
    // 2. Criar collection org_memberships
    // ============================================================
    var membershipsCol
    try {
      membershipsCol = app.findCollectionByNameOrId('org_memberships')
    } catch (e) {
      membershipsCol = new Collection({
        name: 'org_memberships',
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
            collectionId: usersId,
            maxSelect: 1,
          },
          {
            name: 'organization',
            type: 'relation',
            required: true,
            collectionId: orgColId,
            maxSelect: 1,
          },
          {
            name: 'role',
            type: 'select',
            required: true,
            values: ['admin', 'member'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['online', 'away', 'busy', 'offline'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_memberships_user ON org_memberships (user)',
          'CREATE INDEX idx_memberships_org ON org_memberships (organization)',
          'CREATE UNIQUE INDEX idx_memberships_user_org ON org_memberships (user, organization)',
        ],
      })
      app.save(membershipsCol)
    }

    // ============================================================
    // 3. Adicionar campo organization em users
    // ============================================================
    var usersCol = app.findCollectionByNameOrId(usersId)
    if (!usersCol.fields.getByName('organization')) {
      usersCol.fields.add(
        new RelationField({
          name: 'organization',
          collectionId: orgColId,
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    // ============================================================
    // 4. Adicionar campo organization em todas as collections de dados
    // ============================================================
    var dataCollections = [
      'teams',
      'tasks',
      'objectives',
      'key_results',
      'comments',
      'activities',
      'ai_alerts',
      'ai_recommendations',
      'performance_snapshots',
      'feedback',
    ]

    for (var i = 0; i < dataCollections.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(dataCollections[i])
        if (!col.fields.getByName('organization')) {
          col.fields.add(
            new RelationField({
              name: 'organization',
              collectionId: orgColId,
              maxSelect: 1,
            }),
          )
        }
        app.save(col)
      } catch (err) {
        // Collection pode nao existir
      }
    }

    // ============================================================
    // 5. Backfill — criar org padrao a partir dos dados existentes
    // ============================================================

    // 5a. Encontrar o team existente
    var existingTeam = null
    try {
      existingTeam = app.findFirstRecordByData('teams', 'name', 'Equipe Alpha')
    } catch (e) {
      try {
        var teams = app.findRecordsByFilter('teams', '1=1', '', 1, 0)
        if (teams.length > 0) existingTeam = teams[0]
      } catch (e2) {}
    }

    if (!existingTeam) {
      // Sem team — criar org com o primeiro admin
      var adminUser = null
      try {
        var admins = app.findRecordsByFilter('users', "role='admin'", '', 1, 0)
        if (admins.length > 0) adminUser = admins[0]
      } catch (e) {}
      if (!adminUser) {
        try {
          var allUsers = app.findRecordsByFilter('users', '1=1', '', 1, 0)
          if (allUsers.length > 0) adminUser = allUsers[0]
        } catch (e) {}
      }

      if (adminUser) {
        var org = new Record(orgCol)
        org.set('name', 'Minha Organizacao')
        org.set('slug', 'minha-organizacao')
        org.set('owner', adminUser.id)
        org.set('plan', 'free')
        app.save(org)

        adminUser.set('organization', org.id)
        app.save(adminUser)

        var membership = new Record(membershipsCol)
        membership.set('user', adminUser.id)
        membership.set('organization', org.id)
        membership.set('role', 'admin')
        membership.set('status', 'online')
        app.save(membership)
      }
      return
    }

    // 5b. Criar organization a partir do team existente
    var teamOwner = existingTeam.getString('owner')
    var orgSlug = (existingTeam.getString('name') || 'organizacao')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    var org = new Record(orgCol)
    org.set('name', existingTeam.getString('name') || 'Minha Organizacao')
    org.set('slug', orgSlug || 'organizacao')
    org.set('owner', teamOwner)
    org.set('plan', 'free')
    app.save(org)
    var orgId = org.id

    // 5c. Vincular o team existente a org
    existingTeam.set('organization', orgId)
    app.save(existingTeam)

    // 5d. Para cada membro do team, criar org_membership + setar organization no user
    var teamMembers = []
    try {
      teamMembers = app.findRecordsByFilter('members', "team='" + existingTeam.id + "'", '', 100, 0)
    } catch (e) {}

    for (var j = 0; j < teamMembers.length; j++) {
      var m = teamMembers[j]
      var userId = m.getString('user')
      var memberRole = m.getString('role') || 'member'

      // Setar organization no user
      try {
        var u = app.findRecordById('users', userId)
        if (!u.getString('organization')) {
          u.set('organization', orgId)
          app.save(u)
        }
      } catch (e) {}

      // Criar org_membership
      try {
        app.findFirstRecordByFilter(
          'org_memberships',
          'user = {:userId} && organization = {:orgId}',
          { userId: userId, orgId: orgId },
        )
      } catch (e) {
        var membership = new Record(membershipsCol)
        membership.set('user', userId)
        membership.set('organization', orgId)
        membership.set('role', memberRole)
        membership.set('status', m.getString('status') || 'offline')
        app.save(membership)
      }
    }

    // 5e. Backfill: setar organization em todos os registros de dados existentes
    var backfillCols = ['tasks', 'objectives', 'ai_alerts', 'performance_snapshots']
    for (var k = 0; k < backfillCols.length; k++) {
      try {
        var records = app.findRecordsByFilter(backfillCols[k], '1=1', '', 1000, 0)
        for (var l = 0; l < records.length; l++) {
          if (!records[l].getString('organization')) {
            records[l].set('organization', orgId)
            app.save(records[l])
          }
        }
      } catch (e) {}
    }

    // key_results: herdam do objective
    try {
      var krs = app.findRecordsByFilter('key_results', '1=1', '', 1000, 0)
      for (var m1 = 0; m1 < krs.length; m1++) {
        if (!krs[m1].getString('organization')) {
          try {
            var obj = app.findRecordById('objectives', krs[m1].getString('objective'))
            krs[m1].set('organization', obj.getString('organization') || orgId)
          } catch (e) {
            krs[m1].set('organization', orgId)
          }
          app.save(krs[m1])
        }
      }
    } catch (e) {}

    // comments: herdam do task
    try {
      var comments = app.findRecordsByFilter('comments', '1=1', '', 1000, 0)
      for (var m2 = 0; m2 < comments.length; m2++) {
        if (!comments[m2].getString('organization')) {
          try {
            var task = app.findRecordById('tasks', comments[m2].getString('task'))
            comments[m2].set('organization', task.getString('organization') || orgId)
          } catch (e) {
            comments[m2].set('organization', orgId)
          }
          app.save(comments[m2])
        }
      }
    } catch (e) {}

    // activities: herdam do task ou direto
    try {
      var activities = app.findRecordsByFilter('activities', '1=1', '', 1000, 0)
      for (var m3 = 0; m3 < activities.length; m3++) {
        if (!activities[m3].getString('organization')) {
          try {
            var taskId = activities[m3].getString('task')
            if (taskId) {
              var task2 = app.findRecordById('tasks', taskId)
              activities[m3].set('organization', task2.getString('organization') || orgId)
            } else {
              activities[m3].set('organization', orgId)
            }
          } catch (e) {
            activities[m3].set('organization', orgId)
          }
          app.save(activities[m3])
        }
      }
    } catch (e) {}

    // ai_recommendations: herdam do alert
    try {
      var recs = app.findRecordsByFilter('ai_recommendations', '1=1', '', 1000, 0)
      for (var m4 = 0; m4 < recs.length; m4++) {
        if (!recs[m4].getString('organization')) {
          try {
            var alert = app.findRecordById('ai_alerts', recs[m4].getString('alert'))
            recs[m4].set('organization', alert.getString('organization') || orgId)
          } catch (e) {
            recs[m4].set('organization', orgId)
          }
          app.save(recs[m4])
        }
      }
    } catch (e) {}

    // feedback: setar orgId direto
    try {
      var feedbacks = app.findRecordsByFilter('feedback', '1=1', '', 1000, 0)
      for (var m5 = 0; m5 < feedbacks.length; m5++) {
        if (!feedbacks[m5].getString('organization')) {
          feedbacks[m5].set('organization', orgId)
          app.save(feedbacks[m5])
        }
      }
    } catch (e) {}
  },
  (app) => {
    // Down: reverter
    var dataCollections = [
      'teams',
      'tasks',
      'objectives',
      'key_results',
      'comments',
      'activities',
      'ai_alerts',
      'ai_recommendations',
      'performance_snapshots',
      'feedback',
    ]

    for (var i = 0; i < dataCollections.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(dataCollections[i])
        if (col.fields.getByName('organization')) {
          col.fields.removeByName('organization')
        }
        app.save(col)
      } catch (e) {}
    }

    try {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('organization')) {
        usersCol.fields.removeByName('organization')
      }
      app.save(usersCol)
    } catch (e) {}

    try {
      app.delete(app.findCollectionByNameOrId('org_memberships'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('organizations'))
    } catch (e) {}
  },
)
