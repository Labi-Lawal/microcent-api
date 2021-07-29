const mongoose = require('mongoose');

const ForgotPasswordSchema = mongoose.Schema({
    email: String,
    code: String
});

const ForgotPassword = mongoose.model('resetpassword', ForgotPasswordSchema);
module.exports = ForgotPassword;