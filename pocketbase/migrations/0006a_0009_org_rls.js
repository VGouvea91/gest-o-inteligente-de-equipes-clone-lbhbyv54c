// Migration 0009: RLS — Isolamento por organization
// Todas as collections de dados passam a filtrar por organization = @request.auth.organization
// org_memberships: usuario ve apenas suas memberships
// organizations: usuario ve apenas orgs onde tem membership
migrate(
  (app) => {
    var ORG_RULE = "organization = @request.auth.organization && @request.auth.id != ''"
    var ORG_ADMIN =
      "organization = @request.auth.organization && @request.auth.id != '' && @request.auth.role = 'admin'"

    function setRules(colName, list, view, create, update, del) {
      try {
        var col = app.findCollectionByNameOrId(colName)
        col.listRule = list
        col.viewRule = view
        col.createRule = create
        col.updateRule = update
        col.deleteRule = del
        app.save(col)
      } catch (err) {
        // Collection pode nao existir
      }
    }

    // ============================================================
    // Collections de dados — isolamento por organization
    // ============================================================
    var adminOnly = "@request.auth.id != '' && @request.auth.role = 'admin'"

    setRules('teams', ORG_RULE, ORG_RULE, adminOnly, adminOnly, adminOnly)
    setRules('tasks', ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_RULE, ORG_ADMIN)
    setRules('objectives', ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_ADMIN, ORG_ADMIN)
    setRules('key_results', ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_ADMIN, ORG_ADMIN)
    setRules(
      'comments',
      ORG_RULE,
      ORG_RULE,
      ORG_RULE,
      ORG_RULE + ' && author = @request.auth.id',
      ORG_RULE + ' && author = @request.auth.id',
    )
    setRules('activities', ORG_RULE, ORG_RULE, ORG_RULE, ORG_RULE, ORG_ADMIN)
    setRules('ai_alerts', ORG_RULE, ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_ADMIN)
    setRules('ai_recommendations', ORG_RULE, ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_ADMIN)
    setRules('performance_snapshots', ORG_RULE, ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_ADMIN)
    setRules('feedback', ORG_RULE, ORG_RULE, ORG_RULE, ORG_ADMIN, ORG_ADMIN)

    // ============================================================
    // members — filtrar por organization do team
    // ============================================================
    setRules(
      'members',
      "team.organization = @request.auth.organization && @request.auth.id != ''",
      "team.organization = @request.auth.organization && @request.auth.id != ''",
      "team.organization = @request.auth.organization && @request.auth.id != '' && @request.auth.role = 'admin'",
      "team.organization = @request.auth.organization && @request.auth.id != '' && (@request.auth.role = 'admin' || user = @request.auth.id)",
      "team.organization = @request.auth.organization && @request.auth.id != '' && @request.auth.role = 'admin'",
    )

    // ============================================================
    // org_memberships — usuario ve apenas suas memberships
    // ============================================================
    setRules(
      'org_memberships',
      "user = @request.auth.id && @request.auth.id != ''",
      "user = @request.auth.id && @request.auth.id != ''",
      "@request.auth.id != ''",
      "@request.auth.id != '' && (@request.auth.role = 'admin' || user = @request.auth.id)",
      "@request.auth.id != '' && @request.auth.role = 'admin'",
    )

    // ============================================================
    // organizations — usuario ve apenas orgs onde e owner ou org ativa
    // ============================================================
    setRules(
      'organizations',
      'owner = @request.auth.id || id = @request.auth.organization',
      'owner = @request.auth.id || id = @request.auth.organization',
      "@request.auth.id != ''",
      'owner = @request.auth.id',
      'owner = @request.auth.id',
    )

    // ============================================================
    // users — admin pode listar/editar usuarios da mesma org, member so ve a si
    // ============================================================
    setRules(
      'users',
      "id = @request.auth.id || (organization = @request.auth.organization && @request.auth.role = 'admin')",
      "id = @request.auth.id || (organization = @request.auth.organization && @request.auth.role = 'admin')",
      '',
      "@request.auth.id != '' && (id = @request.auth.id || (organization = @request.auth.organization && @request.auth.role = 'admin'))",
      "@request.auth.id != '' && @request.auth.role = 'admin' && organization = @request.auth.organization",
    )
  },
  (app) => {
    // Down: reverter para regras anteriores
    var noAuth = "@request.auth.id != ''"
    var adminOnly = "@request.auth.id != '' && @request.auth.role = 'admin'"

    function setRules(colName, list, view, create, update, del) {
      try {
        var col = app.findCollectionByNameOrId(colName)
        col.listRule = list
        col.viewRule = view
        col.createRule = create
        col.updateRule = update
        col.deleteRule = del
        app.save(col)
      } catch (err) {}
    }

    setRules('teams', noAuth, noAuth, adminOnly, adminOnly, adminOnly)
    setRules('tasks', noAuth, noAuth, adminOnly, noAuth, adminOnly)
    setRules('objectives', noAuth, noAuth, adminOnly, adminOnly, adminOnly)
    setRules('key_results', noAuth, noAuth, adminOnly, adminOnly, adminOnly)
    setRules(
      'comments',
      noAuth,
      noAuth,
      noAuth,
      noAuth + ' && author = @request.auth.id',
      noAuth + ' && author = @request.auth.id',
    )
    setRules('activities', noAuth, noAuth, noAuth, noAuth, noAuth)
    setRules('ai_alerts', noAuth, noAuth, noAuth, adminOnly, adminOnly)
    setRules('ai_recommendations', noAuth, noAuth, noAuth, noAuth, noAuth)
    setRules('performance_snapshots', noAuth, noAuth, noAuth, noAuth, noAuth)
    setRules('feedback', noAuth, noAuth, noAuth, adminOnly, adminOnly)

    setRules(
      'members',
      noAuth,
      noAuth,
      adminOnly,
      noAuth + " && (@request.auth.role = 'admin' || user = @request.auth.id)",
      adminOnly,
    )

    setRules(
      'users',
      noAuth,
      noAuth,
      '',
      noAuth + " && (id = @request.auth.id || @request.auth.role = 'admin')",
      adminOnly,
    )
  },
)
