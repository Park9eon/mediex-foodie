const express = require('express');
const multer = require('multer');
const path = require('path');
const File = require('../models/File');
const Eatery = require('../models/Eatery');

const upload = multer({
  dest: 'public/upload',
  limit: {
    fieldNameSize: 300, // 200Byte
    fieldSize: 5e+6, // 3MB
  },
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, 'static/upload');
    },
    filename(req, file, callback) {
      File.create({
        mimetype: file.mimetype || 'image/jpeg',
        filename: file.originalname,
        extName: path.extname(file.originalname) || '.jpg',
      }, (err, $file) => {
        callback(null, $file._id.toString() + $file.extName);
      });
    },
  }),
});

const router = express.Router();

// 로그인 정보가 필요할 때 사용.
function authorization({ isAdminOnly = false } = {}) {
  return (req, res, next) => {
    const { user } = req;
    if (!user) {
      res.status(401)
        .json({ error: 'Unauthorized' });
      return;
    }
    if (isAdminOnly && !user.isAdmin) {
      res.status(401)
        .json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}

function api(server) {
  // 음식점 목록
  router.get('/', async (req, res) => {
    const { q, size } = req.query;
    try {
      const results = await Eatery.search({
        q,
        size: parseFloat(size),
      });
      res.json(results);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  // 음식점 등록
  router.post('/', authorization(), async ({ body }, res) => {
    try {
      const result = await Eatery.add(body);
      res.json(201, result);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  // 태그목록
  router.get('/tags', async (req, res) => {
    try {
      const results = await Eatery.tags();
      res.json(results);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  // 추천 태그
  router.get('/tags/recommend', async (req, res) => {
    res.json([{
      tag: '가성비',
      image: '/static/tag_1.jpg',
    }, {
      tag: '회식',
      image: '/static/tag_2.jpg',
    }, {
      tag: '점심',
      image: '/static/tag_3.jpg',
    }, {
      tag: '저녁',
      image: '/static/tag_4.jpg',
    }, {
      tag: '근사한',
      image: '/static/tag_5.jpg',
    }, {
      tag: '술',
      image: '/static/tag_6.jpg',
    }]);
  });
  // 음식점
  router.get('/:id', async (req, res) => {
    try {
      const results = await Eatery.getOne(req.params.id);
      res.json(results);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  // 음식점 수정
  router.put('/:id', authorization(), async (
    {
      params: { id },
      body: {
        name,
        description,
        address,
        lat,
        lng,
        tags,
      },
    }, res) => {
    try {
      const result = await Eatery.edit({
        id,
        name,
        description,
        address,
        lat,
        lng,
        tags,
      });
      res.json(result);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  // 음식점 리뷰 추가
  router.post('/:id/review', authorization(), async (req, res) => {
    try {
      const { rating, review } = req.body;
      const _id = req.params.id;
      const user = req.user;
      const result = await Eatery.addReview({
        _id,
        rating,
        review,
        user,
      });
      res.json(201, result);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  router.put('/:id/review/:reviewId', authorization(), async (req, res) => {
    try {
      const { rating, review } = req.body;
      const { id, reviewId } = req.params;
      const result = await Eatery.addReview({
        _id: id,
        reviewId,
        rating,
        review,
      });
      res.json(result);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });
  // 음식점 삭제
  router.delete('/:id', authorization({ isAdminOnly: true }), async (req, res) => {
    try {
      const result = Eatery.del(req.params.id);
      res.json(result);
    } catch (err) {
      res.json({ error: err.message || err.toString() });
    }
  });

  server.use('/api/eatery', router);
}

module.exports = api;
