require('dotenv').config();

const express            = require("express"),
      app                = express(),
      mysql              = require("mysql"),
      bodyParser         = require("body-parser"),
      session            = require("express-session"),
      passport           = require("passport"),
      LocalStrategy      = require("passport-local"),
      bcrypt             = require('bcrypt-nodejs'),
      flash              = require("connect-flash"),
      bookingmail        = require('./utils/emails'),
      cancellingmail     = require('./utils/canceling'),
      connection         = require('./config/database'),
      request            = require("request"),
      methoOverride      = require("method-override");


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname +"/public"));
app.use(methoOverride("_method"));
app.use(flash());

const Port = process.env.APP_PORT || 3000;


//Passport config
app.use(session({
    secret:"jaidev",
    resave : false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

passport.serializeUser((user, done) =>done(null, user.id));
passport.deserializeUser(function(id, done){
    connection.query("SELECT * FROM users WHERE id = ?", [id],
    function(err, rows){
        done(err, rows[0]);
    });
});

//passport sign-up
passport.use(
    'local-signup',
    new LocalStrategy({
        usernameField :'username',
        passwordField:'password',
        passReqToCallback :true
    },
    function(req, username, password, done){
        connection.query("SELECT * FROM users WHERE username = ?", [username], function(err, rows){
            if(err)
                return done(err);
            if(rows.length){
                return done(null, false, req.flash('error','That is already taken'));
            }else{
                var newUserMysql = {
                    username :username,
                    password : bcrypt.hashSync(password, null, null)
                };

                var insertQuery = "INSERT INTO users (username, password) VALUES (?,?)";

                connection.query(insertQuery, [newUserMysql.username, newUserMysql.password],
                    function(err, rows){
                        newUserMysql.id = rows.insertId;

                        return done(null, newUserMysql, req.flash('success', 'Successfully Registered'));
                    });
            }
        });
    })
);


//passport login

passport.use(
    'local-login',
    new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true
    },
    function(req,username, password, done){
        connection.query("SELECT * FROM users WHERE username = ?", [username],
        function(err, rows){
            if(err)
                return done(err);
            if(!rows.length){
                return done(null, false,req.flash('error', 'No User Found'));
            }
            if(!bcrypt.compareSync(password, rows[0].password))
                return done(null, false, req.flash('error','Wrong Password'));
            
            return done(null, rows[0], req.flash('success', 'Login Successful'));
        });
    })
);

connection.query("USE hospital1");


//=========== Routes ====================
//login 
app.get("/", function(req, res){
    res.render("login");
});

app.post("/", passport.authenticate("local-login",{
        successRedirect : "/home",
        failureRedirect : "/",
        failureFlash: true
    }),function(req, res){

});

//register
app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", passport.authenticate('local-signup',{
        successRedirect : "/",
        failureRedirect :"/register",
        failureFlash: true
    }), function(req, res){

});


//logout
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})


//============
//home page
app.get("/home", isloggedin, function(req, res){
        res.render("index");
});


//consultant page
app.get("/home/consultant", isloggedin,function(req, res){
    var q = 'SELECT * FROM doctor GROUP BY name';
    connection.query(q, function(err, results){
        if(err) throw err;
        res.render("consultant", {doctor:results});
    })
    
})


//report route
app.get("/home/add/:id", isloggedin, function(req, res){
    var q = 'SELECT id AS id FROM users';
    connection.query(q , function(err, results){
        req.params.id = results[0].id;
        var p = 'SELECT * FROM doctor GROUP BY name';
        connection.query(p, function(err, results){
            res.render("add", {doctors: results});
        })
    })
    
});

app.post("/home/add/:id", isloggedin,  function(req, res){
    var doc_id = 'SELECT doctor_id FROM doctor WHERE name = "' + req.body.doctor + '" LIMIT 1;';
    connection.query(doc_id, function(error, results){
        if(error) throw error;
        var patient = {doctor: req.body.doctor, email : req.body.email, created_at : req.body.date,
            description: req.body.description, user_id : req.user.id, doctor_id: results[0].doctor_id};
        var email = req.body.email;
        var date = req.body.date;
        connection.query('INSERT INTO patient SET ?', patient, function(err, results){
            // bookingmail(email, date);
            res.redirect("/home");
                });
    })
});

//delete report route
app.delete('/home/view/:id', isloggedin, function(req, res){
    // var q = 'SELECT email AS email FROM patient WHERE user_id = ' + req.params.id;
    // connection.query(q, function(err, results){
    //     // var mail = results[0].email;
    //     // cancellingmail(mail);
        var q1 = 'DELETE FROM patient WHERE id = ' + req.params.id;
        connection.query(q1, function(err, results){
            if(err) throw err;
            res.redirect("/home");
        })
    });
// });

app.get("/home/view/:id", isloggedin, function(req, res){
    var q = 'SELECT * FROM users JOIN patient ON patient.user_id = users.id WHERE patient.user_id = '+ req.params.id;
    connection.query(q, function(err, results){
        if(err) throw err;
        res.render("view", {patient:results});
    })
    
});


//Profile Page
app.get('/home/profile/:id', isloggedin, function(req, res){
        var q = 'SELECT * FROM users WHERE id = ' + req.params.id;
        connection.query(q, function(error, results){
            if(error) throw error;
            res.render('profile', {user:results});
        })
});


app.put('/home/profile/:id', isloggedin, function(req, res){
    connection.query('UPDATE users SET firstname = ?, lastname = ?, address = ?, contact = ? WHERE id = ?', [req.body.firstname, req.body.lastname, req.body.address, req.body.contact, req.params.id], function(error, results){
        if(error) throw error;
        res.redirect('/home');
    })
})

//COVID-19
app.get("/home/covid", isloggedin, function(req, res){
    request('https://api.covid19india.org/data.json', function(error, response, body){
        if(!error && response.statusCode == 200){
            var data = JSON.parse(body);
            res.render("covid", {data:data});
        }
    })
});


//middleware
function isloggedin(req, res, next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.redirect("/");
    }
}



app.listen(Port, function(){
    console.log(`Server's up and running on ${Port}`);
})