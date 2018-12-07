var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var form = require('form');

dust.loadSource(dust.compile(require('./template'), 'accounts-reset'));

var validate = function (email, password, done) {
    if (!password) {
        return done(null, 'Please enter your new password');
    }
    if (password.length < 6) {
        return done(null, 'Password should at least be 6 characters');
    }
    var pass = password.toLowerCase();
    if (pass === email.toLowerCase()) {
        return done(null, 'Password should not be equivalent to your email');
    }
    if (!/[0-9]/.test(password)) {
        return done(null, 'Password should contain at least one number');
    }
    if (!/[a-z]/.test(password)) {
        return done(null, 'Password should contain at one lower case letter');
    }
    if (!/[A-Z]/.test(password)) {
        return done(null, 'Password should contain at one upper case letter');
    }
    done();
};

var configs = {
    password: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            validate(context.email, value, function (err, error) {
                if (err) {
                    return done(err);
                }
                if (error) {
                    return done(null, error);
                }
                done(null, null, value);
            });
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        },
        render: function (ctx, form, data, value, done) {
            done(null, {email: ctx.email});
        }
    }
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    dust.render('accounts-reset', {id: container.id}, function (err, out) {
        if (err) {
            return done(err);
        }
        var elem = sandbox.append(out);
        var lform = form.create(elem, configs);
        lform.render({
            email: options.email
        }, {}, function (err) {
            if (err) {
                return done(err);
            }
            var reset = $('.reset', elem);
            sandbox.on('click', '.reset', function (e) {
                lform.find(function (err, data) {
                    if (err) {
                        return console.error(err);
                    }
                    lform.validate(data, function (err, errors, data) {
                        if (err) {
                            return console.error(err);
                        }
                        if (errors) {
                            lform.update(errors, data, function (err) {
                                if (err) {
                                    return console.error(err);
                                }
                                reset.removeAttr('disabled');
                            });
                            return;
                        }
                        lform.update(errors, data, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            lform.create(data, function (err, errors, data) {
                                if (err) {
                                    return console.error(err);
                                }
                                if (errors) {
                                    lform.update(errors, data, function (err) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                        reset.removeAttr('disabled');
                                    });
                                    return;
                                }
                                update(options.user, options.otp, data.password, function (err) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    serand.direct('/recovered?email=' + data.email);
                                });
                            });
                        });
                    });
                });
                return false;
            });
            done(null, {
                clean: function () {

                },
                ready: function () {

                }
            });
        });
    });
};

var update = function (user, otp, password, done) {
    $.ajax({
        method: 'PUT',
        url: utils.resolve('accounts:///apis/v/users/' + user),
        data: JSON.stringify({
            password: password
        }),
        headers: {
            'X-OTP': otp,
            'X-Action': 'reset'
        },
        contentType: 'application/json',
        dataType: 'json',
        success: function () {
            done();
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

