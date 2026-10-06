// Rota: POST /backend/v1/invite-member
// Cria um usuario (se nao existir) com senha temporaria e adiciona como membro da equipe.
// O email de "definir senha" e disparado pelo frontend via requestPasswordReset.
routerAdd(
  'POST',
  '/backend/v1/invite-member',
  (e) => {
    try {
      // Verificar se quem chama e admin
      const authRecord = e.auth
      if (!authRecord) return e.unauthorizedError('Autenticacao requerida')
      const callerRole = authRecord.getString('role')
      if (callerRole !== 'admin') {
        return e.forbiddenError('Apenas administradores podem convidar membros')
      }

      const body = e.requestInfo().body || {}
      const email = (body.email || '').toString().trim()
      const teamId = (body.teamId || '').toString().trim()
      const name = (body.name || '').toString().trim()

      if (!email) return e.badRequestError('email e obrigatorio')
      if (!teamId) return e.badRequestError('teamId e obrigatorio')

      // 1. Buscar ou criar o usuario
      let user
      let created = false

      try {
        user = $app.findAuthRecordByEmail('users', email)
      } catch (_) {
        // Usuario nao existe — criar com senha temporaria aleatoria
        const tempPassword =
          Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!'

        const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
        user = new Record(usersCol)
        user.set('email', email)
        user.set('password', tempPassword)
        user.set('passwordConfirm', tempPassword)
        if (name) user.set('name', name)
        user.set('emailVisibility', true)
        $app.save(user)
        created = true
      }

      // 2. Verificar se ja e membro do time
      let alreadyMember = false
      try {
        $app.findFirstRecordByFilter('members', 'user = {:userId} && team = {:teamId}', {
          userId: user.id,
          teamId,
        })
        alreadyMember = true
      } catch (_) {}

      if (!alreadyMember) {
        const membersCol = $app.findCollectionByNameOrId('members')
        const member = new Record(membersCol)
        member.set('user', user.id)
        member.set('team', teamId)
        member.set('role', 'member')
        member.set('status', 'offline')
        $app.save(member)
      }

      // 3. Logar para auditoria
      $app
        .logger()
        .info(
          'invite-member',
          'email',
          email,
          'teamId',
          teamId,
          'userId',
          user.id,
          'created',
          created,
          'alreadyMember',
          alreadyMember,
        )

      return e.json(200, {
        success: true,
        userId: user.id,
        created,
        alreadyMember,
      })
    } catch (err) {
      $app.logger().error('invite-member failed', 'error', err.message)
      return e.json(500, { error: 'Erro ao convidar membro: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
