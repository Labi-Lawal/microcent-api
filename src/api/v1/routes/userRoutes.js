const router = require('express').Router();
const userController = require('../controllers/userController');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');


// var hkidPhotoName;
const storage = multer.diskStorage({
}), upload = multer({storage: storage});


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));

router.use(session({secret: "k3y!ss3cr3t", resave: false, saveUninitialized: true}));


// router.get('/', (req, res)=>{
//     res.send({message: "SUCCESS"});
// });

router.post('/register', upload.array('user_files'), userController.userRegister);
router.post('/auth/signin', userController.userAuth);

module.exports = router;


