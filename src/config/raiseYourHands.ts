/**
 * Raise Your Hands — links and media in one place, so they can be swapped without
 * touching the page. Empty values are pending content from the user: in production
 * the element is simply not shown; in development a dashed placeholder marks the spot.
 */
export const RYH = {
  /** Episode 1 of the expedition + the playlist (youtube-nocookie facade) */
  episode1VideoId: "yfP5Hc2pVU8",
  playlistId: "PLQbIGtMF-qUqyVCITHBpSVUpeE97DDxMI",
  playlistUrl: "https://www.youtube.com/watch?v=yfP5Hc2pVU8&list=PLQbIGtMF-qUqyVCITHBpSVUpeE97DDxMI",
  channelUrl: "https://www.youtube.com/@edgarzanin",
  subscribeUrl: "https://www.youtube.com/@edgarzanin?sub_confirmation=1",
  /** [LINK] pending from the user */
  instagramUrl: "",
  /** [LINK] pending from the user: GPX route on Komoot */
  komootUrl: "",
  /** [FOTO] pending from the user: stop / food delivery (no identifiable faces without consent) */
  purposePhoto: { src: "", alt: "" },
  /** Public address of the page (share button, canonical) */
  publicUrl: "https://raiseyourhands.edgarzanin.com/",
} as const;

/** Pending placeholders are visible only while developing */
export const showPlaceholders = import.meta.env.DEV;
