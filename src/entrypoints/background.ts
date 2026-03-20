export default defineBackground({
  main() {
    console.log('TweetExport background service worker started.', {
      id: browser.runtime.id,
    });
  },
});
