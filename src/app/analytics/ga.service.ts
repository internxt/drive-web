function track(eventName: string, object: Record<string, any>) {
  try {
    window.gtag('event', eventName, object);
  } catch {
    //
  }
}

const gaService = {
  track,
};

export default gaService;
