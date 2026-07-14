process.env.NODE_ENV ||= 'production';
process.env.JWT_SECRET ||= 'change_this_super_secret';
process.env.JWT_EXPIRES_IN ||= '7d';
process.env.HMAC_SECRET ||= 'change_this_hmac_secret';
process.env.DEFAULT_ADMIN_NAME ||= 'SUVIDHA Admin';
process.env.DEFAULT_ADMIN_MOBILE ||= '9999999999';
process.env.DEFAULT_ADMIN_EMAIL ||= 'admin@suvidha.local';
process.env.DEFAULT_ADMIN_PASSWORD ||= 'Admin@123';

let appPromise;

module.exports = async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  const routedPath = parsed.searchParams.get('path') || '';
  const remainingParams = new URLSearchParams(parsed.searchParams);
  remainingParams.delete('path');
  const query = remainingParams.toString();

  req.url = `/api/${routedPath}${query ? `?${query}` : ''}`;

  appPromise ||= import('../server/app.js').then((module) => module.default);
  const app = await appPromise;
  return app(req, res);
};
