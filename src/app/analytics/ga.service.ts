export const GA_SEND_TO_KEY = process.env.REACT_APP_GOOGLE_ANALYTICS_SENDTO;

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
