const { UserModel } = require('../models');
const bcrypt = require('bcrypt');
const { cloudinary } = require('../services');
const { picture } = require('../services/cloudService');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const path = require('path');
const sharp = require('sharp');
const { options } = require('../routes/userRoutes');

const userRegister = (req, res)=>{
    //Validate user request
    var result = validateReq(req.body);
    if(!result.status) {
        return res.status(422).send({message: result.message});
    }

    // Check if user already exists
    UserModel.findOne({i_email: req.body.email.toLowerCase()}).then(async (foundUser)=>{
        console.log(foundUser);
        if(foundUser) return res.status(409).send({message: "User with this email already exist."});
        else {
            //Insert new user if dont exist 
            const { 
                firstname, surname, birthday, gender, maritals, occupation, email, phone, password
            } = req.body;
            
            const urls = [];
            const files = req.files;

            for(var i = 0; i < files.length; i++){
                const newPath = await cloudinaryImageUploadMethod(files[i]);
                urls.push(newPath);
            }

            console.log(urls);
            
            bcrypt.genSalt(10).then(salt=>{
                bcrypt.hash(password, salt, (err, passwordHash) =>{
                    UserModel.create({
                        i_fname: firstname.toLowerCase(),
                        i_sname: surname.toLowerCase(),
                        i_bday: birthday.toLowerCase(),
                        i_gender: gender.toLowerCase(),
                        i_maritals: maritals.toLowerCase(),
                        i_occupation: occupation.toLowerCase(),

                        hkid_fname: hkidfirstname.toLowerCase(),
                        hkid_sname: hkidfirstname.toLowerCase(),
                        hkid_bday: hkidfirstname.toLowerCase(),
                        hkid_gender: hkidfirstname.toLowerCase(),
                        hkid_photo: urls[0].res,
                        doc_hkid: urls[1].res,

                        i_photo: urls[2].res,
                        
                        i_address: address,
                        doc_address: urls[3].res,

                        i_email: email.toLowerCase(),
                        i_phone: phone.toLowerCase(),
                        i_pass: passwordHash,

                        doc_additional: urls[4].res
                    }).then((saved)=>{
                        cloudinary.uploader.upload(req.file.path).then(result => {
                            console.log(result);

                            console.log(`New user '${saved.i_fname} ${saved.i_sname} has created a new account.'`);
                            return res.status(200).send({message: "User has been registered successfully."});
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

const userAuth = (req, res)=>{
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

const extracthkid = async (req, res)=>{

    var image =  fs.readFileSync(req.session.filepath, {encoding: null});

    await resizeImage(image, req.session.filepath);
    var result = await extractText(req.session.filepath);
    res.send({extractedText: result});

    if(fs.existsSync(req.session.filepath)){
        fs.unlink(req.session.filepath, (err)=>{
            if(err){
                console.log("Cant DELETE file .......");
                console.log(err);

                fs.rmSync(req.session.filepath, {require: true, force: true});
            } else {
                console.log("File DELETED.......")
            }
        });
    } else {
        console.log('Cant do nothing right now');
    }
}

function cloudinaryImageUploadMethod(file){
    return new Promise(resolve => {
        const { path } = file;

        var fileExt = file.originalname.split('.');

        if(fileExt[fileExt.length - 1] == 'png' || fileExt[fileExt.length - 1] == 'jpeg' || fileExt[fileExt.length - 1] == 'jpg' ){
            cloudinary.uploader.upload(path, (err, res) => {
                if(err) return res.status(500).send('upload image error');
                console.log(res);
                resolve({
                    res: res.secure_url
                });
            });
        } else {
            cloudinary.uploader.upload(path, {resource_type: 'raw'}, (err, res) => {
                if(err) return res.status(500).send('upload image error');
                console.log(res);
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
    if(!data.i_address) return { status: false, message: "hkidaddress cannot be empty"};
    if(data.hkidfirstname != data.firstname) return { status: false, message: "firstname and hkidfirstname dont match."};
    if(data.hkidsurname != data.surname) return { status: false, message: "surname and hkidsurname don't match."};
    if(data.hkidbirthday != data.birthday) return { status: false, message: "birthday and hkidbirthday don't match."};
    if(data.hkidgender != data.gender) return { status: false, message: "gender and hkidgender don't match."};
    
    return { status: true, message: "SUCCESS"};
}

async function resizeImage(rawImage, fileLoc){
    sharp(rawImage)
        .resize(500, 320)
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
        return text;
        
        await worker.terminate();
    })();

}
module.exports = { userRegister, userAuth , extracthkid};