# Project evidence workflow

Project pages may be published only after the owner approves the facts and the client or rights holder approves every displayed image and testimonial.

For each candidate project, collect:

- A public-safe project title and general location
- Project type, initial problem, and agreed drafting scope
- Deliverables actually supplied
- A concise description of the drafting approach
- A factual result that does not imply permit approval or construction performance
- The measurement period or project dates when reporting operational outcomes
- Redacted drawings and photographs with descriptive alternative text
- Written media permission
- Written testimonial permission and exact attribution, when applicable
- The final review date

Remove client names, precise addresses, permit numbers, signatures, contact details, and other sensitive information unless explicit publication permission covers them.

Add approved records to `src/project-pages/project-page.data.mjs`. The build rejects enabled records that lack editorial approval, media permission, required facts, deliverables, approved images, or a valid review date. The public project library remains `noindex` until at least three approved profiles are available.
