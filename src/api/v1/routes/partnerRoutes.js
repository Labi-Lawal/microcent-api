const router = require('express').Router();
const userController = require('../controllers/userController');
const bodyParser = require('body-parser');
const session = require('express-session');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));

router.use(session({secret: "k3y!ss3cr3t", resave: false, saveUninitialized: true}));

router.post('/register', userController.register);
router.post('/access', userController.requestAccess);
router.post('/accessdata', userController.accessData);

module.exports = router;


