const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    // PERSONAL INFO
    i_fname: {type: String},  
    i_sname: {type: String}, 
    i_bday: {type: String},
    i_gender: {type: String},
    i_maritals: {type: String},
    i_occupation: {type: String}, 

    // HKID
    hkid_fname: {type: String}, 
    hkid_sname: {type: String}, 
    hkid_bday: {type: String}, 
    hkid_gender: {type: String}, 
    hkid_photo: {type: String}, 
    doc_hkid: {type: String}, 

    // Face ID 
    i_photo: {type: String}, 

    // Address
    i_address: {type: String}, 
    doc_address: {type: String}, 

    // EMAIL / PHONE
    i_email: {type: String}, 
    i_phone: {type: String}, 
    i_pass:  {type: String}, 
    
    // Additional Proof
    doc_additional: {type: String}, 

    dateCreated: {type: Date, default: Date.now}, 
});

const User = mongoose.model('users', UserSchema);
module.exports = User;