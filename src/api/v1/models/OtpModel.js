const mongoose = require('mongoose');

const OtpSchema = mongoose.Schema({
    code: Number,
    email: String
});

const Otp = mongoose.model('otp', OtpSchema);
module.exports = Otp;