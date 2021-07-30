const { UserModel, OtpModel, KeyPairModel, PartnerModel, ForgotPasswordModel } = require('../models');
const bcrypt = require('bcrypt');
const { cloudinary } = require('../services');
const { picture } = require('../services/cloudService');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const path = require('path');
const sharp = require('sharp');
const { options } = require('../routes/userRoutes');
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const vision = require('@google-cloud/vision');
const axios = require("axios");
const FormData = require("form-data");
var crypto = require("crypto");
var eccrypto = require("eccrypto");
var facePP = require('faceppsdk');
const { format } = require('path');
const User = require('../models/UserModel');
const Partner = require('../models/PartnerModel');


var privateKey, publicKey;

const userEncryption = async (req, res)=>{
    // var result = await generateKeyPair();

    var privateKeyA = eccrypto.generatePrivate();
    var publicKeyA = eccrypto.getPublic(privateKeyA);

    // Encrypting the message for.
    eccrypto.encrypt(publicKeyA, Buffer.from("Hello")).then(async encrypted=>{
        encrypted = JSON.stringify(encrypted);
        console.log(encrypted);
        console.log(typeof(encrypted));

        // decrypting the message.
        eccrypto.decrypt(privateKeyA, encrypted).then(decrypted=> {
            console.log(decrypted);
        });
    });
    // var result = await encryptData("hello", res);
    // res.status(200).send({message: "message encrypted", encryptedData: result});
}

function encryptData(data, res){
    return new Promise(async resolve=>{
        var result = await generateKeyPair();

        // encrypt data
        eccrypto.encrypt(publicKey, Buffer.from(data.toString()))
                        .then(encryptedString =>{
                            resolve(encryptedString);
                        });
    });
}

async function decryptData(data, res){
    return new Promise(async resolve=>{
        var result = await generateKeyPair();

        const newdata = {
            iv: data.iv.buffer, 
            ephemPublicKey: data.ephemPublicKey.buffer, 
            ciphertext: data.ciphertext.buffer, 
            mac: data.mac.buffer
        };

        // encrypt data
        eccrypto.decrypt(privateKey, newdata)
        .then(decryptedString =>{
            console.log(decryptedString.toString());
            resolve(decryptedString.toString());
        })
        .catch(error=>{
            console.log(error);
            res.status(500).send({message: "There was an error while decrypting user data"});
        });
    });
}

async function generateKeyPair(res){
    return new Promise(resolve=> {
        KeyPairModel.find((err, foundKeyPair)=>{
            if(err) res.status(404).send({message: "Error finding key pair: " + err});
            else {
                if(foundKeyPair.length == 0) {
                    console.log("GENERATING");

                    // A new random 32-byte private key.
                    newPrivateKey = eccrypto.generatePrivate();
                    // Corresponding uncompressed (65-byte) public key.
                    newPublicKey = eccrypto.getPublic(newPrivateKey);

                    console.log('***************************************');
                    console.log(newPrivateKey);
                    console.log(newPublicKey);
                    console.log('***************************************');

                    // convert keypair to strings and save to database
                    KeyPairModel.create({
                        privateKey: newPrivateKey.toString('hex'),
                        publicKey: newPublicKey.toString('hex')
                    }).then(saved=> {
                        privateKey = Buffer.from(saved.privateKey, 'hex'), publicKey = Buffer.from(saved.publicKey, 'hex');
                        resolve({"status": "success"});
                    });
                }
                else {
                    console.log("FETCHING");

                    console.log(foundKeyPair);

                    // A new random 32-byte private key.
                    privateKey = Buffer.from(foundKeyPair[0].privateKey, 'hex');
                    // Corresponding uncompressed (65-byte) public key.
                    publicKey = Buffer.from(foundKeyPair[0].publicKey, 'hex');

                    resolve({"status": "success"});
                }
            }
        });
    });
}

const userRegister = (req, res)=>{
    console.log(req.body);

    //Validate user request
    var result = validateReq(req.body);
    if(!result.status) return res.status(422).send({message: result.message});

    // Check if user already exists
    UserModel.findOne({i_email: req.body.email.toLowerCase()}).then(async (foundUser)=>{
        console.log(foundUser);
        if(foundUser) return res.status(409).send({message: "User with this email already exist."});
        else {
            //Insert new user if dont exist 
            const { 
                firstname, surname, birthday, gender, maritals, occupation, email, phone, password, address,
                hkidfirstname, hkidsurname, hkidgender, hkidbirthday
            } = req.body;
            
            const urls = [];
            const files = req.files;

            for(var i = 0; i < files.length; i++){
                const newPath = await cloudinaryImageUploadMethod(files[i]);
                urls.push(newPath);
            }
            
            bcrypt.genSalt(10).then(salt=>{
                bcrypt.hash(password, salt, async(err, passwordHash) =>{
                    UserModel.create({
                        i_fname: await encryptData(firstname, res),
                        i_sname: await encryptData(surname, res),
                        i_bday: await encryptData(birthday, res),
                        i_gender: await encryptData(gender, res),
                        i_maritals: await encryptData(maritals, res),
                        i_occupation: await encryptData(occupation, res),

                        hkid_fname: await encryptData(hkidfirstname, res),
                        hkid_sname: await encryptData(hkidsurname, res),
                        hkid_bday: await encryptData(hkidbirthday, res),
                        hkid_gender: await encryptData(hkidgender, res),
                        // hkid_photo: urls[0].res,
                        // doc_hkid: urls[1].res,

                        // i_photo: urls[2].res,
                        
                        i_address: await encryptData(address, res),
                        doc_address: await encryptData(urls[0].res),

                        i_email: email.toLowerCase(),
                        i_phone: await encryptData(phone),
                        i_pass: passwordHash,

                        doc_additional: await encryptData(urls[1].res)
                    }).then((saved)=>{
                        console.log(saved);
                        console.log(`New user has been created.'`);
                        return res.status(200).send({
                            message: "User has been registered successfully.",
                            data: saved
                        });
                    }).catch((error)=>{
                        return res.status(409).send({message: error.message});
                    });
                });
            });
        }
    }).catch((error)=>{
        console.log(error);
        return res.status(500).send({message: "There was a server error, not your fault, we are on it."});
    });
}

const userAuthDec = (req, res)=>{
    console.log(req.body);
    const { email, password } = req.body;

    UserModel.findOne({i_email: email}).then((foundUser)=>{
        if(!foundUser) return res.status(404).send({message: "User doesn't exist."});
        bcrypt.compare(password, foundUser.i_pass, async (error, result)=>{
            if(error) res.status(500).send({message: "There was a server error, please try again."});
            if(!result) return res.status(404).send({message: "Wrong password."});
           
            req.session.user = foundUser;
            req.session.user._id = foundUser._id;
            req.session.user.i_email = foundUser.i_email;
            req.session.user.dateCreated = foundUser.dateCreated;
            req.session.user.i_fname = await decryptData(foundUser.i_fname, res);
            req.session.user.i_sname = await decryptData(foundUser.i_sname, res);
            req.session.user.i_bday = await decryptData(foundUser.i_bday, res);
            req.session.user.i_gender = await decryptData(foundUser.i_gender, res);
            req.session.user.i_maritals = await decryptData(foundUser.i_maritals, res);
            req.session.user.i_occupation = await decryptData(foundUser.i_occupation, res);
            req.session.user.hkid_fname = await decryptData(foundUser.hkid_fname, res);
            req.session.user.hkid_sname = await decryptData(foundUser.hkid_sname, res);
            req.session.user.hkid_bday = await decryptData(foundUser.hkid_bday, res);
            req.session.user.hkid_gender = await decryptData(foundUser.hkid_gender, res);
            req.session.user.i_address = await decryptData(foundUser.i_address, res);
            req.session.user.doc_address = await decryptData(foundUser.doc_address, res);
            req.session.user.i_phone = await decryptData(foundUser.i_phone, res);
            req.session.user.doc_additional = await decryptData(foundUser.doc_additional, res);
            
            console.log(`User ${foundUser.i_email} has signed in.`);
            console.log(req.session.user);
            return res.status(200).send({message: "You have successfully signed in", data: req.session.user});
        });
    }).catch((error)=>{
        console.log(error);
        return res.status(500).send({message: "There was a server error, please try again."});
    });
}

const userAuthEnc = (req, res)=>{
    console.log(req.body);
    const { email, password } = req.body;

    UserModel.findOne({i_email: email}).then((foundUser)=>{
        if(!foundUser) return res.status(404).send({message: "User doesn't exist."});
        bcrypt.compare(password, foundUser.i_pass, async (error, result)=>{
            if(error) res.status(500).send({message: "There was a server error, please try again."});
            if(!result) return res.status(404).send({message: "Wrong password."});
           
            foundUser.i_pass = undefined;
            req.session.user = foundUser;
            console.log(`User ${foundUser.i_email} has signed in.`);

            return res.status(200).send({message: "You have successfully signed in", data: req.session.user});
        });
    }).catch((error)=>{
        console.log(error);
        return res.status(500).send({message: "There was a server error, please try again."});
    });
} 

const userAuthEncrypt = (req, res)=>{

}

const sendOTP = async (req, res)=>{
    // GENERATE OTP
    var result = await generateOTP(6);
    var messageToSend = `Kindly Use this code: ${result} to confirm your new means of authentication for the MICROCENT Mobile App`;

    OtpModel.findOne({email: req.body.email}, (err, foundUser)=>{
        if(err) res.status(500).send({message: "There was a server error, we are on it. Please try again."});
        else {
            if(!foundUser){
                OtpModel.create({
                    code: result, email: req.body.email
                })
                .then((result) => {
                    twilioClient
                        .messages
                        .create({
                            body: messageToSend,
                            from: '+12813773596',
                            to: req.body.phone
                        })
                        .then(message => {
                            console.log({message: 'OTP sent', ssid: message.sid});
                            res.status(200).send({message: 'OTP sent', ssid: message.sid})
                        })
                        .catch(error => {
                            console.log({message: error});
                            res.status(300).send({message: "There was an error sending message, make sure phone number is not empty when you try again"});
                            console.log({message: error.status.toString()}); 
                            res.send({message: error.status.toString()});
                        });
                });
            } else {
                OtpModel.deleteOne({email: req.body.email})
                .then(deleted => {
                    OtpModel.create({
                        code: result, email: req.body.email
                    })
                    .then((result)=> {
                        twilioClient
                            .messages
                            .create({
                                body: messageToSend,
                                from: '+12813773596',
                                to: req.body.phone
                            })
                            .then(message => {
                                console.log({message: 'OTP sent', ssid: message.sid});
                                res.send({message: 'OTP sent', ssid: message.sid})
                            })
                            .catch(error => {
                                console.log({message: error});
                                console.log({message: error.status.toString()});
                                res.send({message: error.status.toString()})
                            });
                    });
                })
            }
        }
    });
}

const verifyOTP = async (req, res)=>{
    console.log(req.body);

    OtpModel.findOne({email: req.body.email}, (err, foundOTP)=>{
        if(err) res.status(422).send({message: result.message});
        else {
            if(!foundOTP) res.status(404).send({message: 'OTP doesnt exist for user'});
            else {
                if(foundOTP.code != req.body.code) res.status(404).send({message: 'OTP doesnt exist for user'});
                else res.status(200).send({message: 'OTP verified'});
            }
        }
    })
}

const checkNumber = async (req, res)=>{
    twilioClient.lookups.v1
                        .phoneNumbers('+85255668180')
                        .fetch({type: ['carrier']})
                        .then(phone_number=> console.log(phone_number.carrier));
}

const compareUserFaceWithHKIDFace = async (req, res)=>{
    console.log(req.files);
    var images = [];

    for(var i = 0; i < req.files.length; i++) {
        var result = await extractFace(req.files[i].path, res);
        images.push(result.res);
    };

    var URL = "https://api-us.faceplusplus.com/facepp/v3/compare";


    let data = new FormData();
    data.append('api_key', '1pahw7P_26ExSA14-nrQh4NZ_c0UGGNt');
    data.append('api_secret', 'SeYAjRPz-RZVCFMU0wJikoZVQHYN8Kn5');
    data.append('image_file1', fs.createReadStream(images[0]));
    data.append('image_file2', fs.createReadStream(images[1]));

    console.log(data);

    axios.post(URL, data, {
        headers: {
            "Content-Type": `multipart/form-data; boundary=${data.getBoundary()}`
        }
    })
    .then(function (response) {
        console.log(response);
        res.status(200).send({percentage: response.data.confidence});
    })
    .catch(function (error) {
        console.log(error);
        res.status(500).send({result: "There was an error: " + error});
    });
}

function extractFace (image_path, res) {
    return new Promise(resolve => {
        console.log(image_path);

        // Extract face from image of hkid card
        var image =  fs.readFileSync(image_path, {encoding: null});
        
        sharp(image)
        .rotate()
        .resize(500, 500)
        .toBuffer()
        .then(newimage => {
        // Performs face detection on the image file
        // const client = new vision.ImageAnnotatorClient({keyFilename:  path.resolve("./") + '/microcent-ml-googleapikey.json'});
        // client 
        //     .faceDetection(newimage)
        //     .then(results =>{
        //         // console.log(results[0].faceAnnotations[0].boundingPoly);
        //         const left = results[0].faceAnnotations[results[0].faceAnnotations.length - 1].boundingPoly.vertices[0].x,
        //         top = results[0].faceAnnotations[results[0].faceAnnotations.length - 1].boundingPoly.vertices[0].y,
        //         width = results[0].faceAnnotations[results[0].faceAnnotations.length - 1].boundingPoly.vertices[2].x - left,
        //         height = results[0].faceAnnotations[results[0].faceAnnotations.length - 1].boundingPoly.vertices[2].y - top;

                // sharp(newimage)
                //     .rotate()
                //     .extract({left: left, top: top, width: width, height: height})
                //     .toBuffer()
                //     // .toFile()
                //     .then(newfile=> {
                        fs.writeFile(image_path, newimage, ()=>{
                            console.log("Image crop success : ");
                            resolve({
                                status: 'success',
                                res: image_path
                            });
                        });
                    })
                    .catch(err=>{
                        console.log("error cropping image" + err);
                        res.status(400).send({
                            message: "There was an error extracting face from image. Try again."
                        });
                    });
            // })
            // .catch(results => {
            //     console.log(results);
            //     console.log("There was an error");
            //     res.status(400).send({
            //         message: "There was an error detecting face from image. Try again."
            //     });
            // });
        // });
    });
}

const extracthkid = async (req, res)=>{

    var image =  fs.readFileSync(req.file.path, {encoding: null});

    const client = new vision.ImageAnnotatorClient({
        keyFilename:  path.resolve("./") + '/microcent-ml-googleapikey.json'
    });

    // Performs Label detection on the image file
    client
        .textDetection(image)
        .then(results =>{
            console.log(results[0].fullTextAnnotation.text);
            console.log(results[0].fullTextAnnotation.length);

            res.status(200).send(results[0].fullTextAnnotation.text)
        })
        .catch(results => res.status(400).send("Please take picture again."));
    
}

async function generateOTP(otpLength){
    var code = [];

    for(var i = 0; i < otpLength; i++){
        code.push(Math.floor(Math.random() * 10));
    }

    return code.join('');
}

function cloudinaryImageUploadMethod(file){
    return new Promise(resolve => {
        const { path } = file;

        var fileExt = file.originalname.split('.');

        if(fileExt[fileExt.length - 1] == 'png' || fileExt[fileExt.length - 1] == 'jpeg' || fileExt[fileExt.length - 1] == 'jpg' ){
            cloudinary.uploader.upload(path, (err, res) => {
                if(err) return res.status(500).send('upload image error');
                resolve({
                    res: res.secure_url
                });
            });
        } else {
            cloudinary.uploader.upload(path, {resource_type: 'raw'}, (err, res) => {
                if(err) return res.status(500).send('upload image error');
                resolve({
                    res: res.secure_url
                });
            });
        }
    });
}

function validateReq (data){
    const emailRegExp = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if(Object.keys(data).length === 0) return { status: false, message: "You cannot leave the fields empty"};
    if(!emailRegExp.test(data.email)) return { status: false, message: "Email isn't correct"};
    if(!data.email) return { status: false, message: "Email cannot be empty"};
    if(!data.firstname) return { status: false, message: "Firstname cannot be empty"};
    if(!data.surname) return { status: false,  message: "Surname cannot be empty"};
    if(!data.birthday) return { status: false, message: "Birthday cannot be empty"};
    if(!data.gender) return { status: false, message: "Gender cannot be empty"};
    if(!data.maritals) return { status: false, message: "Maritals cannot be empty"};
    if(!data.phone) return { status: false, message: "Phone cannot be empty"};
    if(!data.occupation) return { status: false, message: "Occupation cannot be empty"};
    if(!data.password) return { status: false, message: "Password cannot be empty"};
    if(!data.hkidfirstname) return { status: false, message: "hkidfirstname cannot be empty"};
    if(!data.hkidsurname) return { status: false, message: "hkidsurname cannot be empty"};
    if(!data.hkidbirthday) return { status: false, message: "hkidbirthday cannot be empty"};
    if(!data.hkidgender) return { status: false, message: "hkidgender cannot be empty"};
    if(!data.address) return { status: false, message: "address cannot be empty"};
//     if(data.hkidfirstname != data.firstname) return { status: false, message: "firstname and hkidfirstname dont match."};
//     if(data.hkidsurname != data.surname) return { status: false, message: "surname and hkidsurname don't match."};
//     if(data.hkidbirthday != data.birthday) return { status: false, message: "birthday and hkidbirthday don't match."};
//     if(data.hkidgender != data.gender) return { status: false, message: "gender and hkidgender don't match."};
    
    return { status: true, message: "SUCCESS"};
}

async function resizeImage(rawImage, fileLoc){
    sharp(rawImage)
        .resize(500, 200)
        .rotate()
        .toFile(fileLoc); 
}

async function extractText(image) {

    const worker = createWorker({
        langPath: path.resolve("./") + '/lang-data', 
        logger: m => console.log(m),
    });

    return extratedText =  (async () => {
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        const { data: { text } } = await worker.recognize(image);
        await worker.terminate();
        return text;
        
    })();

}

function validatePartner(data){
    const emailRegExp = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if(Object.keys(data).length === 0) return { status: false, message: "You cannot leave the fields empty"};
    if(!emailRegExp.test(data.email)) return { status: false, message: "Email isn't correct"};

    return { status: true, message: "SUCCESS"};
}

const register = async (req, res)=>{
     //Validate user request
     var result = validatePartner(req.body);
     if(!result.status) return res.status(422).send({message: result.message});

    var { keypair } =  await generatePartnerKeyPair();
    const { email, password } = req.body;
 
     // Check if user already exists
    PartnerModel.findOne({email: email.toLowerCase()}).then(async (foundPartner)=>{
        if(foundPartner) return res.status(409).send({message: "Partner with this email already exist."});
        else {
            bcrypt.genSalt(10).then(salt=>{
                bcrypt.hash(password, salt, async(err, passwordHash) =>{
                    console.log(result);
                PartnerModel.create({
                    privateKey: keypair.privatekey,
                    publicKey: keypair.publickey,
                    email: email.toLowerCase(),
                    password: passwordHash,
                }).then((saved)=>{
                        console.log(`New user has been created.'`);
                        saved.password = undefined;

                        return res.status(200).send({
                            message: "User has been registered successfully.",
                            data: saved,
                        });
                    }).catch((error)=>{
                        return res.status(409).send({message: error.message});
                    });
                });
            });
        }
     }).catch((error)=>{
         console.log(error);
         return res.status(500).send({message: "There was a server error, not your fault, we are on it."});
     });
}

function generatePartnerKeyPair(){
    return new Promise(resolve=> {

        // A new random 32-byte private key.
        newPrivateKey = eccrypto.generatePrivate();
        // Corresponding uncompressed (65-byte) public key.
        newPublicKey = eccrypto.getPublic(newPrivateKey);

        console.log('***************************************');
        console.log(newPrivateKey);
        console.log(newPublicKey);
        console.log('***************************************');

        resolve({"status": "success", "keypair": {privatekey: newPrivateKey.toString('hex'), publickey: newPublicKey.toString('hex')}});

    });
}

const requestAccess = async (req, res)=>{
    const {email, password, requestEmail} = req.body;
    var partnerKey;

    PartnerModel.findOne({email: email}, (err, foundPartner)=>{
        if(err) res.status(500).send({message: "There was an error authenticating user, please try again."});
        else {
            if(!foundPartner) res.status(404).send({message: "Partner with this email doesn't exist. Please create an  account."});
            else {
                partnerKey = foundPartner.publicKey;

                bcrypt.compare(password, foundPartner.password, async (error, result)=>{
                    if(error) res.status(404).send({message: "There was an error authenticating partner, try again."});
                    else {
                        if(!result) res.status(404).send({message: "Invalid password, try again."});
                        else {
                            console.log("requestEmail: " + requestEmail);
                            // Find User 
                            UserModel.findOne({i_email: requestEmail}, (err, foundUser)=>{
                                if(err) res.status(500).send({message: "There was an error finding user, please try again."});
                                else {
                                    if(!foundUser) res.status(404).send({message: "User doesn't exist, therefore, request couldn't be made."});
                                    else {
                                        // Create Request If User Exist
                                        PartnerModel.updateOne(
                                            {email: email},
                                            {$push: {requests: {email: requestEmail, accessGranted: false}}},
                                            {new: true},
                                            (err, partnerUpdated)=>{
                                                if(err) res.status(500).send({message: "There was an error requesting access, please try again."});
                                                else {
                                                    if(!partnerUpdated) res.status(404).send({message: "There was an error requesting access, please try again."});
                                                    else {
                                                        // Alert User Of Request
                                                        UserModel.updateOne(
                                                            {i_email: requestEmail},
                                                            {$push: {requests: {publicKey: partnerKey, email: email, accessGranted: false}}},
                                                            (err, userNotified)=>{
                                                                if(err) res.status(500).send({message: "There was an error notifying user about request, please try again."});
                                                                else{
                                                                    if(!userNotified) res.status(400).send({message: "There was an error notifying user about request, please try again."});
                                                                    else {
                                                                        console.log("success");
                                                                        res.status(200).send({message: "Request has been made and alert sent to user."});
                                                                    }
                                                                }
                                                            }
                                                        )
                                                    }
                                                }
                                            }
                                        );
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    })    
}

var pubKey, privKey;

const grantPartnerAccess = async (req, res)=>{
    var { email, partnerEmail, pub, firstname, surname, gender, marital, occupation, birthday, address, phone, hkidfirstname, hkidsurname, hkidgender, hkidbirthday } = req.body;
    // var firstname, surname, gender, marital, occupation, birthday, address, phone, hkidfirstname, hkidsurname, hkidgender, hkidbirthday;

    console.log(pub);
    pubKey = Buffer.from(pub, 'hex');
    console.log(pubKey);

    UserModel.findOne({i_email: email}, (err, foundUser)=>{
        if(err) res.status(500).send({message: "There was an error fetching user data"});
        else {
            if(!foundUser) res.status(404).send({message: "User doesn't exist."});
            else {
                UserModel.updateOne(
                    {i_email: email, 'requests.email' : partnerEmail},
                    {$set: {'requests.$.accessGranted' : true}},
                    {new: true},
                    async (err, updatedUser)=>{
                        if(err) res.status(500).send({message: "There was an error granting access", error: err});
                        else {
                            if(!updatedUser) res.status(404).send({message: "There was an error granting access",  error: err});
                            else {
                                var result;
                                new Promise(async resolve => {
                                    firstname = await encryptPartnerData(firstname, pubKey);
                                    surname = await encryptPartnerData(surname, pubKey);
                                    gender = await encryptPartnerData(gender, pubKey);
                                    marital = await encryptPartnerData(marital, pubKey);
                                    occupation = await encryptPartnerData(occupation, pubKey);
                                    birthday = await encryptPartnerData(birthday, pubKey);
                                    address = await encryptPartnerData(address, pubKey);
                                    phone = await encryptPartnerData(phone, pubKey);
                                    hkidfirstname = await encryptPartnerData(hkidfirstname, pubKey);
                                    hkidsurname = await encryptPartnerData(hkidsurname, pubKey);
                                    hkidgender = await encryptPartnerData(hkidgender, pubKey);
                                    hkidbirthday = await encryptPartnerData(hkidbirthday, pubKey);

                                    result = "success";
                                    resolve(result);
                                }).then(()=>{
                                    if(result == "success") {
                                        console.log("SUCCESS");

                                        PartnerModel.updateOne(
                                            {email: partnerEmail, 'requests.email' : email},
                                            {$set: {
                                                'requests.$.accessGranted' : true,
                                                'requests.$.firstname' : firstname,
                                                'requests.$.surname' : surname,
                                                'requests.$.gender' : gender,
                                                'requests.$.marital' : marital,
                                                'requests.$.occupation' : occupation,
                                                'requests.$.birthday' : birthday,
                                                'requests.$.address' : address,
                                                'requests.$.phone' : phone,
                                                'requests.$.hkidfirstname' : hkidfirstname,
                                                'requests.$.hkidsurname' : hkidsurname,
                                                'requests.$.hkidgender' : hkidgender,
                                                'requests.$.hkidbirthday' : hkidbirthday,
                                                }, 
                                            },
                                            {new: true},
                                            (err, updatedUser)=>{
                                                if(err) {
                                                    console.log(err);
                                                    res.status(500).send({message: "There was an error granting access"});
                                                }
                                                else {
                                                    if(!updatedUser) {
                                                        res.status(404).send({message: "There was an error granting access"});
                                                    }
                                                    else {
                                                        console.log(updatedUser);
                                                        console.log("Updated Successfully, Access Granted");
                                                        res.status(200).send({message: "Access to  " +  email + " data has been granted to " + partnerEmail + ""});
                                                    } 
                                                }
                                            }  
                                        );
                                    } else {
                                        console.log("Failed")
                                    }
                                });
                            } 
                        }
                    }  
                );
            }
        }
    });
}

const accessData = async (req, res)=>{
    var { email, password, requestEmail } = req.body;

    var requestData;

    PartnerModel.findOne(
        {email: email},
        (err, foundPartner)=>{
            if(err) res.status(500).send({message: "There was an error fetching user data"});
          else {
              if(!foundPartner) res.status(404).send({message: "Partner doesn't exist."});
              else{
                bcrypt.compare(password, foundPartner.password, async (error, result)=>{
                    if(error) res.status(500).send({message: "There was a server error, please try again."});
                    if(!result) return res.status(404).send({message: "Wrong password."});
                    if(result) {

                        for(var i = 0; i < foundPartner.requests.length; i++){
                            if(foundPartner.requests[i].email == requestEmail){
                                privKey = Buffer.from(foundPartner.privateKey, 'hex');

                                requestData = foundPartner.requests[i];

                                requestData._id = foundPartner._id;
                                requestData.email = foundPartner.email;
                                requestData.firstname = await decryptPartnerData(requestData.firstname, privKey);
                                requestData.surname = await decryptPartnerData(requestData.surname, privKey);
                                requestData.gender = await decryptPartnerData(requestData.gender, privKey);
                                requestData.birthday = await decryptPartnerData(requestData.birthday, privKey);
                                requestData.occupation = await decryptPartnerData(requestData.occupation, privKey);
                                requestData.marital = await decryptPartnerData(requestData.marital, privKey);
                                requestData.phone = await decryptPartnerData(requestData.phone, privKey);
                                requestData.address = await decryptPartnerData(requestData.address, privKey);
                                requestData.hkidfirstname = await decryptPartnerData(requestData.hkidfirstname, privKey);
                                requestData.hkidsurname = await decryptPartnerData(requestData.hkidsurname, privKey);
                                requestData.hkidbirthday = await decryptPartnerData(requestData.hkidbirthday, privKey);
                                requestData.hkidgender = await decryptPartnerData(requestData.hkidgender, privKey);
                                
                                // i = foundPartner.requests.length;
                                console.log(requestData);
                                return res.status(200).send({message: "Access has been granted to you", data: requestData});
                                       
                            }
                        }
                    }
                });
              }
          }
            
        }
    );
}

async function encryptPartnerData(data, partner_public_key) {
    return new Promise(async resolve=>{
        // encrypt data
        console.log(data + " " + partner_public_key)
        eccrypto.encrypt(partner_public_key, Buffer.from(data.toString()))
            .then(encryptedString =>{
                console.log(encryptedString);
                resolve(encryptedString);
            });
    });
}

function decryptPartnerData(data, partner_private_key) {
    return new Promise(async resolve=>{
        const newdata = {
            iv: data.iv.buffer, 
            ephemPublicKey: data.ephemPublicKey.buffer, 
            ciphertext: data.ciphertext.buffer, 
            mac: data.mac.buffer
        };

        // encrypt data
        eccrypto.decrypt(partner_private_key, newdata)
        .then(decryptedString =>{
            console.log(decryptedString.toString());
            resolve(decryptedString.toString());
        })
        .catch(error=>{
            console.log(error);
            res.status(500).send({message: "There was an error while decrypting partner data"});
        });
    });
}

const fetchPartnerRequests = async (req, res)=>{
    const { email, password } = req.body;

    UserModel.findOne({i_email: email}, (err, foundUser)=>{
        if(err) res.status(500).send({message: "There was an error fetching user data"});
        else {
            if(!foundUser) res.status(404).send({message: "User doesnt exist."});
            else {
                res.status(200).send({message: "success", requests: foundUser.requests});      
            }
        }
    })
}

const requestNewPassword = async (req, res)=>{
    const { email } = req.body;
    var code;

    UserModel.findOne({i_email: email}, async (err, foundUser)=>{
        if(err) res.status(500).send({message: "There was an error fetching user data"});
        else {
            if(!foundUser)  res.status(404).send({message: "User doesnt exist."});
            else {
                code = await generateOTP(9);
                ForgotPasswordModel.findOne({email: email}, (err, foundUserNewPasswordRequest)=>{
                    if(err) res.status(500).send({message: "There was an error fetching user data"});
                    else {
                        if(foundUserNewPasswordRequest) {
                            ForgotPasswordModel.deleteOne({email: email}, (err, deleted)=>{
                                if(deleted){
                                    ForgotPasswordModel.create({
                                        email: email,
                                        code: code
                                    }).then(saved => {
                                        res.status(200).send({message: "request granted", code: saved.code});
                                    });
                                } else {
                                    res.status(500).send({message: "There was an error creating request"});
                                }
                            });
                        }
                        else {
                            ForgotPasswordModel.create({
                                email: email,
                                code: code
                            }).then(saved => {
                                res.status(200).send({message: "request granted", code: saved.code});
                            });
                        }
                    }
                })
            }
        }
    })
}

const setNewPassword = async (req, res)=>{
    const { email, code, newpassword } = req.body;

    ForgotPasswordModel.findOne({email: email}, (err, foundRequest)=>{
        if(err) res.status(500).send({message: "There was an error confirming request"});
        else {
            if(!foundRequest) res.status(404).send({message: "Request doesn't exist"});
            else {
               if(foundRequest.code != code) res.status(404).send({message: "Invalid Code"});
                else {
                    UserModel.findOne({i_email: email}, (err, foundUser)=>{
                        if(err) res.status(500).send({message: "There was an error fetching user data"});
                        else {
                            if(!foundUser) res.status(404).send({message: "User doesnt exist."});
                            else {
                                bcrypt.genSalt(10).then(salt=>{
                                    bcrypt.hash(newpassword, salt, async(err, passwordHash) =>{
                                        UserModel.updateOne(
                                            {i_email: foundUser.i_email},
                                            {$set: {i_pass: passwordHash}},
                                            // {new: true},
                                            (err, updatedUser)=>{
                                                if(err) res.status(500).send({message: "There was an error updating password."});
                                                else {
                                                    if(!updatedUser) res.status(409).send({message: "Couldn't update user password"});
                                                    else {
                                                        ForgotPasswordModel.deleteOne({email: email}, (err, deleted)=>{
                                                            res.status(200).send({message: "User password updated successfully", newPass: passwordHash}); 
                                                        });
                                                    }
                                                }
                                            }
                                        );  
                                    });
                                });
                            }
                        }
                    })
               }
            }
        }
    });
}

module.exports = {setNewPassword, requestNewPassword, accessData, grantPartnerAccess, userRegister, userAuthDec, userAuthEnc , sendOTP, verifyOTP, extracthkid, compareUserFaceWithHKIDFace, userEncryption, userAuthEncrypt, register, requestAccess, fetchPartnerRequests};
