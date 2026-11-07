# Contributing

Please discuss larger changes before implementation. Keep the model capability
list authoritative: never submit an effort a model did not advertise.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run check:public
npm run pack:release
```

When editing artwork, change the matching 1024px RGBA master and keep the same
canvas, character scale and baseline. Rebuild to update embedded images and
hashes. Add a clear provenance entry for any replacement art. Do not remove the
upstream license or imply the project is official.

UI changes should include an isolated-fixture screenshot and a regression test.
Do not attach real chats, profile configuration, tokens or private debug samples.
Keep host request behavior unchanged unless the change is explicitly in scope.

There are no installation lifecycle scripts or automatic publishing workflows.
Publishing decisions and repository contact information belong to the maintainer.
