function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validateRequiredFields(requiredFields) {
  return (req, res, next) => {
    const missingFields = requiredFields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || String(value).trim() === "";
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos obligatorios faltantes: ${missingFields.join(", ")}`
      });
    }

    return next();
  };
}

function validateEmailField(fieldName) {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value === undefined || value === null || value === "") {
      return next();
    }

    if (!isValidEmail(value)) {
      return res.status(400).json({
        success: false,
        message: "El correo no tiene un formato válido."
      });
    }

    return next();
  };
}

module.exports = {
  isValidEmail,
  validateRequiredFields,
  validateEmailField
};
