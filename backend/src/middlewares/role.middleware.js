function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.rol;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "No tiene permiso para realizar esta acción."
      });
    }

    return next();
  };
}

module.exports = { authorize };
