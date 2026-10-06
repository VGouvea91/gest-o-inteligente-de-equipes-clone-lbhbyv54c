// Rota sob demanda: POST /backend/v1/analyze-team
routerAdd(
  'POST',
  '/backend/v1/analyze-team',
  (e) => {
    try {
      // Verificar se quem chama e admin
      const authRecord = e.auth
      if (!authRecord) return e.unauthorizedError('Autenticacao requerida')
      const callerRole = authRecord.getString('role')
      if (callerRole !== 'admin') {
        return e.forbiddenError('Apenas administradores podem acionar a analise')
      }

      const body = e.requestInfo().body || {}
      const teamId = body.teamId
      if (!teamId) return e.badRequestError('teamId is required')

      // --- 1. Coletar contexto ---
      const members = $app.findRecordsByFilter('members', `team='${teamId}'`, '', 50, 0)
      const tasks = $app.findRecordsByFilter('tasks', `team='${teamId}'`, '-created', 200, 0)
      const objectives = $app.findRecordsByFilter('objectives', `team='${teamId}'`, '', 50, 0)

      const keyResults = []
      for (const obj of objectives) {
        try {
          const krs = $app.findRecordsByFilter('key_results', `objective='${obj.id}'`, '', 50, 0)
          for (const kr of krs) keyResults.push(kr)
        } catch (_) {}
      }

      // --- 2. Montar contexto para a IA ---
      const context = {
        equipe: {
          total_membros: members.length,
          membros: members.map(function (m) {
            let name = 'Membro'
            try {
              $app.expandRecord(m, ['user'])
              const u = m.expanded().user
              name = u.getString('name') || u.getString('email')
            } catch (_) {}
            return { id: m.getString('user'), nome: name, status: m.getString('status') }
          }),
        },
        tarefas: {
          total: tasks.length,
          por_status: {
            todo: tasks.filter(function (t) {
              return t.getString('status') === 'todo'
            }).length,
            doing: tasks.filter(function (t) {
              return t.getString('status') === 'doing'
            }).length,
            done: tasks.filter(function (t) {
              return t.getString('status') === 'done'
            }).length,
          },
          atrasadas: tasks.filter(function (t) {
            const due = t.getString('due_date')
            return due && t.getString('status') !== 'done' && new Date(due) < new Date()
          }).length,
          detalhes: tasks.slice(0, 50).map(function (t) {
            return {
              titulo: t.getString('title'),
              status: t.getString('status'),
              prioridade: t.getString('priority'),
              prazo: t.getString('due_date') || null,
              assignee: t.getString('assignee'),
            }
          }),
        },
        objetivos: objectives.map(function (obj) {
          return {
            titulo: obj.getString('title'),
            status: obj.getString('status'),
            progresso: obj.getFloat('progress') || 0,
          }
        }),
        key_results: keyResults.map(function (kr) {
          const target = kr.getFloat('target') || 0
          const current = kr.getFloat('current') || 0
          return {
            descricao: kr.getString('description'),
            meta: target,
            atual: current,
            progresso: target > 0 ? Math.round((current / target) * 100) : 0,
            status: kr.getString('status'),
          }
        }),
      }

      // --- 3. Chamar a IA ---
      const systemPrompt =
        'Voce e o Gestor-IA, um analista de performance de equipes. Analise os dados e identifique problemas. Retorne APENAS JSON valido no formato: {"alertas":[{"type":"bottleneck|delay|okr_deviation|velocity_drop|focus_loss|overload","severity":"info|warning|critical","message":"descricao","recommendation":{"suggestion":"recomendacao","priority":"low|medium|high","action_type":"reassign|adjust_deadline|focus_kr|review|other"}}],"resumo":"resumo"} Se nao houver problemas retorne {"alertas":[],"resumo":"..."}.'

      const reply = $ai.chat({
        model: 'reasoning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(context) },
        ],
      })

      const rawContent = reply.choices[0].message.content.trim()

      // --- 4. Parsear JSON ---
      let analysis
      try {
        const cleanJson = rawContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
        analysis = JSON.parse(cleanJson)
      } catch (parseErr) {
        return e.json(200, {
          success: false,
          error: 'Falha ao processar IA',
          raw: rawContent.substring(0, 200),
        })
      }

      // --- 5. Persistir ---
      const alertCol = $app.findCollectionByNameOrId('ai_alerts')
      const recCol = $app.findCollectionByNameOrId('ai_recommendations')
      const createdAlerts = []
      const alertas = analysis.alertas || []

      // Valores validos conforme schema das collections
      const VALID_TYPES = [
        'bottleneck',
        'delay',
        'okr_deviation',
        'velocity_drop',
        'focus_loss',
        'overload',
      ]
      const VALID_SEVERITIES = ['info', 'warning', 'critical']
      const VALID_PRIORITIES = ['low', 'medium', 'high']
      const VALID_ACTIONS = ['reassign', 'adjust_deadline', 'focus_kr', 'review', 'other']

      // Mapeia valores comuns que a IA pode retornar erroneamente
      const TYPE_MAP = {
        at_risk: 'okr_deviation',
        off_track: 'okr_deviation',
        on_track: 'okr_deviation',
        risk: 'okr_deviation',
        deviation: 'okr_deviation',
        overload: 'overload',
        bottleneck: 'bottleneck',
        delay: 'delay',
        velocity_drop: 'velocity_drop',
        focus_loss: 'focus_loss',
        blocked: 'bottleneck',
        stuck: 'bottleneck',
      }

      for (const a of alertas) {
        // Sanitizar type
        let alertType = (a.type || '').toString().trim()
        if (!VALID_TYPES.includes(alertType)) {
          alertType = TYPE_MAP[alertType] || 'bottleneck'
        }

        // Sanitizar severity
        let severity = (a.severity || 'info').toString().trim()
        if (!VALID_SEVERITIES.includes(severity)) severity = 'info'

        let alreadyExists = true
        try {
          $app.findFirstRecordByFilter(
            'ai_alerts',
            `team='${teamId}' && resolved=false && type='${alertType}'`,
          )
        } catch (_) {
          alreadyExists = false
        }

        if (alreadyExists) continue

        const alert = new Record(alertCol)
        alert.set('type', alertType)
        alert.set('severity', severity)
        alert.set('message', a.message || '')
        alert.set('team', teamId)
        alert.set('resolved', false)
        alert.set('context', '{\"source\":\"on_demand\"}')
        $app.save(alert)
        createdAlerts.push(alert.id)

        if (a.recommendation) {
          let priority = (a.recommendation.priority || 'medium').toString().trim()
          if (!VALID_PRIORITIES.includes(priority)) priority = 'medium'

          let actionType = (a.recommendation.action_type || 'other').toString().trim()
          if (!VALID_ACTIONS.includes(actionType)) actionType = 'other'

          const rec = new Record(recCol)
          rec.set('alert', alert.id)
          rec.set('suggestion', a.recommendation.suggestion || '')
          rec.set('priority', priority)
          rec.set('action_type', actionType)
          rec.set('acted_on', false)
          $app.save(rec)
        }
      }

      return e.json(200, {
        success: true,
        resumo: analysis.resumo || 'Analise concluida',
        alertas_gerados: createdAlerts.length,
        alertas_deduplicados: alertas.length - createdAlerts.length,
      })
    } catch (err) {
      return e.json(500, { error: 'Erro: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
