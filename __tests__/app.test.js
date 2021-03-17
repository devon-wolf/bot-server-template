require('dotenv').config();

const { execSync } = require('child_process');

const fakeRequest = require('supertest');
const app = require('../lib/app');
const client = require('../lib/client');

describe('app routes', () => {
  describe('routes', () => {
    let token;
  
    beforeAll(async done => {
      execSync('npm run setup-db');
  
      client.connect();
  
      const signInData = await fakeRequest(app)
        .post('/auth/signup')
        .send({
          username: 'jon@user.com',
          password: '1234'
        });
      
      token = signInData.body.token; // eslint-disable-line
  
      return done();
    });
  
    afterAll(done => {
      return client.end(done);
    });

    // test route looking at unprotected seed data
    test('returns responses', async() => {

      const expectation = [
        {
          id: 1,
          prompt:	'banana',
          images: [
            'https://cdn.discordapp.com/attachments/808589409074937861/808955633255972894/image0.jpg',
          ],
          owner_id: 1
        }
      ];

      const data = await fakeRequest(app)
        .get('/responses')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(data.body).toEqual(expectation);
    });

    test('returns a single response by id', async() => {

      const expectation = {
        id: 1,
        prompt:	'banana',
        images: [
          'https://cdn.discordapp.com/attachments/808589409074937861/808955633255972894/image0.jpg',
        ],
        owner_id: 1
      };

      const data = await fakeRequest(app)
        .get('/responses/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(data.body).toEqual(expectation);
    });

    test('creates a new response as the test user', async() => {
      const newResponse = {
        prompt: 'test',
        images: ['some URL', 'some other URL']
      };

      const expectation = {
        ...newResponse,
        id: 2,
        owner_id: 2
      };

      const data = await fakeRequest(app)
        .post('/api/responses')
        .set({ Authorization: token })
        .send(newResponse)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(data.body).toEqual(expectation);
    });

    test('edits a response as the test user', async() => {
      const editedResponse = {
        prompt: 'testy',
        images: ['some URL', 'some other URL', 'a third URL']
      };

      const expectation = {
        ...editedResponse,
        id: 2,
        owner_id: 2
      };

      const data = await fakeRequest(app)
        .put('/api/responses/2')
        .set({ Authorization: token })
        .send(editedResponse)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(data.body).toEqual(expectation);
    });

    test('deletes a response as the test user', async() => {
    
      const expectation = {
        id: 2,
        prompt: 'testy',
        images: ['some URL', 'some other URL', 'a third URL'],
        owner_id: 2
      };

      const data = await fakeRequest(app)
        .delete('/api/responses/2')
        .set({ Authorization: token })
        .expect('Content-Type', /json/)
        .expect(200);

      const fetch = await fakeRequest(app)
        .get('/responses/2');

      expect(data.body).toEqual(expectation);
      expect(fetch.body).toEqual('');
    });

  });
});
