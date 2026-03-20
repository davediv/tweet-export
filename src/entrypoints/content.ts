export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  main() {
    console.log('TweetExport content script loaded.');
  },
});
