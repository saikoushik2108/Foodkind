/** CSRF check: require X-Requested-With header on mutation requests. */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const header = req.headers['x-requested-with'];
  if (!header || header !== 'XMLHttpRequest') {
    return res.status(403).json({ success: false, error: { message: 'CSRF check failed — X-Requested-With header required' } });
  }
  next();
}
