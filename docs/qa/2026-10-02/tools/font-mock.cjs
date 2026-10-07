// QA-only Next font response. No Google request; screenshots use local Arial.
module.exports = new Proxy({}, {
  get: () => '@font-face { font-family: Inter; src: local("Arial"); font-style: normal; font-weight: 100 900; }',
});
