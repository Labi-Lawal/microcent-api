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

router.post('/register', upload.array('hkidphoto'), userController.userRegister);
router.post('/auth/signin', userController.userAuth);
router.get('/', (req, res)=>{
    res.send(`
        <div>
            <img src="https://res.cloudinary.com/labilawal/image/upload/v1623483816/r6re8vsjtrgrntisvvap.jpg" width="50">
        </div>
    `);
});

module.exports = router;


