const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/pis',
    createProxyMiddleware({
      target: 'https://localhost:5001',
      changeOrigin: true,
    })
  );
}; a