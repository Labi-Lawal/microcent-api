const mongoose = require('mongoose');

const KeyPairSchema = mongoose.Schema({
    privateKey: String,
    publicKey: String
});

const KeyPair = mongoose.model('keypair', KeyPairSchema);
module.exports = KeyPair;