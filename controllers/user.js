const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {
  DATA_ERROR_CODE,
  DEFAULT_ERROR_CODE,
  MONGO_DB_CODE,
  AUTHORIZATION_ERROR_CODE,
} = require('../utils/constants');
const NotFoundError = require('../utils/errors/notFoundError');
const DataError = require('../utils/errors/dataError');
const ConflictError = require('../utils/errors/conflictError');

module.exports.getUsers = (req, res, next) => {
  console.log(req.user._id);
  User.find({})
    .then((user) => res.send({ user }))
    .catch((err) => next(err));
};

module.exports.getMe = (req, res, next) => {
  User.findOne({ _id: req.user._id }).then((user) => res.send({ user }))
    .catch((err) => next(err));
};

module.exports.getUserById = (req, res, next) => {
  User.findById(req.params.userId)
    .orFail(new Error('Not Found'))

    .then((user) => res.send({ user }))
    .catch((err) => {
      if (err.message === 'Not Found') {
        next(new NotFoundError('Пользователь не найден'));
      } else if (err.name === 'CastError') {
        next(new DataError('Некорректный ID'));
      } else {
        next(err);
      }
    });
};

// eslint-disable-next-line consistent-return
module.exports.createUser = (req, res, next) => {
  const {
    name, about, avatar, email, password,
  } = req.body;
  if (!email || !password) {
    return res.status(DATA_ERROR_CODE).send({ message: 'Поле пароля или пользователя пустое' });
  }
  bcrypt.hash(password, 10).then((hash) => User.create({
    name, about, avatar, email, password: hash,
  }))
    .then((user) => res.send({ user, message: 'Пользователь создан' }))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        next(new DataError('Ошибка валидации'));
      } else if (err.code === MONGO_DB_CODE) {
        next(new ConflictError('Такой пользователь уже зарегестрирован'));
      } else {
        next(err);
      }
    });
};

// eslint-disable-next-line consistent-return
module.exports.login = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(DATA_ERROR_CODE).send({ message: 'Поле пароля или пользователя пустое' });
  }
  User.findOne({ email }).select('+password').then((user) => bcrypt.compare(password, user.password)
    .then(
      // eslint-disable-next-line consistent-return
      (match) => {
        if (!match) {
          return res.status(AUTHORIZATION_ERROR_CODE).send({ message: 'ошибка авторизации' });
        }
        const token = jwt.sign({ _id: user._id }, 'some-secret-key', { expiresIn: '7d' });
        if (!token) {
          return res.status(DEFAULT_ERROR_CODE).send({ message: 'Ошибка с токеном' });
        }
        res.cookie('jwt', token, {
          maxAge: 3600000 * 24 * 7,
          httpOnly: true,
        }).end();
      },
    )).catch((err) => next(err));
};

module.exports.updateUserInfo = (req, res, next) => {
  const { name, about } = req.body;
  User.findByIdAndUpdate(
    req.user._id,
    { name, about },
    { new: true, runValidators: true },
  )
    .then((user) => res.send({ user, message: 'Информация изменена' }))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        next(new DataError('Ошибка валидации'));
      } else {
        next(err);
      }
    });
};

module.exports.updateUserAvatar = (req, res, next) => {
  const { avatar } = req.body;
  User.findByIdAndUpdate(
    req.user._id,
    { avatar },
    { new: true, runValidators: true },
  )
    .then((user) => res.send({ user, message: 'Аватар изменен' }))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        next(new DataError('Ошибка валидации'));
      } else {
        next(err);
      }
    });
};
