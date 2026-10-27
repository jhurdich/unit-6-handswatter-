# Unit 6 Handswatter — Swat It! Live

A live classroom game built from the Unit 6 vocabulary and the Handswatter classroom rules. The teacher signs a target word, and each student independently chooses a matching tile. The first correct swat earns one point for that student. Rooms use shuffled boards of up to six words.

## Individual scores and private ranks

Every student joins by name and builds an individual score. The main leaderboard contains only the top 10 students. Each student connection also receives only that student's own score and current rank, plus the public top 10. Names and scores below the top 10 are not sent to other students or the projector.

## Join through Cloudflare

This project uses a Cloudflare Worker for the website and a Cloudflare Durable Object WebSocket room for live game state and scores. After the Worker is deployed, students visit its Cloudflare URL and enter the room code created by the teacher. They join individually by entering their own name.

## Deploy to Cloudflare Workers

From this folder, use Wrangler:

```sh
npx wrangler login
npx wrangler deploy
```

Cloudflare returns a `workers.dev` address. The teacher opens it and chooses **Create teacher room**, then shares the student link. The teacher can also open a projector link. The teacher's browser stores a private room control token so reconnects work without giving students teacher controls.

## Rules represented in the game

- The teacher signs a word shown only in the teacher view.
- Students choose from tiles containing up to six shuffled Unit 6 vocabulary words.
- The first correct swat earns one individual point.
- Continue through the shuffled boards; individual scores persist in the room.

The vocabulary includes the Unit 6 deck sections Opinions, Skills, and Bravery together with the supplied category words. Each category is split into shuffled sets of no more than six words.
