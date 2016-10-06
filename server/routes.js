const AuthController = require('./controllers/AuthController'),
  UserController = require('./controllers/UserController'),
  express = require('express'),
  passport = require('passport'),
  passportService = require(__dirname+'/config/passport');

// Middleware to require login/auth
const requireAuth = passport.authenticate('jwt', { session: false });  
const requireLogin = passport.authenticate('local', { session: false });

// Initializing route groups
const router = express.Router(),
    authRoutes = express.Router(),
    userRoutes = express.Router();

// Auth Routes
authRoutes.post('/register', AuthController.register);
authRoutes.post('/login', requireLogin, AuthController.login);
router.use('/auth', authRoutes);

// User Routes
userRoutes.get('/', requireAuth, UserController.getUsers);
userRoutes.get('/:user_id', requireAuth, UserController.getUser);
router.use('/users', userRoutes);

module.exports = router;