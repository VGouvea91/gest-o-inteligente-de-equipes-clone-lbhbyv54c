// Rota: POST /backend/v1/add-member
// Admin adiciona um funcionario diretamente (sem email de convite).
// Cria usuario sem senha (needs_password_setup=true) e adiciona como membro.
routerAdd(
  'POST',
  '/backend/v1/add-member',
  (e) => {
    try {
      // Verificar se quem chama e admin
      const authRecord = e.auth
      if (!authRecord) return e.unauthorizedError('Autenticacao requerida')
      const callerRole = authRecord.getString('role')
      if (callerRole !== 'admin') {
        return e.forbiddenError('Apenas administradores podem adicionar funcionarios')
      }

      const body = e.requestInfo().body || {}
      const email = (body.email || '').toString().trim()
      const name = (body.name || '').toString().trim()
      const teamId = (body.teamId || '').toString().trim()
      const role = (body.role || 'member').toString().trim()

      if (!email) return e.badRequestError('email e obrigatorio')
      if (!name) return e.badRequestError('name e obrigatorio')
      if (!teamId) return e.badRequestError('teamId e obrigatorio')

      // Validar role
      const validRoles = ['admin', 'member']
      const memberRole = validRoles.includes(role) ? role : 'member'

      // 1. Verificar se usuario ja existe
      let user
      let userExisted = false
      try {
        user = $app.findAuthRecordByEmail('users', email)
        userExisted = true
      } catch (_) {
        // Usuario nao existe — criar sem senha (senha temporaria aleatoria que nao sera usada)
        const tempPassword =
          Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!'

        const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
        user = new Record(usersCol)
        user.set('email', email)
        user.set('password', tempPassword)
        user.set('passwordConfirm', tempPassword)
        user.set('name', name)
        user.set('emailVisibility', true)
        user.set('role', memberRole)
        user.set('needs_password_setup', true)
        user.setVerified(false)
        $app.save(user)
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
        member.set('role', memberRole)
        member.set('status', 'offline')
        $app.save(member)
      }

      // 3. Se usuario ja existia, atualizar role se necessario
      if (userExisted && !alreadyMember) {
        user.set('role', memberRole)
        $app.save(user)
      }

      $app
        .logger()
        .info(
          'add-member',
          'email',
          email,
          'name',
          name,
          'teamId',
          teamId,
          'userId',
          user.id,
          'alreadyMember',
          alreadyMember,
        )

      return e.json(200, {
        success: true,
        userId: user.id,
        alreadyMember,
        needsPasswordSetup: user.getBool('needs_password_setup'),
      })
    } catch (err) {
      $app.logger().error('add-member failed', 'error', err.message)
      return e.json(500, { error: 'Erro ao adicionar funcionario: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
