const passport = require('passport');
const Strategy = require('passport-google-oauth').OAuth2Strategy;
const User = require('./models/User');


function auth({ ROOT_URL, server }) {
  const verify = async (accessToken, refreshToken, profile, verified) => {
    let email;
    let avatarUrl;

    if (profile.emails) {
      email = profile.emails[0].value;
    }

    if (profile.photos && profile.photos.length > 0) {
      avatarUrl = profile.photos[0].value.replace('sz=50', 'sz=128');
    }

    try {
      const user = await User.signInOrSignUp({
        googleId: profile.id,
        email,
        googleToken: {
          accessToken,
          refreshToken,
        },
        displayName: profile.displayName,
        avatarUrl,
      });
      verified(null, user);
    } catch (err) {
      verified(err);
      console.log(err); // eslint-disable-line
    }
  };
  passport.use(new Strategy(
    {
      clientID: process.env.Google_clientID,
      clientSecret: process.env.Google_clientSecret,
      callbackURL: `${ROOT_URL}/oauth2callback`,
    },
    verify,
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id, User.publicFields(), (err, user) => {
      done(err, user);
    });
  });

  server.use(passport.initialize());
  server.use(passport.session());

  server.get('/login', (req, res, next) => {
    const options = {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      hostedDomain: 'mediex.co.kr',
    };

    if (req.query && req.query.next && req.query.next.startsWith('/')) {
      req.session.next_url = req.query.next;
    } else {
      req.session.next_url = null;
    }

    passport.authenticate('google', options)(req, res, next);
  });

  server.get(
    '/oauth2callback',
    passport.authenticate('google', {
      failureRedirect: '/login',
    }),
    (req, res) => {
      if (req.session.next_url) {
        res.redirect(req.session.next_url);
      } else {
        res.redirect('/');
      }
    },
  );

  server.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
  });
}

module.exports = auth;
