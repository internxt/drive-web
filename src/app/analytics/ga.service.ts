function track(eventName: string, object: Record<string, any>) {
  try {
    window.gtag('event', eventName, object);
  } catch (e) {
    //
  }
}

const gaService = {
  track,
};

export default gaService;
