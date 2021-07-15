const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    // PERSONAL INFO
    i_fname: {type: Object},  
    i_sname: {type: Object}, 
    i_bday: {type: Object},
    i_gender: {type: Object},
    i_maritals: {type: Object},
    i_occupation: {type: Object}, 

    // HKID
    hkid_fname: {type: Object}, 
    hkid_sname: {type: Object}, 
    hkid_bday: {type: Object}, 
    hkid_gender: {type: Object}, 
    hkid_photo: {type: Object}, 
    doc_hkid: {type: Object}, 

    // Face ID 
    i_photo: {type: Object}, 

    // Address
    i_address: {type: Object}, 
    doc_address: {type: Object}, 

    // EMAIL / PHONE
    i_email: {type: Object}, 
    i_phone: {type: Object}, 
    i_pass:  {type: Object}, 
    
    // Additional Proof
    doc_additional: {type: Object}, 

    dateCreated: {type: Date, default: Date.now}, 
});

const User = mongoose.model('users', UserSchema);
module.exports = User;