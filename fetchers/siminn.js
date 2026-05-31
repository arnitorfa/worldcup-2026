// Síminn Sport schedule fetcher.
//
// Sýn hf. (parent company of both Sýn and Síminn) exposes a public EPG API
// at syn.is/api/epg/ that covers all Sýn Sport channels. Síminn Sport customers
// access exactly the same channel lineup through a different front-end.
//
// Rather than duplicating events, this fetcher is intentionally left empty.
// All Sýn Sport / Síminn Sport events are fetched by syn.js (station: 'synsport').
//
// If you want to show Síminn as a separate station in the UI, uncomment the code
// below — but be aware events will appear twice.

export async function fetchSiminnSchedule(date, fetch) {
  // Síminn Sport = same content as Sýn Sport (handled by syn.js).
  console.log('Síminn Sport: using Sýn Sport EPG (same channels) — skipping duplicate fetch');
  return [];
}
