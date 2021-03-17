const client = require('../lib/client');
// import our seed data:
const responses = require('./responses.js');
const usersData = require('./users.js');
const { getEmoji } = require('../lib/emoji.js');

run();

async function run() {

  try {
    await client.connect();

    const users = await Promise.all(
      usersData.map(user => {
        return client.query(`
                      INSERT INTO users (username, hash)
                      VALUES ($1, $2)
                      RETURNING *;
                  `,
        [user.username, user.hash]);
      })
    );
      
    const user = users[0].rows[0];

    await Promise.all(
      responses.map(response => {
        const { prompt, options } = response;
        return client.query(`
                    INSERT INTO responses (prompt, options, owner_id)
                    VALUES ($1, $2, $3);
                `,
        [prompt, options, user.id]);
      })
    );
    

    console.log('seed data load complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    console.log(err);
  }
  finally {
    client.end();
  }
    
}
