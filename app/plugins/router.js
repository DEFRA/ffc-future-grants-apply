const routes = [].concat(
  require('../routes/accessibility'),
  require('../routes/assets'),
  require('../routes/cookies'),
  require('../routes/guidance-for-farmers'),
  require('../routes/healthy'),
  require('../routes/healthz'),
  require('../routes/index'),
  require('../routes/org-review'),
  require('../routes/privacy-policy'),
  require('../routes/form-download'),
  require('../routes/form-upload'),
  require('../routes/not-eligible'),
  require('../routes/signin-oidc')
)

module.exports = {
  plugin: {
    name: 'router',
    register: (server, _) => {
      server.route(routes)
      // server.route(registerYourInterestRoutes)
    }
  }
}
