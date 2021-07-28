const mongoose = require('mongoose');

const partnerSchema = mongoose.Schema({
    privateKey: String,
    publicKey: String,
    email: String,
    password: String,
    requests: [{
        email: String,
        firstname: Object,
        surname: Object,
        gender: Object,
        birthday: Object,
        occupation: Object,
        marital: Object,
        address: Object,
        phone: Object,
        hkidfirstname: Object,
        hkidsurname: Object,
        hkidbirthday: Object,
        hkidgender: Object,
        signature: String,
        accessGranted: Boolean,
    }]
});

const Partner = mongoose.model('partner', partnerSchema);
module.exports = Partner;
