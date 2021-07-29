const router = require('express').Router();
const userController = require('../controllers/userController');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');


// var hkidPhotoName;
const storage = multer.diskStorage({
}), upload = multer({storage: storage});

var filename;
var diskStorage = multer.diskStorage({
    destination: path.resolve("./") + '/public/uploads',
    filename: function (req, file, cb) {
        filename = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        req.session.filepath =  path.resolve("./") + '/public/uploads/' + filename;

        console.log(req.session.filepath);

        cb(null , filename);
    }
}), hkidupload = multer({storage: diskStorage});


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));

router.use(session({secret: "k3y!ss3cr3t", resave: false, saveUninitialized: true}));


// router.get('/', (req, res)=>{
//     res.send({message: "SUCCESS"});
// });

router.post('/register', upload.array('user_files'), userController.userRegister);
router.post('/auth/enc', userController.userAuthEnc);
router.post('/auth', userController.userAuthDec);
router.post('/forgotpassword', userController.requestNewPassword);
router.post('/setnewpassword', userController.setNewPassword);
router.post('/extracthkid', upload.single('hkid_image'), userController.extracthkid);
router.post('/sendotp', userController.sendOTP);
router.post('/verifyOTP', userController.verifyOTP);
router.post('/confirmnumber', userController.sendOTP);
router.post('/encrypt', userController.userEncryption);
router.post('/compare', upload.array('images'), userController.compareUserFaceWithHKIDFace);
router.post('/requests', userController.fetchPartnerRequests);
router.post('/grantpartneraccess', userController.grantPartnerAccess);


module.exports = router;


