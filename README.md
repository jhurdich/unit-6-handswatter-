# Unit 6 Handswatter

A live classroom game using Cloudflare Workers and Durable Objects. The teacher creates a room and shares the student and projector links. Each slide is one round; the teacher chooses up to eight words, starts each sign, and closes it after students answer. Correct answers receive 10 points for first, 9 for second, down to 2 for ninth, and 1 thereafter. Wrong answers earn zero. Scores carry across rounds. The public board shows only the top ten; each student receives their own rank and score.

The vocabulary follows the slide categories. The picture-based slides use text labels from the earlier Unit 6 vocabulary list; a teacher should check these against the original slides before class.

Deploy with `npx wrangler deploy`. Existing Durable Object class and binding names are retained; fresh games use a new storage key so old sessions do not affect new games.
